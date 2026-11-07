<?php

namespace App\Http\Controllers\Api\V1;

use App\Enums\NotificationType;
use App\Http\Controllers\Controller;
use App\Http\Resources\NotificationResource;
use App\Http\Responses\ApiResponse;
use App\Models\Notification;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class NotificationController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $request->validate([
            'unread' => ['sometimes', 'boolean'],
            'type' => ['sometimes', Rule::enum(NotificationType::class)],
            'per_page' => ['sometimes', 'integer', 'between:1,100'],
        ]);

        $query = Notification::query()
            ->ownedBy($request->user())
            ->orderByDesc('created_at');

        if ($request->boolean('unread')) {
            $query->unread();
        }

        if ($request->filled('type')) {
            $query->where('type', $request->string('type')->toString());
        }

        $paginator = $query->paginate((int) $request->integer('per_page', 20));

        return ApiResponse::paginated(
            $paginator,
            NotificationResource::collection($paginator->items()),
            'Notifications retrieved.',
        );
    }

    public function unreadCount(Request $request): JsonResponse
    {
        $count = Notification::query()
            ->ownedBy($request->user())
            ->unread()
            ->count();

        return ApiResponse::success(['unread_count' => $count]);
    }

    public function show(Request $request, Notification $notification): JsonResponse
    {
        $this->ensureOwned($request, $notification);

        return ApiResponse::success(new NotificationResource($notification));
    }

    public function markAsRead(Request $request, Notification $notification): JsonResponse
    {
        $this->ensureOwned($request, $notification);
        $notification->markAsRead();

        return ApiResponse::success(new NotificationResource($notification->refresh()), 'Notification read.');
    }

    public function markAllAsRead(Request $request): JsonResponse
    {
        $count = Notification::query()
            ->ownedBy($request->user())
            ->unread()
            ->update(['read_at' => now()]);

        return ApiResponse::success(['updated_count' => $count], 'Notifications marked as read.');
    }

    public function destroy(Request $request, Notification $notification): JsonResponse
    {
        $this->ensureOwned($request, $notification);
        $notification->delete();

        return ApiResponse::success(null, 'Notification deleted.');
    }

    private function ensureOwned(Request $request, Notification $notification): void
    {
        abort_unless($notification->user_id === $request->user()->id, 404);
    }
}
