<?php

namespace App\Http\Controllers\Api\V1;

use App\Enums\GoalStatus;
use App\Enums\NotificationType;
use App\Http\Controllers\Controller;
use App\Http\Requests\StoreGoalRequest;
use App\Http\Requests\UpdateGoalProgressRequest;
use App\Http\Requests\UpdateGoalRequest;
use App\Http\Resources\GoalResource;
use App\Http\Responses\ApiResponse;
use App\Models\Goal;
use App\Models\Notification;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class GoalController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $request->validate([
            'status' => ['sometimes', Rule::enum(GoalStatus::class)],
            'search' => ['sometimes', 'string', 'max:255'],
            'from' => ['sometimes', 'date'],
            'to' => ['sometimes', 'date', 'after_or_equal:from'],
            'per_page' => ['sometimes', 'integer', 'between:1,100'],
        ]);

        $query = Goal::query()
            ->ownedBy($request->user())
            ->orderByDesc('created_at');

        if ($request->filled('status')) {
            $query->where('status', $request->string('status')->toString());
        }

        if ($request->filled('search')) {
            $query->where('title', 'like', '%'.$request->string('search')->toString().'%');
        }

        if ($request->filled('from')) {
            $query->whereDate('target_date', '>=', $request->date('from')->toDateString());
        }

        if ($request->filled('to')) {
            $query->whereDate('target_date', '<=', $request->date('to')->toDateString());
        }

        $paginator = $query->paginate((int) $request->integer('per_page', 20));

        return ApiResponse::paginated(
            $paginator,
            GoalResource::collection($paginator->items()),
            'Goals retrieved.',
        );
    }

    public function store(StoreGoalRequest $request): JsonResponse
    {
        $data = $request->validated();
        $data['user_id'] = $request->user()->id;
        $data['progress'] ??= 0;
        $data['status'] ??= GoalStatus::NotStarted->value;
        $data['server_version'] = 1;
        $data['synced_at'] = now();

        $goal = Goal::create($data);
        $this->applyCompletionState($goal);

        return ApiResponse::success(new GoalResource($goal->refresh()), 'Goal created.', 201);
    }

    public function show(Request $request, Goal $goal): JsonResponse
    {
        $this->ensureOwned($request, $goal);

        return ApiResponse::success(new GoalResource($goal));
    }

    public function update(UpdateGoalRequest $request, Goal $goal): JsonResponse
    {
        $this->ensureOwned($request, $goal);
        $wasCompleted = $goal->status === GoalStatus::Completed;

        $goal->fill($request->validated());
        $goal->server_version = ((int) $goal->server_version) + 1;
        $goal->synced_at = now();
        $goal->save();

        $this->applyCompletionState($goal);
        $this->notifyIfAchieved($goal, $wasCompleted);

        return ApiResponse::success(new GoalResource($goal->refresh()), 'Goal updated.');
    }

    public function progress(UpdateGoalProgressRequest $request, Goal $goal): JsonResponse
    {
        $this->ensureOwned($request, $goal);
        $wasCompleted = $goal->status === GoalStatus::Completed;

        $goal->progress = $request->input('progress');

        if ($request->filled('status')) {
            $goal->status = GoalStatus::from($request->string('status')->toString());
        }

        $goal->server_version = ((int) $goal->server_version) + 1;
        $goal->synced_at = now();
        $goal->save();

        $this->applyCompletionState($goal);
        $this->notifyIfAchieved($goal, $wasCompleted);

        return ApiResponse::success(new GoalResource($goal->refresh()), 'Goal progress updated.');
    }

    public function destroy(Request $request, Goal $goal): JsonResponse
    {
        $this->ensureOwned($request, $goal);
        $goal->delete();

        return ApiResponse::success(null, 'Goal deleted.');
    }

    private function ensureOwned(Request $request, Goal $goal): void
    {
        abort_unless($goal->user_id === $request->user()->id, 404);
    }

    private function applyCompletionState(Goal $goal): void
    {
        if ((float) $goal->progress >= 100) {
            $goal->status = GoalStatus::Completed;
            $goal->achieved_at ??= now();
            $goal->save();
        }
    }

    private function notifyIfAchieved(Goal $goal, bool $wasCompleted): void
    {
        if ($wasCompleted || $goal->status !== GoalStatus::Completed) {
            return;
        }

        Notification::create([
            'user_id' => $goal->user_id,
            'type' => NotificationType::GoalAchieved,
            'title' => 'Goal achieved',
            'body' => 'Congratulations! You completed "'.$goal->title.'".',
            'data' => ['goal_id' => $goal->id, 'goal_uuid' => $goal->uuid],
            'sent_at' => now(),
        ]);
    }
}
