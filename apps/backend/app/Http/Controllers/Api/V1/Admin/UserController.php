<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreAdminUserRequest;
use App\Http\Requests\UpdateAdminUserRequest;
use App\Http\Resources\AdminActivityResource;
use App\Http\Resources\AdminUserResource;
use App\Http\Resources\DailyReportResource;
use App\Http\Responses\ApiResponse;
use App\Mail\AdminInvitationMail;
use App\Models\User;
use App\Support\Csv;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Str;
use Symfony\Component\HttpFoundation\StreamedResponse;

class UserController extends Controller
{
    /**
     * List members with server-side search, filters and pagination.
     */
    public function index(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'q' => ['sometimes', 'nullable', 'string', 'max:255'],
            'role' => ['sometimes', 'nullable', 'in:admin,user'],
            'status' => ['sometimes', 'nullable', 'in:active,pending,inactive,suspended'],
            'group_id' => ['sometimes', 'nullable', 'integer', 'exists:groups,id'],
            'per_page' => ['sometimes', 'integer', 'between:1,100'],
        ]);

        $query = $this->filteredQuery($validated);
        $paginator = $query->paginate((int) ($validated['per_page'] ?? 10));

        return ApiResponse::success([
            'items' => AdminUserResource::collection($paginator->items()),
            'stats' => $this->stats(),
        ], 'Users retrieved.', 200, [
            'current_page' => $paginator->currentPage(),
            'per_page' => $paginator->perPage(),
            'total' => $paginator->total(),
            'last_page' => $paginator->lastPage(),
        ]);
    }

    /**
     * Create a member and email a one-time invitation code.
     */
    public function store(StoreAdminUserRequest $request): JsonResponse
    {
        $validated = $request->validated();
        $status = $validated['status'];
        $sendInvitation = $request->boolean('send_invitation', true);
        $inviter = $request->user();

        $user = DB::transaction(function () use ($validated, $status, $sendInvitation, $inviter): User {
            $user = User::query()->create([
                'name' => $validated['name'],
                'email' => $validated['email'],
                'password' => Hash::make(Str::random(40)),
                'role' => $validated['role'],
                'is_active' => $status === 'active',
                'invited_at' => $sendInvitation ? now() : null,
                'invitation_accepted_at' => $status === 'pending' ? null : now(),
            ]);

            if (! empty($validated['group_id'])) {
                $user->groups()->syncWithoutDetaching([
                    $validated['group_id'] => [
                        'assigned_by' => $inviter?->id,
                        'assigned_at' => now(),
                    ],
                ]);
            }

            return $user;
        });

        $invitationSent = false;

        if ($sendInvitation) {
            $invitationSent = $this->sendInvitation($user, $inviter?->name);
        }

        $user->load('groups')->loadCount(['activities', 'dailyReports']);

        return ApiResponse::success([
            'user' => new AdminUserResource($user),
            'invitation_sent' => $invitationSent,
        ], $invitationSent
            ? 'User created and invitation email sent.'
            : 'User created. The invitation email could not be delivered; check mail configuration.', 201);
    }

    /**
     * Show a member with recent activity and report history.
     */
    public function show(User $user): JsonResponse
    {
        $user->load('groups')->loadCount(['activities', 'dailyReports']);
        $user->setAttribute('average_score', (float) ($user->dailyReports()->avg('calculated_score') ?? 0));

        $reports = $user->dailyReports()
            ->latest('report_date')
            ->withCount('comments')
            ->limit(25)
            ->get();

        $activities = $user->activities()
            ->latest('scheduled_date')
            ->limit(25)
            ->get();

        return ApiResponse::success([
            'user' => new AdminUserResource($user),
            'reports' => DailyReportResource::collection($reports),
            'activities' => AdminActivityResource::collection($activities),
        ], 'User retrieved.');
    }

    /**
     * Update a member's profile, role, status or group membership.
     */
    public function update(UpdateAdminUserRequest $request, User $user): JsonResponse
    {
        $validated = $request->validated();

        DB::transaction(function () use ($validated, $user): void {
            if (array_key_exists('name', $validated)) {
                $user->name = $validated['name'];
            }

            if (array_key_exists('email', $validated)) {
                $user->email = $validated['email'];
            }

            if (array_key_exists('role', $validated)) {
                $user->role = $validated['role'];
            }

            if (array_key_exists('status', $validated)) {
                $user->is_active = $validated['status'] === 'active';

                if ($validated['status'] !== 'pending') {
                    $user->invitation_accepted_at ??= now();
                }
            }

            $user->save();

            if (array_key_exists('group_id', $validated)) {
                if ($validated['group_id'] === null) {
                    $user->groups()->detach();
                } else {
                    $user->groups()->sync([
                        $validated['group_id'] => [
                            'assigned_by' => request()->user()?->id,
                            'assigned_at' => now(),
                        ],
                    ]);
                }
            }
        });

        $user->refresh()->load('groups')->loadCount(['activities', 'dailyReports']);
        $user->setAttribute('average_score', (float) ($user->dailyReports()->avg('calculated_score') ?? 0));

        return ApiResponse::success([
            'user' => new AdminUserResource($user),
        ], 'User updated.');
    }

    /**
     * Activate or deactivate a member account.
     */
    public function toggleStatus(Request $request, User $user): JsonResponse
    {
        if ($request->user()?->id === $user->id) {
            return ApiResponse::error('You cannot change the status of your own account.', 422);
        }

        $user->forceFill(['is_active' => ! $user->is_active])->save();
        $user->load('groups')->loadCount(['activities', 'dailyReports']);
        $user->setAttribute('average_score', (float) ($user->dailyReports()->avg('calculated_score') ?? 0));

        return ApiResponse::success([
            'user' => new AdminUserResource($user),
        ], $user->is_active ? 'User activated.' : 'User deactivated.');
    }

    /**
     * Suspend or reinstate a member account.
     *
     * Suspension is independent from activation: the account keeps its
     * existing is_active state, but is denied access while suspended.
     */
    public function toggleSuspension(Request $request, User $user): JsonResponse
    {
        if ($request->user()?->id === $user->id) {
            return ApiResponse::error('You cannot suspend your own account.', 422);
        }

        if ($user->suspended_at === null) {
            $user->forceFill(['suspended_at' => now()])->save();
            $user->tokens()->delete();
        } else {
            $user->forceFill(['suspended_at' => null])->save();
        }

        $user->refresh()->load('groups')->loadCount(['activities', 'dailyReports']);
        $user->setAttribute('average_score', (float) ($user->dailyReports()->avg('calculated_score') ?? 0));

        return ApiResponse::success([
            'user' => new AdminUserResource($user),
        ], $user->suspended_at !== null ? 'User suspended.' : 'User suspension lifted.');
    }

    /**
     * Stream the filtered member list as a CSV download.
     */
    public function export(Request $request): StreamedResponse
    {
        $validated = $request->validate([
            'q' => ['sometimes', 'nullable', 'string', 'max:255'],
            'role' => ['sometimes', 'nullable', 'in:admin,user'],
            'status' => ['sometimes', 'nullable', 'in:active,pending,inactive,suspended'],
            'group_id' => ['sometimes', 'nullable', 'integer', 'exists:groups,id'],
        ]);

        $query = $this->filteredQuery($validated);

        $rows = function () use ($query): \Generator {
            foreach ($query->lazy(500) as $user) {
                yield [
                    $user->id,
                    $user->name,
                    $user->email,
                    $user->role?->value,
                    $user->is_active ? 'active' : 'inactive',
                    $user->groups->first()?->name ?? '',
                    $user->activities_count ?? '',
                    $user->daily_reports_count ?? '',
                    $user->created_at?->toDateString(),
                ];
            }
        };

        return Csv::download('users-'.now()->format('Y-m-d').'.csv', [
            'ID', 'Name', 'Email', 'Role', 'Status', 'Group', 'Activities', 'Reports', 'Joined',
        ], $rows());
    }

    /**
     * @param  array<string, mixed>  $filters
     * @return Builder<User>
     */
    private function filteredQuery(array $filters): Builder
    {
        return User::query()
            ->with('groups')
            ->withCount(['activities', 'dailyReports'])
            ->withAvg('dailyReports as average_score', 'calculated_score')
            ->when($filters['q'] ?? null, function (Builder $query, string $search): void {
                $like = '%'.str_replace(['%', '_'], ['\%', '\_'], trim($search)).'%';

                $query->where(function (Builder $query) use ($like): void {
                    $query->where('name', 'like', $like)
                        ->orWhere('email', 'like', $like)
                        ->orWhereHas('groups', fn (Builder $groups) => $groups->where('name', 'like', $like));
                });
            })
            ->when($filters['role'] ?? null, fn (Builder $query, string $role) => $query->where('role', $role))
            ->when($filters['status'] ?? null, function (Builder $query, string $status): void {
                match ($status) {
                    'active' => $query->where('is_active', true)->whereNull('suspended_at'),
                    'suspended' => $query->whereNotNull('suspended_at'),
                    'inactive' => $query->where('is_active', false)->whereNull('suspended_at')->where(function (Builder $query): void {
                        $query->whereNull('invited_at')->orWhereNotNull('invitation_accepted_at');
                    }),
                    'pending' => $query->whereNotNull('invited_at')->whereNull('invitation_accepted_at'),
                };
            })
            ->when($filters['group_id'] ?? null, fn (Builder $query, int|string $groupId) => $query->whereHas(
                'groups',
                fn (Builder $groups) => $groups->whereKey($groupId),
            ))
            ->latest();
    }

    /**
     * @return array<string, int>
     */
    private function stats(): array
    {
        return [
            'total' => User::query()->count(),
            'active' => User::query()->where('is_active', true)->count(),
            'pending' => User::query()
                ->whereNotNull('invited_at')
                ->whereNull('invitation_accepted_at')
                ->count(),
            'admins' => User::query()->where('role', 'admin')->count(),
        ];
    }

    /**
     * Store a hashed one-time code and email the invitation.
     */
    private function sendInvitation(User $user, ?string $invitedBy): bool
    {
        $code = str_pad((string) random_int(0, 999999), 6, '0', STR_PAD_LEFT);
        $table = (string) config('auth.passwords.users.table', 'password_reset_tokens');

        DB::table($table)->updateOrInsert(
            ['email' => $user->email],
            ['token' => Hash::make($code), 'created_at' => now()],
        );

        try {
            Mail::to($user->email)->send(new AdminInvitationMail($user, $code, $invitedBy));

            return true;
        } catch (\Throwable $exception) {
            report($exception);

            return false;
        }
    }
}
