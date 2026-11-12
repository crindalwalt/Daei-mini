<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Enums\ActivityStatus;
use App\Http\Controllers\Controller;
use App\Http\Resources\AdminActivityResource;
use App\Http\Responses\ApiResponse;
use App\Models\Activity;
use App\Support\Csv;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\StreamedResponse;

class ActivityController extends Controller
{
    /**
     * List every member activity with server-side search and filters.
     */
    public function index(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'q' => ['sometimes', 'nullable', 'string', 'max:255'],
            'type' => ['sometimes', 'nullable', 'string', 'max:50'],
            'status' => ['sometimes', 'nullable', 'in:pending,completed,missed'],
            'user_id' => ['sometimes', 'nullable', 'integer', 'exists:users,id'],
            'per_page' => ['sometimes', 'integer', 'between:1,100'],
        ]);

        $paginator = $this->filteredQuery($validated)->paginate((int) ($validated['per_page'] ?? 15));

        return ApiResponse::success([
            'items' => AdminActivityResource::collection($paginator->items()),
            'stats' => $this->stats(),
        ], 'Activities retrieved.', 200, [
            'current_page' => $paginator->currentPage(),
            'per_page' => $paginator->perPage(),
            'total' => $paginator->total(),
            'last_page' => $paginator->lastPage(),
        ]);
    }

    /**
     * Mark an activity as completed on behalf of its owner.
     */
    public function complete(Activity $activity): JsonResponse
    {
        $activity->forceFill(['status' => ActivityStatus::Completed])->save();
        $activity->load('user');

        return ApiResponse::success([
            'activity' => new AdminActivityResource($activity),
        ], 'Activity marked as completed.');
    }

    /**
     * Stream the filtered activity list as a CSV download.
     */
    public function export(Request $request): StreamedResponse
    {
        $validated = $request->validate([
            'q' => ['sometimes', 'nullable', 'string', 'max:255'],
            'type' => ['sometimes', 'nullable', 'string', 'max:50'],
            'status' => ['sometimes', 'nullable', 'in:pending,completed,missed'],
            'user_id' => ['sometimes', 'nullable', 'integer', 'exists:users,id'],
        ]);

        $query = $this->filteredQuery($validated);

        $rows = function () use ($query): \Generator {
            foreach ($query->lazy(500) as $activity) {
                yield [
                    $activity->id,
                    $activity->title,
                    $activity->activity_type?->value,
                    $activity->scheduled_date?->toDateString(),
                    $activity->start_time,
                    $activity->end_time,
                    $activity->status?->value,
                    $activity->user?->name ?? '',
                    $activity->user?->email ?? '',
                ];
            }
        };

        return Csv::download('activities-'.now()->format('Y-m-d').'.csv', [
            'ID', 'Activity', 'Type', 'Date', 'Start', 'End', 'Status', 'Member', 'Email',
        ], $rows());
    }

    /**
     * @param  array<string, mixed>  $filters
     * @return Builder<Activity>
     */
    private function filteredQuery(array $filters): Builder
    {
        return Activity::query()
            ->with('user')
            ->when($filters['q'] ?? null, function (Builder $query, string $search): void {
                $like = '%'.str_replace(['%', '_'], ['\%', '\_'], trim($search)).'%';

                $query->where(function (Builder $query) use ($like): void {
                    $query->where('title', 'like', $like)
                        ->orWhere('description', 'like', $like)
                        ->orWhereHas('user', function (Builder $user) use ($like): void {
                            $user->where('name', 'like', $like)
                                ->orWhere('email', 'like', $like);
                        });
                });
            })
            ->when($filters['type'] ?? null, fn (Builder $query, string $type) => $query->where('activity_type', $type))
            ->when($filters['status'] ?? null, fn (Builder $query, string $status) => $query->where('status', $status))
            ->when($filters['user_id'] ?? null, fn (Builder $query, int|string $userId) => $query->where('user_id', $userId))
            ->orderByDesc('scheduled_date')
            ->orderByDesc('id');
    }

    /**
     * @return array<string, int>
     */
    private function stats(): array
    {
        return [
            'total' => Activity::query()->count(),
            'completed' => Activity::query()->where('status', ActivityStatus::Completed)->count(),
            'pending' => Activity::query()->where('status', ActivityStatus::Pending)->count(),
            'missed' => Activity::query()->where('status', ActivityStatus::Missed)->count(),
        ];
    }
}
