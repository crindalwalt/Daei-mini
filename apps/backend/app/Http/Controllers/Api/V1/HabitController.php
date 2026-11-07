<?php

namespace App\Http\Controllers\Api\V1;

use App\Enums\ActivityStatus;
use App\Http\Controllers\Controller;
use App\Http\Requests\StoreHabitRecordRequest;
use App\Http\Requests\StoreHabitRequest;
use App\Http\Requests\ToggleHabitRequest;
use App\Http\Requests\UpdateHabitRequest;
use App\Http\Resources\HabitRecordResource;
use App\Http\Resources\HabitResource;
use App\Http\Responses\ApiResponse;
use App\Models\Habit;
use App\Models\HabitRecord;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;

class HabitController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $request->validate([
            'is_active' => ['sometimes', 'boolean'],
            'search' => ['sometimes', 'string', 'max:255'],
            'per_page' => ['sometimes', 'integer', 'between:1,100'],
        ]);

        $query = Habit::query()
            ->ownedBy($request->user())
            ->withCount('records')
            ->orderBy('name');

        if ($request->has('is_active')) {
            $query->where('is_active', $request->boolean('is_active'));
        }

        if ($request->filled('search')) {
            $query->where('name', 'like', '%'.$request->string('search')->toString().'%');
        }

        $paginator = $query->paginate((int) $request->integer('per_page', 20));

        return ApiResponse::paginated(
            $paginator,
            HabitResource::collection($paginator->items()),
            'Habits retrieved.',
        );
    }

    public function store(StoreHabitRequest $request): JsonResponse
    {
        $data = $request->validated();
        $data['user_id'] = $request->user()->id;
        $data['server_version'] = 1;
        $data['synced_at'] = now();

        $habit = Habit::create($data);

        return ApiResponse::success(new HabitResource($habit), 'Habit created.', 201);
    }

    public function show(Request $request, Habit $habit): JsonResponse
    {
        $this->ensureOwned($request, $habit);

        $habit->load(['records' => fn ($query) => $query->orderByDesc('record_date')->limit(30)]);

        return ApiResponse::success([
            'habit' => new HabitResource($habit),
            'streak' => $this->currentStreak($request, $habit),
        ]);
    }

    public function update(UpdateHabitRequest $request, Habit $habit): JsonResponse
    {
        $this->ensureOwned($request, $habit);

        $habit->fill($request->validated());
        $habit->server_version = ((int) $habit->server_version) + 1;
        $habit->synced_at = now();
        $habit->save();

        return ApiResponse::success(new HabitResource($habit->refresh()), 'Habit updated.');
    }

    public function destroy(Request $request, Habit $habit): JsonResponse
    {
        $this->ensureOwned($request, $habit);
        $habit->delete();

        return ApiResponse::success(null, 'Habit deleted.');
    }

    /**
     * Toggle (or explicitly set) a habit's completion status for a date.
     */
    public function toggle(ToggleHabitRequest $request, Habit $habit): JsonResponse
    {
        $this->ensureOwned($request, $habit);

        $date = $request->filled('record_date')
            ? Carbon::parse($request->input('record_date'))->startOfDay()
            : today();

        $record = $habit->records()
            ->ownedBy($request->user())
            ->whereDate('record_date', $date->toDateString())
            ->first();

        $status = $request->filled('status')
            ? ActivityStatus::from($request->string('status')->toString())
            : ($record?->status === ActivityStatus::Completed
                ? ActivityStatus::Pending
                : ActivityStatus::Completed);

        $isNew = $record === null;
        $record ??= new HabitRecord([
            'habit_id' => $habit->id,
            'user_id' => $request->user()->id,
            'record_date' => $date->toDateString(),
        ]);

        $record->status = $status;
        $record->notes = $request->input('notes', $record->notes);
        $record->server_version = $isNew ? 1 : ((int) $record->server_version) + 1;
        $record->synced_at = now();
        $record->save();

        return ApiResponse::success([
            'record' => new HabitRecordResource($record),
            'completed_today' => $status === ActivityStatus::Completed,
            'streak' => $this->currentStreak($request, $habit),
        ], 'Habit toggled.');
    }

    public function records(Request $request, Habit $habit): JsonResponse
    {
        $this->ensureOwned($request, $habit);

        $paginator = $habit->records()
            ->ownedBy($request->user())
            ->orderByDesc('record_date')
            ->paginate(30);

        return ApiResponse::paginated(
            $paginator,
            HabitRecordResource::collection($paginator->items()),
            'Habit records retrieved.',
        );
    }

    public function storeRecord(StoreHabitRecordRequest $request, Habit $habit): JsonResponse
    {
        $this->ensureOwned($request, $habit);

        $data = $request->validated();
        $date = Carbon::parse($data['record_date'])->toDateString();

        $record = $habit->records()
            ->ownedBy($request->user())
            ->whereDate('record_date', $date)
            ->first();

        $isNew = $record === null;
        $record ??= new HabitRecord([
            'habit_id' => $habit->id,
            'user_id' => $request->user()->id,
            'record_date' => $date,
        ]);

        if (isset($data['uuid'])) {
            $record->uuid = $data['uuid'];
        }

        $record->fill(array_diff_key($data, ['uuid' => true]));
        $record->habit_id = $habit->id;
        $record->user_id = $request->user()->id;
        $record->record_date = $date;
        $record->server_version = $isNew ? 1 : ((int) $record->server_version) + 1;
        $record->synced_at = now();
        $record->save();

        return ApiResponse::success(
            new HabitRecordResource($record),
            'Habit record saved.',
            $isNew ? 201 : 200,
        );
    }

    public function streak(Request $request, Habit $habit): JsonResponse
    {
        $this->ensureOwned($request, $habit);

        return ApiResponse::success([
            'habit_id' => $habit->id,
            'streak' => $this->currentStreak($request, $habit),
        ]);
    }

    private function ensureOwned(Request $request, Habit $habit): void
    {
        abort_unless($habit->user_id === $request->user()->id, 404);
    }

    private function currentStreak(Request $request, Habit $habit): int
    {
        $completedDates = $habit->records()
            ->ownedBy($request->user())
            ->completed()
            ->pluck('record_date')
            ->map(fn ($date) => Carbon::parse($date)->toDateString())
            ->all();

        $lookup = array_flip($completedDates);
        $cursor = today();
        $streak = 0;

        if (! isset($lookup[$cursor->toDateString()])) {
            $cursor = $cursor->copy()->subDay();
        }

        while (isset($lookup[$cursor->toDateString()])) {
            $streak++;
            $cursor = $cursor->copy()->subDay();
        }

        return $streak;
    }
}
