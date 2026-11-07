<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreExerciseRecordRequest;
use App\Http\Requests\UpdateExerciseRecordRequest;
use App\Http\Resources\ExerciseRecordResource;
use App\Http\Responses\ApiResponse;
use App\Models\Activity;
use App\Models\ExerciseRecord;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

class ExerciseRecordController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $request->validate([
            'activity_id' => ['sometimes', 'integer'],
            'exercise_type' => ['sometimes', 'string', 'max:100'],
            'from' => ['sometimes', 'date'],
            'to' => ['sometimes', 'date', 'after_or_equal:from'],
            'per_page' => ['sometimes', 'integer', 'between:1,100'],
        ]);

        $query = ExerciseRecord::query()
            ->ownedBy($request->user())
            ->with('activity')
            ->orderByDesc('recorded_at');

        if ($request->filled('activity_id')) {
            $query->where('activity_id', $request->integer('activity_id'));
        }

        if ($request->filled('exercise_type')) {
            $query->where('exercise_type', $request->string('exercise_type')->toString());
        }

        if ($request->filled('from')) {
            $query->whereDate('recorded_at', '>=', $request->date('from')->toDateString());
        }

        if ($request->filled('to')) {
            $query->whereDate('recorded_at', '<=', $request->date('to')->toDateString());
        }

        $paginator = $query->paginate((int) $request->integer('per_page', 20));

        return ApiResponse::paginated(
            $paginator,
            ExerciseRecordResource::collection($paginator->items()),
            'Exercise records retrieved.',
        );
    }

    public function store(StoreExerciseRecordRequest $request): JsonResponse
    {
        $data = $request->validated();
        $this->ensureActivityOwned($request, $data['activity_id'] ?? null);

        $data['user_id'] = $request->user()->id;
        $data['server_version'] = 1;
        $data['synced_at'] = now();

        $record = ExerciseRecord::create($data);

        return ApiResponse::success(
            new ExerciseRecordResource($record->load('activity')),
            'Exercise record created.',
            201,
        );
    }

    public function show(Request $request, ExerciseRecord $exerciseRecord): JsonResponse
    {
        $this->ensureOwned($request, $exerciseRecord);

        return ApiResponse::success(new ExerciseRecordResource($exerciseRecord->load('activity')));
    }

    public function update(UpdateExerciseRecordRequest $request, ExerciseRecord $exerciseRecord): JsonResponse
    {
        $this->ensureOwned($request, $exerciseRecord);

        $data = $request->validated();
        $this->ensureActivityOwned($request, $data['activity_id'] ?? null);

        $exerciseRecord->fill($data);
        $exerciseRecord->server_version = ((int) $exerciseRecord->server_version) + 1;
        $exerciseRecord->synced_at = now();
        $exerciseRecord->save();

        return ApiResponse::success(
            new ExerciseRecordResource($exerciseRecord->refresh()->load('activity')),
            'Exercise record updated.',
        );
    }

    public function destroy(Request $request, ExerciseRecord $exerciseRecord): JsonResponse
    {
        $this->ensureOwned($request, $exerciseRecord);
        $exerciseRecord->delete();

        return ApiResponse::success(null, 'Exercise record deleted.');
    }

    private function ensureOwned(Request $request, ExerciseRecord $record): void
    {
        abort_unless($record->user_id === $request->user()->id, 404);
    }

    private function ensureActivityOwned(Request $request, ?int $activityId): void
    {
        if ($activityId === null) {
            return;
        }

        $owned = Activity::query()
            ->whereKey($activityId)
            ->ownedBy($request->user())
            ->exists();

        if (! $owned) {
            throw ValidationException::withMessages([
                'activity_id' => ['The selected activity does not belong to you.'],
            ]);
        }
    }
}
