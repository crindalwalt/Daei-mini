<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreAdminGroupRequest;
use App\Http\Requests\UpdateAdminGroupRequest;
use App\Http\Resources\AdminGroupResource;
use App\Http\Responses\ApiResponse;
use App\Models\Group;
use App\Support\Csv;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Symfony\Component\HttpFoundation\StreamedResponse;

class GroupController extends Controller
{
    /**
     * List groups with server-side search and computed progress metrics.
     */
    public function index(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'q' => ['sometimes', 'nullable', 'string', 'max:255'],
            'per_page' => ['sometimes', 'integer', 'between:1,100'],
        ]);

        $query = $this->filteredQuery($validated);
        $paginator = $query->paginate((int) ($validated['per_page'] ?? 9));
        $groups = collect($paginator->items());
        $this->applyMetrics($groups);

        return ApiResponse::success([
            'items' => AdminGroupResource::collection($groups),
            'stats' => $this->stats($groups),
        ], 'Groups retrieved.', 200, [
            'current_page' => $paginator->currentPage(),
            'per_page' => $paginator->perPage(),
            'total' => $paginator->total(),
            'last_page' => $paginator->lastPage(),
        ]);
    }

    /**
     * Create a group and optionally assign its first members.
     */
    public function store(StoreAdminGroupRequest $request): JsonResponse
    {
        $validated = $request->validated();

        $group = Group::query()->create([
            'name' => $validated['name'],
            'description' => $validated['description'] ?? null,
            'leader_name' => $validated['leader'] ?? null,
            'color' => $validated['color'] ?? $this->nextColor(),
            'created_by' => $request->user()?->id,
            'client_created_at' => now(),
            'client_updated_at' => now(),
        ]);

        $this->syncMembers($group, $validated['member_ids'] ?? [], $request->user()?->id);
        $this->loadForResponse($group);

        return ApiResponse::success([
            'group' => new AdminGroupResource($group),
        ], 'Group created.', 201);
    }

    /**
     * Show a single group with its members.
     */
    public function show(Group $group): JsonResponse
    {
        $this->loadForResponse($group);

        return ApiResponse::success([
            'group' => new AdminGroupResource($group),
        ], 'Group retrieved.');
    }

    /**
     * Update a group and its member assignments.
     */
    public function update(UpdateAdminGroupRequest $request, Group $group): JsonResponse
    {
        $validated = $request->validated();

        $group->fill([
            'name' => $validated['name'] ?? $group->name,
            'description' => array_key_exists('description', $validated) ? $validated['description'] : $group->description,
            'leader_name' => array_key_exists('leader', $validated) ? $validated['leader'] : $group->leader_name,
            'color' => array_key_exists('color', $validated) ? $validated['color'] : $group->color,
            'client_updated_at' => now(),
        ])->save();

        if (array_key_exists('member_ids', $validated)) {
            $this->syncMembers($group, $validated['member_ids'], $request->user()?->id);
        }

        $this->loadForResponse($group);

        return ApiResponse::success([
            'group' => new AdminGroupResource($group),
        ], 'Group updated.');
    }

    /**
     * Stream the filtered group list as a CSV download.
     */
    public function export(Request $request): StreamedResponse
    {
        $validated = $request->validate([
            'q' => ['sometimes', 'nullable', 'string', 'max:255'],
        ]);

        $groups = $this->filteredQuery($validated)->get();
        $this->applyMetrics($groups);

        $rows = $groups->map(fn (Group $group) => [
            $group->id,
            $group->name,
            $group->leader_name ?? '',
            $group->description ?? '',
            (int) ($group->users_count ?? 0),
            (int) ($group->activities_count ?? 0),
            (int) round((float) ($group->average_score ?? 0)).'%',
            $group->created_at?->toDateString(),
        ]);

        return Csv::download('groups-'.now()->format('Y-m-d').'.csv', [
            'ID', 'Name', 'Leader', 'Description', 'Members', 'Activities', 'Completion', 'Created',
        ], $rows);
    }

    /**
     * @param  array<string, mixed>  $filters
     * @return Builder<Group>
     */
    private function filteredQuery(array $filters): Builder
    {
        return Group::query()
            ->withCount('users')
            ->when($filters['q'] ?? null, function (Builder $query, string $search): void {
                $like = '%'.str_replace(['%', '_'], ['\%', '\_'], trim($search)).'%';

                $query->where(function (Builder $query) use ($like): void {
                    $query->where('name', 'like', $like)
                        ->orWhere('description', 'like', $like)
                        ->orWhere('leader_name', 'like', $like);
                });
            })
            ->latest();
    }

    /**
     * Attach aggregate member progress and activity counts to each group.
     *
     * @param  Collection<int, Group>  $groups
     */
    private function applyMetrics(Collection $groups): void
    {
        $ids = $groups->pluck('id')->all();

        if ($ids === []) {
            return;
        }

        $progress = DB::table('group_user')
            ->join('daily_reports', 'daily_reports.user_id', '=', 'group_user.user_id')
            ->whereIn('group_user.group_id', $ids)
            ->whereNull('daily_reports.deleted_at')
            ->where('daily_reports.report_date', '>=', now()->subDays(30)->toDateString())
            ->selectRaw('group_user.group_id, avg(daily_reports.calculated_score) as average_score')
            ->groupBy('group_user.group_id')
            ->pluck('average_score', 'group_id');

        $activities = DB::table('group_user')
            ->join('activities', 'activities.user_id', '=', 'group_user.user_id')
            ->whereIn('group_user.group_id', $ids)
            ->whereNull('activities.deleted_at')
            ->selectRaw('group_user.group_id, count(*) as activities_count')
            ->groupBy('group_user.group_id')
            ->pluck('activities_count', 'group_id');

        foreach ($groups as $group) {
            $group->setAttribute('average_score', (float) ($progress[$group->id] ?? 0));
            $group->setAttribute('activities_count', (int) ($activities[$group->id] ?? 0));
        }
    }

    /**
     * @param  Collection<int, Group>  $groups
     * @return array<string, int>
     */
    private function stats(Collection $groups): array
    {
        $members = (int) DB::table('group_user')->distinct()->count('user_id');

        return [
            'total' => Group::query()->count(),
            'members' => $members,
            'average_completion' => $groups->isEmpty()
                ? 0
                : (int) round($groups->avg(fn (Group $group) => (float) ($group->average_score ?? 0))),
        ];
    }

    private function loadForResponse(Group $group): void
    {
        $group->load([
            'users' => fn ($query) => $query
                ->with('groups')
                ->withCount(['activities', 'dailyReports'])
                ->withAvg('dailyReports as average_score', 'calculated_score'),
        ])->loadCount('users');

        $group->setAttribute('activities_count', (int) DB::table('group_user')
            ->join('activities', 'activities.user_id', '=', 'group_user.user_id')
            ->where('group_user.group_id', $group->id)
            ->whereNull('activities.deleted_at')
            ->count());
        $group->setAttribute('average_score', (float) (DB::table('group_user')
            ->join('daily_reports', 'daily_reports.user_id', '=', 'group_user.user_id')
            ->where('group_user.group_id', $group->id)
            ->whereNull('daily_reports.deleted_at')
            ->where('daily_reports.report_date', '>=', now()->subDays(30)->toDateString())
            ->avg('daily_reports.calculated_score') ?? 0));
    }

    /**
     * @param  array<int, int|string>  $memberIds
     */
    private function syncMembers(Group $group, array $memberIds, ?int $assignedBy): void
    {
        $members = collect($memberIds)
            ->mapWithKeys(fn ($id) => [
                (int) $id => [
                    'assigned_by' => $assignedBy,
                    'assigned_at' => now(),
                ],
            ])
            ->all();

        $group->users()->sync($members);
    }

    private function nextColor(): string
    {
        $palette = ['brand', 'sky', 'emerald', 'amber', 'rose', 'violet'];

        return $palette[Group::query()->count() % count($palette)];
    }
}
