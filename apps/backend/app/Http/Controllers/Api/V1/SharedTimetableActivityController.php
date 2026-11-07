<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Api\V1\Concerns\ChecksSharedTimetableAccess;
use App\Http\Controllers\Controller;
use App\Http\Requests\StoreSharedTimetableActivityRequest;
use App\Http\Requests\UpdateSharedTimetableActivityRequest;
use App\Http\Resources\SharedTimetableActivityResource;
use App\Http\Responses\ApiResponse;
use App\Models\SharedTimetable;
use App\Models\SharedTimetableActivity;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Validation\ValidationException;

class SharedTimetableActivityController extends Controller
{
    use ChecksSharedTimetableAccess;

    public function index(Request $request, SharedTimetable $sharedTimetable): JsonResponse
    {
        $this->ensureTimetableAccessible($request->user(), $sharedTimetable);

        $activities = $sharedTimetable->activities()
            ->with(['completions' => fn ($query) => $query->where('user_id', $request->user()->id)])
            ->orderBy('activity_date')
            ->orderBy('sort_order')
            ->get();

        return ApiResponse::success(
            SharedTimetableActivityResource::collection($activities),
            'Shared timetable activities retrieved.',
        );
    }

    public function store(
        StoreSharedTimetableActivityRequest $request,
        SharedTimetable $sharedTimetable,
    ): JsonResponse {
        $data = $request->validated();
        $this->ensureWithinTimetable($sharedTimetable, $data['activity_date']);

        $data['shared_timetable_id'] = $sharedTimetable->id;
        $data['server_version'] = 1;
        $data['synced_at'] = now();

        $activity = SharedTimetableActivity::create($data);

        return ApiResponse::success(
            new SharedTimetableActivityResource($activity),
            'Shared timetable activity created.',
            201,
        );
    }

    public function update(
        UpdateSharedTimetableActivityRequest $request,
        SharedTimetable $sharedTimetable,
        SharedTimetableActivity $activity,
    ): JsonResponse {
        $this->ensureBelongsToTimetable($sharedTimetable, $activity);

        $data = $request->validated();

        if (isset($data['activity_date'])) {
            $this->ensureWithinTimetable($sharedTimetable, $data['activity_date']);
        }

        $activity->fill($data);
        $activity->server_version = ((int) $activity->server_version) + 1;
        $activity->synced_at = now();
        $activity->save();

        return ApiResponse::success(
            new SharedTimetableActivityResource($activity->refresh()),
            'Shared timetable activity updated.',
        );
    }

    public function destroy(SharedTimetable $sharedTimetable, SharedTimetableActivity $activity): JsonResponse
    {
        $this->ensureBelongsToTimetable($sharedTimetable, $activity);
        $activity->delete();

        return ApiResponse::success(null, 'Shared timetable activity deleted.');
    }

    private function ensureBelongsToTimetable(
        SharedTimetable $timetable,
        SharedTimetableActivity $activity,
    ): void {
        abort_unless($activity->shared_timetable_id === $timetable->id, 404);
    }

    private function ensureWithinTimetable(SharedTimetable $timetable, string $date): void
    {
        $activityDate = Carbon::parse($date)->toDateString();
        $startDate = $timetable->start_date?->toDateString();
        $endDate = $timetable->end_date?->toDateString();

        if (($startDate !== null && $activityDate < $startDate)
            || ($endDate !== null && $activityDate > $endDate)) {
            throw ValidationException::withMessages([
                'activity_date' => ['The activity date must fall within the timetable date range.'],
            ]);
        }
    }
}
