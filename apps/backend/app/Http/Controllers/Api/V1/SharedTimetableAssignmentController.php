<?php

namespace App\Http\Controllers\Api\V1;

use App\Enums\NotificationType;
use App\Http\Controllers\Api\V1\Concerns\ChecksSharedTimetableAccess;
use App\Http\Controllers\Controller;
use App\Http\Requests\StoreSharedTimetableAssignmentRequest;
use App\Http\Resources\SharedTimetableAssignmentResource;
use App\Http\Responses\ApiResponse;
use App\Models\Group;
use App\Models\Notification;
use App\Models\SharedTimetable;
use App\Models\SharedTimetableAssignment;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SharedTimetableAssignmentController extends Controller
{
    use ChecksSharedTimetableAccess;

    public function index(Request $request, SharedTimetable $sharedTimetable): JsonResponse
    {
        $this->ensureTimetableAccessible($request->user(), $sharedTimetable);

        $assignments = $sharedTimetable->assignments()
            ->with(['user', 'group'])
            ->orderByDesc('assigned_at')
            ->get();

        return ApiResponse::success(
            SharedTimetableAssignmentResource::collection($assignments),
            'Assignments retrieved.',
        );
    }

    public function store(
        StoreSharedTimetableAssignmentRequest $request,
        SharedTimetable $sharedTimetable,
    ): JsonResponse {
        $data = $request->validated();

        $assignment = $sharedTimetable->assignments()->updateOrCreate(
            [
                'user_id' => $data['user_id'] ?? null,
                'group_id' => $data['group_id'] ?? null,
            ],
            [
                'uuid' => $data['uuid'] ?? null,
                'assigned_by' => $request->user()->id,
                'assigned_at' => now(),
                'server_version' => 1,
                'synced_at' => now(),
            ],
        );

        $this->notifyRecipients($sharedTimetable, $data);

        return ApiResponse::success(
            new SharedTimetableAssignmentResource($assignment->load(['user', 'group'])),
            'Assignment created.',
            201,
        );
    }

    public function destroy(
        SharedTimetable $sharedTimetable,
        SharedTimetableAssignment $assignment,
    ): JsonResponse {
        abort_unless($assignment->shared_timetable_id === $sharedTimetable->id, 404);
        $assignment->delete();

        return ApiResponse::success(null, 'Assignment removed.');
    }

    /**
     * @param  array<string, mixed>  $data
     */
    private function notifyRecipients(SharedTimetable $timetable, array $data): void
    {
        $recipients = isset($data['user_id'])
            ? User::query()->whereKey($data['user_id'])->get()
            : Group::query()->find($data['group_id'])?->users()->get() ?? collect();

        foreach ($recipients as $recipient) {
            Notification::create([
                'user_id' => $recipient->id,
                'type' => NotificationType::SharedActivityAssigned,
                'title' => 'New shared timetable assigned',
                'body' => 'You have been assigned "'.$timetable->title.'".',
                'data' => [
                    'shared_timetable_id' => $timetable->id,
                    'shared_timetable_uuid' => $timetable->uuid,
                ],
                'sent_at' => now(),
            ]);
        }
    }
}
