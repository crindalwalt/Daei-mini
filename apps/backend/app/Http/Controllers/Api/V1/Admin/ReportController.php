<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreDailyReportCommentRequest;
use App\Http\Resources\AdminReportCommentResource;
use App\Http\Resources\AdminUserResource;
use App\Http\Resources\DailyReportResource;
use App\Http\Responses\ApiResponse;
use App\Models\DailyReport;
use App\Models\Notification;
use App\Enums\NotificationType;
use App\Support\Csv;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\StreamedResponse;

class ReportController extends Controller
{
    /**
     * List daily reports with server-side search, status and date filters.
     */
    public function index(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'q' => ['sometimes', 'nullable', 'string', 'max:255'],
            'status' => ['sometimes', 'nullable', 'in:submitted,reviewed,flagged'],
            'date' => ['sometimes', 'nullable', 'date'],
            'user_id' => ['sometimes', 'nullable', 'integer', 'exists:users,id'],
            'per_page' => ['sometimes', 'integer', 'between:1,100'],
        ]);

        $query = $this->filteredQuery($validated);
        $paginator = $query->paginate((int) ($validated['per_page'] ?? 15));

        return ApiResponse::success([
            'items' => DailyReportResource::collection($paginator->items()),
            'stats' => $this->stats(),
        ], 'Daily reports retrieved.', 200, [
            'current_page' => $paginator->currentPage(),
            'per_page' => $paginator->perPage(),
            'total' => $paginator->total(),
            'last_page' => $paginator->lastPage(),
        ]);
    }

    /**
     * Show a report with its activity snapshot, member and comments.
     */
    public function show(DailyReport $report): JsonResponse
    {
        $report->load(['user.groups', 'activities'])
            ->loadCount('comments');

        $report->user?->loadCount(['activities', 'dailyReports']);
        $report->user?->setAttribute(
            'average_score',
            (float) ($report->user?->dailyReports()->avg('calculated_score') ?? 0),
        );

        $comments = $report->comments()->with('author')->orderBy('created_at')->get();

        return ApiResponse::success([
            'report' => new DailyReportResource($report),
            'member' => $report->user === null ? null : new AdminUserResource($report->user),
            'comments' => AdminReportCommentResource::collection($comments),
        ], 'Daily report retrieved.');
    }

    /**
     * Move a report through its review workflow.
     */
    public function updateStatus(Request $request, DailyReport $report): JsonResponse
    {
        $validated = $request->validate([
            'status' => ['required', 'in:submitted,reviewed,flagged'],
        ]);

        $report->forceFill([
            'status' => $validated['status'],
            'reviewed_at' => $validated['status'] === 'reviewed' ? now() : null,
        ])->save();

        $report->load(['user.groups', 'activities'])->loadCount('comments');

        return ApiResponse::success([
            'report' => new DailyReportResource($report),
        ], 'Report status updated.');
    }

    /**
     * Add administrator feedback to a report and notify its author.
     */
    public function storeComment(StoreDailyReportCommentRequest $request, DailyReport $report): JsonResponse
    {
        $comment = $report->comments()->create([
            'author_id' => $request->user()->id,
            'comment' => $request->string('comment')->toString(),
        ]);

        if ($report->user_id !== $request->user()->id) {
            Notification::create([
                'user_id' => $report->user_id,
                'type' => NotificationType::DailyReportComment,
                'title' => 'New feedback on your daily report',
                'body' => 'An administrator commented on your report for '.$report->report_date?->toDateString().'.',
                'data' => [
                    'daily_report_id' => $report->id,
                    'daily_report_uuid' => $report->uuid,
                ],
                'sent_at' => now(),
            ]);
        }

        return ApiResponse::success(
            new AdminReportCommentResource($comment->load('author')),
            'Comment added.',
            201,
        );
    }

    /**
     * Stream the filtered report list as a CSV download.
     */
    public function export(Request $request): StreamedResponse
    {
        $validated = $request->validate([
            'q' => ['sometimes', 'nullable', 'string', 'max:255'],
            'status' => ['sometimes', 'nullable', 'in:submitted,reviewed,flagged'],
            'date' => ['sometimes', 'nullable', 'date'],
            'user_id' => ['sometimes', 'nullable', 'integer', 'exists:users,id'],
        ]);

        $query = $this->filteredQuery($validated);

        $rows = function () use ($query): \Generator {
            foreach ($query->lazy(500) as $report) {
                yield [
                    $report->id,
                    $report->report_date?->toDateString(),
                    $report->user?->name ?? '',
                    $report->user?->email ?? '',
                    (int) $report->completed_count,
                    (int) $report->scheduled_count,
                    number_format((float) ($report->calculated_score ?? 0), 2),
                    $report->status ?? 'submitted',
                    (int) ($report->comments_count ?? 0),
                    $report->summary ?? '',
                ];
            }
        };

        return Csv::download('daily-reports-'.now()->format('Y-m-d').'.csv', [
            'ID', 'Report date', 'Member', 'Email', 'Completed', 'Scheduled', 'Score', 'Status', 'Comments', 'Summary',
        ], $rows());
    }

    /**
     * @param  array<string, mixed>  $filters
     * @return Builder<DailyReport>
     */
    private function filteredQuery(array $filters): Builder
    {
        return DailyReport::query()
            ->with('user')
            ->withCount('comments')
            ->when($filters['q'] ?? null, function (Builder $query, string $search): void {
                $like = '%'.str_replace(['%', '_'], ['\%', '\_'], trim($search)).'%';

                $query->where(function (Builder $query) use ($like): void {
                    $query->where('summary', 'like', $like)
                        ->orWhere('self_assessment', 'like', $like)
                        ->orWhereHas('user', function (Builder $user) use ($like): void {
                            $user->where('name', 'like', $like)
                                ->orWhere('email', 'like', $like);
                        });
                });
            })
            ->when($filters['status'] ?? null, fn (Builder $query, string $status) => $query->where('status', $status))
            ->when($filters['date'] ?? null, fn (Builder $query, string $date) => $query->whereDate('report_date', $date))
            ->when($filters['user_id'] ?? null, fn (Builder $query, int|string $userId) => $query->where('user_id', $userId))
            ->orderByDesc('report_date')
            ->orderByDesc('id');
    }

    /**
     * @return array<string, mixed>
     */
    private function stats(): array
    {
        $scored = DailyReport::query()->where('scheduled_count', '>', 0)->avg('calculated_score');

        return [
            'average' => round((float) ($scored ?? 0), 1),
            'submitted' => DailyReport::query()->where('status', 'submitted')->count(),
            'reviewed' => DailyReport::query()->where('status', 'reviewed')->count(),
            'flagged' => DailyReport::query()->where('status', 'flagged')->count(),
        ];
    }
}
