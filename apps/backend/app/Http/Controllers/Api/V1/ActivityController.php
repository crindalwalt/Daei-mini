<?php

namespace App\Http\Controllers\Api\V1;

use App\Enums\ActivityStatus;
use App\Enums\ActivityType;
use App\Http\Controllers\Controller;
use App\Http\Requests\StoreActivityReminderRequest;
use App\Http\Requests\StoreActivityRequest;
use App\Http\Requests\UpdateActivityReminderRequest;
use App\Http\Requests\UpdateActivityRequest;
use App\Http\Resources\ActivityReminderResource;
use App\Http\Resources\ActivityResource;
use App\Http\Responses\ApiResponse;
use App\Models\Activity;
use App\Models\ActivityReminder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class ActivityController extends Controller
{
    /**
     * List the authenticated user's personal activities.
     */
    public function index(Request $request): JsonResponse
    {
        $request->validate([
            'date' => ['sometimes', 'date'],
            'from' => ['sometimes', 'date'],
            'to' => ['sometimes', 'date', 'after_or_equal:from'],
            'status' => ['sometimes', Rule::enum(ActivityStatus::class)],
            'activity_type' => ['sometimes', Rule::enum(ActivityType::class)],
            'search' => ['sometimes', 'string', 'max:255'],
            'per_page' => ['sometimes', 'integer', 'between:1,100'],
        ]);

        $query = Activity::query()
            ->ownedBy($request->user())
            ->with('reminders')
            ->orderBy('scheduled_date')
            ->orderBy('start_time');

        if ($request->filled('date')) {
            $query->whereDate('scheduled_date', $request->date('date')->toDateString());
        }

        if ($request->filled('from')) {
            $query->whereDate('scheduled_date', '>=', $request->date('from')->toDateString());
        }

        if ($request->filled('to')) {
            $query->whereDate('scheduled_date', '<=', $request->date('to')->toDateString());
        }

        if ($request->filled('status')) {
            $query->where('status', $request->string('status')->toString());
        }

        if ($request->filled('activity_type')) {
            $query->where('activity_type', $request->string('activity_type')->toString());
        }

        if ($request->filled('search')) {
            $query->where('title', 'like', '%'.$request->string('search')->toString().'%');
        }

        $paginator = $query->paginate((int) $request->integer('per_page', 20));

        return ApiResponse::paginated(
            $paginator,
            ActivityResource::collection($paginator->items()),
            'Activities retrieved.',
        );
    }

    /**
     * Create a personal activity.
     */
    public function store(StoreActivityRequest $request): JsonResponse
    {
        $data = $request->validated();

        if (isset($data['uuid'])) {
            $existing = Activity::query()->withTrashed()->where('uuid', $data['uuid'])->first();

            if ($existing !== null) {
                abort_unless($existing->user_id === $request->user()->id, 404);

                if ($existing->trashed()) {
                    $existing->restore();
                }

                return ApiResponse::success(
                    new ActivityResource($existing->load('reminders')),
                    'Activity already synchronized.',
                );
            }
        }

        $data['user_id'] = $request->user()->id;
        $data['status'] ??= ActivityStatus::Pending->value;
        $data['server_version'] = 1;
        $data['synced_at'] = now();

        $activity = Activity::create($data);

        return ApiResponse::success(
            new ActivityResource($activity->load('reminders')),
            'Activity created.',
            201,
        );
    }

    public function show(Request $request, Activity $activity): JsonResponse
    {
        $this->ensureOwned($request, $activity);

        return ApiResponse::success(
            new ActivityResource($activity->load(['reminders', 'exerciseRecords'])),
        );
    }

    public function update(UpdateActivityRequest $request, Activity $activity): JsonResponse
    {
        $this->ensureOwned($request, $activity);

        $activity->fill($request->validated());
        $activity->server_version = ((int) $activity->server_version) + 1;
        $activity->synced_at = now();
        $activity->save();

        return ApiResponse::success(
            new ActivityResource($activity->refresh()->load('reminders')),
            'Activity updated.',
        );
    }

    public function destroy(Request $request, Activity $activity): JsonResponse
    {
        $this->ensureOwned($request, $activity);
        $activity->delete();

        return ApiResponse::success(null, 'Activity deleted.');
    }

    /**
     * Mark an activity as completed.
     */
    public function complete(Request $request, Activity $activity): JsonResponse
    {
        $this->ensureOwned($request, $activity);

        $activity->status = ActivityStatus::Completed;
        $activity->server_version = ((int) $activity->server_version) + 1;
        $activity->synced_at = now();
        $activity->save();

        return ApiResponse::success(
            new ActivityResource($activity->refresh()->load('reminders')),
            'Activity completed.',
        );
    }

    public function reminders(Request $request, Activity $activity): JsonResponse
    {
        $this->ensureOwned($request, $activity);

        return ApiResponse::success(
            ActivityReminderResource::collection($activity->reminders()->orderBy('reminder_at')->get()),
            'Reminders retrieved.',
        );
    }

    public function storeReminder(StoreActivityReminderRequest $request, Activity $activity): JsonResponse
    {
        $this->ensureOwned($request, $activity);

        $data = $request->validated();
        $data['activity_id'] = $activity->id;
        $data['user_id'] = $request->user()->id;
        $data['server_version'] = 1;
        $data['synced_at'] = now();

        $reminder = ActivityReminder::create($data);

        return ApiResponse::success(new ActivityReminderResource($reminder), 'Reminder created.', 201);
    }

    public function updateReminder(
        UpdateActivityReminderRequest $request,
        Activity $activity,
        ActivityReminder $reminder,
    ): JsonResponse {
        $this->ensureOwned($request, $activity);
        $this->ensureReminderOwned($request, $activity, $reminder);

        $reminder->fill($request->validated());
        $reminder->server_version = ((int) $reminder->server_version) + 1;
        $reminder->synced_at = now();
        $reminder->save();

        return ApiResponse::success(new ActivityReminderResource($reminder->refresh()), 'Reminder updated.');
    }

    public function destroyReminder(
        Request $request,
        Activity $activity,
        ActivityReminder $reminder,
    ): JsonResponse {
        $this->ensureOwned($request, $activity);
        $this->ensureReminderOwned($request, $activity, $reminder);

        $reminder->delete();

        return ApiResponse::success(null, 'Reminder deleted.');
    }

    private function ensureOwned(Request $request, Activity $activity): void
    {
        abort_unless($activity->user_id === $request->user()->id, 404);
    }

    private function ensureReminderOwned(Request $request, Activity $activity, ActivityReminder $reminder): void
    {
        abort_unless(
            $reminder->activity_id === $activity->id && $reminder->user_id === $request->user()->id,
            404,
        );
    }
}
