<?php

namespace App\Http\Controllers\Api\V1;

use App\Enums\NotificationType;
use App\Http\Controllers\Controller;
use App\Http\Requests\StoreDailyReportCommentRequest;
use App\Http\Requests\StoreDailyReportRequest;
use App\Http\Requests\UpdateDailyReportRequest;
use App\Http\Resources\DailyReportCommentResource;
use App\Http\Resources\DailyReportResource;
use App\Http\Responses\ApiResponse;
use App\Models\DailyReport;
use App\Models\DailyReportComment;
use App\Models\Notification;
use App\Services\DailyReportService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

class DailyReportController extends Controller
{
    public function __construct(private readonly DailyReportService $reports) {}

    public function index(Request $request): JsonResponse
    {
        $request->validate([
            'user_id' => ['sometimes', 'integer', 'exists:users,id'],
            'all' => ['sometimes', 'boolean'],
            'from' => ['sometimes', 'date'],
            'to' => ['sometimes', 'date', 'after_or_equal:from'],
            'per_page' => ['sometimes', 'integer', 'between:1,100'],
        ]);

        $user = $request->user();
        $query = DailyReport::query()->orderByDesc('report_date');

        if ($user->isAdmin() && $request->boolean('all')) {
            if ($request->filled('user_id')) {
                $query->where('user_id', $request->integer('user_id'));
            }
        } else {
            $query->ownedBy($user);
        }

        if ($request->filled('from')) {
            $query->whereDate('report_date', '>=', $request->date('from')->toDateString());
        }

        if ($request->filled('to')) {
            $query->whereDate('report_date', '<=', $request->date('to')->toDateString());
        }

        $paginator = $query->paginate((int) $request->integer('per_page', 20));

        return ApiResponse::paginated(
            $paginator,
            DailyReportResource::collection($paginator->items()),
            'Daily reports retrieved.',
        );
    }

    public function store(StoreDailyReportRequest $request): JsonResponse
    {
        $report = $this->reports->submit($request->user(), $request->validated());

        return ApiResponse::success(
            new DailyReportResource($report->load(['activities', 'comments.author'])),
            'Daily report submitted.',
            201,
        );
    }

    public function show(Request $request, DailyReport $dailyReport): JsonResponse
    {
        $this->ensureCanView($request, $dailyReport);

        return ApiResponse::success(
            new DailyReportResource($dailyReport->load(['activities', 'comments.author'])),
        );
    }

    public function update(UpdateDailyReportRequest $request, DailyReport $dailyReport): JsonResponse
    {
        abort_unless($dailyReport->user_id === $request->user()->id, 404);

        $report = $this->reports->update($dailyReport, $request->validated());

        return ApiResponse::success(
            new DailyReportResource($report->load(['activities', 'comments.author'])),
            'Daily report updated.',
        );
    }

    public function destroy(Request $request, DailyReport $dailyReport): JsonResponse
    {
        abort_unless($dailyReport->user_id === $request->user()->id, 404);

        if ($dailyReport->submitted_at !== null && $dailyReport->report_date?->lt(today())) {
            throw ValidationException::withMessages([
                'report_date' => ['Daily reports for previous days are locked.'],
            ]);
        }

        $dailyReport->delete();

        return ApiResponse::success(null, 'Daily report deleted.');
    }

    public function comments(Request $request, DailyReport $dailyReport): JsonResponse
    {
        $this->ensureCanView($request, $dailyReport);

        return ApiResponse::success(
            DailyReportCommentResource::collection(
                $dailyReport->comments()->with('author')->orderBy('created_at')->get(),
            ),
            'Daily report comments retrieved.',
        );
    }

    public function storeComment(
        StoreDailyReportCommentRequest $request,
        DailyReport $dailyReport,
    ): JsonResponse {
        $comment = $dailyReport->comments()->create([
            'author_id' => $request->user()->id,
            'comment' => $request->string('comment')->toString(),
        ]);

        if ($dailyReport->user_id !== $request->user()->id) {
            Notification::create([
                'user_id' => $dailyReport->user_id,
                'type' => NotificationType::DailyReportComment,
                'title' => 'New feedback on your daily report',
                'body' => 'An administrator commented on your report for '.$dailyReport->report_date?->toDateString().'.',
                'data' => [
                    'daily_report_id' => $dailyReport->id,
                    'daily_report_uuid' => $dailyReport->uuid,
                ],
                'sent_at' => now(),
            ]);
        }

        return ApiResponse::success(
            new DailyReportCommentResource($comment->load('author')),
            'Comment added.',
            201,
        );
    }

    public function destroyComment(
        Request $request,
        DailyReport $dailyReport,
        DailyReportComment $comment,
    ): JsonResponse {
        abort_unless($comment->daily_report_id === $dailyReport->id, 404);
        abort_unless(
            $request->user()->isAdmin() || $comment->author_id === $request->user()->id,
            403,
        );

        $comment->delete();

        return ApiResponse::success(null, 'Comment deleted.');
    }

    private function ensureCanView(Request $request, DailyReport $dailyReport): void
    {
        abort_unless(
            $request->user()->isAdmin() || $dailyReport->user_id === $request->user()->id,
            404,
        );
    }
}
