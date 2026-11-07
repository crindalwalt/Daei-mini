<?php

namespace App\Http\Controllers\Api\V1;

use App\Enums\ActivityStatus;
use App\Http\Controllers\Api\V1\Concerns\ChecksSharedTimetableAccess;
use App\Http\Controllers\Controller;
use App\Http\Requests\StoreSharedActivityCompletionRequest;
use App\Http\Requests\UpdateSharedActivityCompletionRequest;
use App\Http\Resources\SharedActivityCompletionResource;
use App\Http\Responses\ApiResponse;
use App\Models\SharedActivityCompletion;
use App\Models\SharedTimetable;
use App\Models\SharedTimetableActivity;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class SharedActivityCompletionController extends Controller
{
    use ChecksSharedTimetableAccess;

    public function index(Request $request): JsonResponse
    {
        $request->validate([
            'from' => ['sometimes', 'date'],
            'to' => ['sometimes', 'date', 'after_or_equal:from'],
            'status' => ['sometimes', Rule::enum(ActivityStatus::class)],
            'per_page' => ['sometimes', 'integer', 'between:1,100'],
        ]);

        $query = SharedActivityCompletion::query()
            ->ownedBy($request->user())
            ->with('sharedTimetableActivity')
            ->orderByDesc('created_at');

        if ($request->filled('from')) {
            $query->whereDate('created_at', '>=', $request->date('from')->toDateString());
        }

        if ($request->filled('to')) {
            $query->whereDate('created_at', '<=', $request->date('to')->toDateString());
        }

        if ($request->filled('status')) {
            $query->where('status', $request->string('status')->toString());
        }

        $paginator = $query->paginate((int) $request->integer('per_page', 20));

        return ApiResponse::paginated(
            $paginator,
            SharedActivityCompletionResource::collection($paginator->items()),
            'Shared activity completions retrieved.',
        );
    }

    public function store(
        StoreSharedActivityCompletionRequest $request,
        SharedTimetable $sharedTimetable,
        SharedTimetableActivity $activity,
    ): JsonResponse {
        $this->ensureTimetableAccessible($request->user(), $sharedTimetable);
        abort_unless($activity->shared_timetable_id === $sharedTimetable->id, 404);

        $data = $request->validated();
        $status = ActivityStatus::tryFrom($data['status'] ?? '') ?? ActivityStatus::Completed;

        if ($status === ActivityStatus::Completed && ! isset($data['completed_at'])) {
            $data['completed_at'] = now();
        }

        if ($status !== ActivityStatus::Completed) {
            $data['completed_at'] = null;
        }

        $completion = SharedActivityCompletion::firstOrNew([
            'shared_timetable_activity_id' => $activity->id,
            'user_id' => $request->user()->id,
        ]);
        $wasRecentlyCreated = ! $completion->exists;

        if (isset($data['uuid'])) {
            $completion->uuid = $data['uuid'];
            unset($data['uuid']);
        }

        $completion->fill($data);
        $completion->user_id = $request->user()->id;
        $completion->shared_timetable_activity_id = $activity->id;
        $completion->server_version = $wasRecentlyCreated
            ? 1
            : ((int) $completion->server_version) + 1;
        $completion->synced_at = now();
        $completion->save();

        return ApiResponse::success(
            new SharedActivityCompletionResource($completion->load('sharedTimetableActivity')),
            'Completion recorded.',
            $wasRecentlyCreated ? 201 : 200,
        );
    }

    public function update(
        UpdateSharedActivityCompletionRequest $request,
        SharedActivityCompletion $sharedActivityCompletion,
    ): JsonResponse {
        abort_unless($sharedActivityCompletion->user_id === $request->user()->id, 404);

        $data = $request->validated();

        if (array_key_exists('status', $data)) {
            $status = ActivityStatus::tryFrom($data['status']);

            if ($status === ActivityStatus::Completed && ! array_key_exists('completed_at', $data)) {
                $data['completed_at'] = now();
            }

            if ($status !== ActivityStatus::Completed) {
                $data['completed_at'] = null;
            }
        }

        $sharedActivityCompletion->fill($data);
        $sharedActivityCompletion->server_version = ((int) $sharedActivityCompletion->server_version) + 1;
        $sharedActivityCompletion->synced_at = now();
        $sharedActivityCompletion->save();

        return ApiResponse::success(
            new SharedActivityCompletionResource($sharedActivityCompletion->refresh()->load('sharedTimetableActivity')),
            'Completion updated.',
        );
    }

    public function destroy(
        Request $request,
        SharedActivityCompletion $sharedActivityCompletion,
    ): JsonResponse {
        abort_unless($sharedActivityCompletion->user_id === $request->user()->id, 404);
        $sharedActivityCompletion->delete();

        return ApiResponse::success(null, 'Completion deleted.');
    }
}
