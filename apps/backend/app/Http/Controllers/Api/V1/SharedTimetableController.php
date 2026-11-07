<?php

namespace App\Http\Controllers\Api\V1;

use App\Enums\TimetableStatus;
use App\Http\Controllers\Api\V1\Concerns\ChecksSharedTimetableAccess;
use App\Http\Controllers\Controller;
use App\Http\Requests\StoreSharedTimetableRequest;
use App\Http\Requests\UpdateSharedTimetableRequest;
use App\Http\Resources\SharedTimetableResource;
use App\Http\Responses\ApiResponse;
use App\Models\SharedTimetable;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class SharedTimetableController extends Controller
{
    use ChecksSharedTimetableAccess;

    public function index(Request $request): JsonResponse
    {
        $request->validate([
            'status' => ['sometimes', Rule::enum(TimetableStatus::class)],
            'search' => ['sometimes', 'string', 'max:255'],
            'per_page' => ['sometimes', 'integer', 'between:1,100'],
        ]);

        $user = $request->user();
        $groupIds = $user->groups()->pluck('groups.id')->all();

        $query = SharedTimetable::query()
            ->withCount(['activities', 'assignments'])
            ->orderByDesc('start_date');

        if (! $user->isAdmin()) {
            $query->where('status', TimetableStatus::Published)
                ->where(function ($query) use ($user, $groupIds): void {
                    $query->where('created_by', $user->id)
                        ->orWhereHas('assignments', fn ($assignment) => $assignment->where('user_id', $user->id));

                    if ($groupIds !== []) {
                        $query->orWhereHas(
                            'assignments',
                            fn ($assignment) => $assignment->whereIn('group_id', $groupIds),
                        );
                    }
                });
        } elseif ($request->filled('status')) {
            $query->where('status', $request->string('status')->toString());
        }

        if ($request->filled('search')) {
            $query->where('title', 'like', '%'.$request->string('search')->toString().'%');
        }

        $paginator = $query->paginate((int) $request->integer('per_page', 20));

        return ApiResponse::paginated(
            $paginator,
            SharedTimetableResource::collection($paginator->items()),
            'Shared timetables retrieved.',
        );
    }

    public function store(StoreSharedTimetableRequest $request): JsonResponse
    {
        $data = $request->validated();
        $data['created_by'] = $request->user()->id;
        $data['status'] ??= TimetableStatus::Draft->value;
        $data['server_version'] = 1;
        $data['synced_at'] = now();

        $timetable = SharedTimetable::create($data);

        return ApiResponse::success(
            new SharedTimetableResource($timetable->loadCount(['activities', 'assignments'])),
            'Shared timetable created.',
            201,
        );
    }

    public function show(Request $request, SharedTimetable $sharedTimetable): JsonResponse
    {
        $this->ensureTimetableAccessible($request->user(), $sharedTimetable);

        $sharedTimetable->load([
            'activities' => fn ($query) => $query
                ->orderBy('activity_date')
                ->orderBy('sort_order')
                ->with(['completions' => fn ($completion) => $completion->where('user_id', $request->user()->id)]),
            'assignments.user',
            'assignments.group',
        ]);

        return ApiResponse::success(new SharedTimetableResource($sharedTimetable));
    }

    public function update(UpdateSharedTimetableRequest $request, SharedTimetable $sharedTimetable): JsonResponse
    {
        $sharedTimetable->fill($request->validated());
        $sharedTimetable->server_version = ((int) $sharedTimetable->server_version) + 1;
        $sharedTimetable->synced_at = now();
        $sharedTimetable->save();

        return ApiResponse::success(
            new SharedTimetableResource($sharedTimetable->refresh()->loadCount(['activities', 'assignments'])),
            'Shared timetable updated.',
        );
    }

    public function destroy(SharedTimetable $sharedTimetable): JsonResponse
    {
        $sharedTimetable->delete();

        return ApiResponse::success(null, 'Shared timetable deleted.');
    }

    public function publish(SharedTimetable $sharedTimetable): JsonResponse
    {
        $sharedTimetable->status = TimetableStatus::Published;
        $sharedTimetable->server_version = ((int) $sharedTimetable->server_version) + 1;
        $sharedTimetable->synced_at = now();
        $sharedTimetable->save();

        return ApiResponse::success(
            new SharedTimetableResource($sharedTimetable->refresh()->loadCount(['activities', 'assignments'])),
            'Shared timetable published.',
        );
    }
}
