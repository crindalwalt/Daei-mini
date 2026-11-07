<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\UpdateHabitRecordRequest;
use App\Http\Resources\HabitRecordResource;
use App\Http\Responses\ApiResponse;
use App\Models\HabitRecord;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class HabitRecordController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $request->validate([
            'habit_id' => ['sometimes', 'integer'],
            'from' => ['sometimes', 'date'],
            'to' => ['sometimes', 'date', 'after_or_equal:from'],
            'per_page' => ['sometimes', 'integer', 'between:1,100'],
        ]);

        $query = HabitRecord::query()
            ->ownedBy($request->user())
            ->with('habit')
            ->orderByDesc('record_date');

        if ($request->filled('habit_id')) {
            $query->where('habit_id', $request->integer('habit_id'));
        }

        if ($request->filled('from')) {
            $query->whereDate('record_date', '>=', $request->date('from')->toDateString());
        }

        if ($request->filled('to')) {
            $query->whereDate('record_date', '<=', $request->date('to')->toDateString());
        }

        $paginator = $query->paginate((int) $request->integer('per_page', 30));

        return ApiResponse::paginated(
            $paginator,
            HabitRecordResource::collection($paginator->items()),
            'Habit records retrieved.',
        );
    }

    public function show(Request $request, HabitRecord $habitRecord): JsonResponse
    {
        abort_unless($habitRecord->user_id === $request->user()->id, 404);

        return ApiResponse::success(new HabitRecordResource($habitRecord->load('habit')));
    }

    public function update(UpdateHabitRecordRequest $request, HabitRecord $habitRecord): JsonResponse
    {
        abort_unless($habitRecord->user_id === $request->user()->id, 404);

        $habitRecord->fill($request->validated());
        $habitRecord->server_version = ((int) $habitRecord->server_version) + 1;
        $habitRecord->synced_at = now();
        $habitRecord->save();

        return ApiResponse::success(new HabitRecordResource($habitRecord->refresh()), 'Habit record updated.');
    }

    public function destroy(Request $request, HabitRecord $habitRecord): JsonResponse
    {
        abort_unless($habitRecord->user_id === $request->user()->id, 404);
        $habitRecord->delete();

        return ApiResponse::success(null, 'Habit record deleted.');
    }
}
