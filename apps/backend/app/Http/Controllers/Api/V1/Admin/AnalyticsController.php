<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Enums\ActivityStatus;
use App\Enums\ActivityType;
use App\Http\Controllers\Controller;
use App\Http\Resources\AdminGroupResource;
use App\Http\Responses\ApiResponse;
use App\Models\Activity;
use App\Models\DailyReport;
use App\Models\Group;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class AnalyticsController extends Controller
{
    /**
     * Aggregate analytics for the selected reporting window.
     */
    public function index(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'range' => ['sometimes', 'integer', 'in:7,30,90'],
        ]);

        $range = (int) ($validated['range'] ?? 30);
        $from = now()->subDays($range)->startOfDay();
        $previousFrom = now()->subDays($range * 2)->startOfDay();
        $previousTo = now()->subDays($range)->startOfDay();

        $totalUsers = User::query()->count();
        $activeUsers = User::query()->where('is_active', true)->count();
        $activitiesLogged = Activity::query()->where('created_at', '>=', $from)->count();
        $previousActivities = Activity::query()
            ->whereBetween('created_at', [$previousFrom, $previousTo])
            ->count();
        $reportsSubmitted = DailyReport::query()->where('created_at', '>=', $from)->count();
        $previousReports = DailyReport::query()
            ->whereBetween('created_at', [$previousFrom, $previousTo])
            ->count();
        $averageCompletion = (float) (DailyReport::query()
            ->where('report_date', '>=', $from->toDateString())
            ->avg('calculated_score') ?? 0);

        $typeCounts = Activity::query()
            ->select('activity_type', DB::raw('count(*) as value'))
            ->where('created_at', '>=', $from)
            ->groupBy('activity_type')
            ->pluck('value', 'activity_type');

        $typeBreakdown = collect(ActivityType::cases())
            ->map(fn (ActivityType $type) => [
                'type' => $type->value,
                'value' => (int) ($typeCounts[$type->value] ?? 0),
            ])
            ->values();

        $topUsers = User::query()
            ->with('groups')
            ->withCount(['activities', 'dailyReports'])
            ->withAvg('dailyReports as average_score', 'calculated_score')
            ->orderByDesc('average_score')
            ->limit(5)
            ->get();

        $groupQuery = Group::query()->withCount('users')->limit(6)->get();
        $this->applyGroupMetrics($groupQuery);

        $bestDay = Activity::query()
            ->where('status', ActivityStatus::Completed)
            ->where('scheduled_date', '>=', $from->toDateString())
            ->selectRaw('scheduled_date, count(*) as total')
            ->groupBy('scheduled_date')
            ->orderByDesc('total')
            ->first();

        $mostConsistent = DB::table('group_user')
            ->join('daily_reports', 'daily_reports.user_id', '=', 'group_user.user_id')
            ->whereNull('daily_reports.deleted_at')
            ->where('daily_reports.report_date', '>=', now()->subDays(30)->toDateString())
            ->selectRaw('group_user.group_id, avg(daily_reports.calculated_score) as average_score')
            ->groupBy('group_user.group_id')
            ->orderByDesc('average_score')
            ->first();

        return ApiResponse::success([
            'range' => $range,
            'stats' => [
                'active_users' => $activeUsers,
                'total_users' => $totalUsers,
                'average_completion' => (int) round($averageCompletion),
                'activities_logged' => $activitiesLogged,
                'reports_submitted' => $reportsSubmitted,
                'activities_change' => $this->percentChange($activitiesLogged, $previousActivities),
                'reports_change' => $this->percentChange($reportsSubmitted, $previousReports),
            ],
            'type_breakdown' => $typeBreakdown,
            'completion_trend' => $this->completionTrend(),
            'activity_volume' => $this->activityVolume(),
            'top_users' => \App\Http\Resources\AdminUserResource::collection($topUsers),
            'groups' => AdminGroupResource::collection($groupQuery),
            'highlights' => [
                'most_consistent_group' => $mostConsistent === null
                    ? null
                    : Group::query()->find($mostConsistent->group_id)?->name,
                'most_consistent_score' => $mostConsistent === null
                    ? 0
                    : (int) round((float) $mostConsistent->average_score),
                'best_day' => $bestDay?->scheduled_date === null
                    ? null
                    : substr((string) $bestDay->scheduled_date, 0, 10),
                'best_day_count' => (int) ($bestDay->total ?? 0),
                'reports_awaiting_review' => DailyReport::query()->where('status', 'submitted')->count(),
            ],
        ], 'Analytics retrieved.');
    }

    /**
     * Stream an analytics summary CSV for the selected window.
     */
    public function export(Request $request): \Symfony\Component\HttpFoundation\StreamedResponse
    {
        $validated = $request->validate([
            'range' => ['sometimes', 'integer', 'in:7,30,90'],
        ]);

        $range = (int) ($validated['range'] ?? 30);
        $from = now()->subDays($range)->startOfDay();

        $rows = [];

        foreach (ActivityType::cases() as $type) {
            $rows[] = [
                $type->value,
                Activity::query()
                    ->where('activity_type', $type)
                    ->where('created_at', '>=', $from)
                    ->count(),
            ];
        }

        return \App\Support\Csv::download('analytics-last-'.$range.'-days-'.now()->format('Y-m-d').'.csv', [
            'Activity type', 'Activities logged',
        ], $rows);
    }

    /**
     * @return list<array{label: string, value: int, secondary: int}>
     */
    private function completionTrend(): array
    {
        $series = [];

        for ($index = 7; $index >= 0; $index--) {
            $start = now()->subWeeks($index)->startOfWeek();
            $end = $start->copy()->endOfWeek();

            $series[] = [
                'label' => 'W'.(8 - $index),
                'value' => (int) round((float) (DailyReport::query()
                    ->whereBetween('report_date', [$start->toDateString(), $end->toDateString()])
                    ->avg('calculated_score') ?? 0)),
                'secondary' => 0,
            ];
        }

        return $series;
    }

    /**
     * @return list<array{label: string, value: int, secondary: int}>
     */
    private function activityVolume(): array
    {
        $series = [];

        for ($index = 6; $index >= 0; $index--) {
            $date = today()->subDays($index);

            $series[] = [
                'label' => $date->format('D'),
                'value' => Activity::query()
                    ->whereDate('scheduled_date', $date)
                    ->where('status', ActivityStatus::Completed)
                    ->count(),
                'secondary' => Activity::query()
                    ->whereDate('scheduled_date', $date)
                    ->where('status', ActivityStatus::Missed)
                    ->count(),
            ];
        }

        return $series;
    }

    /**
     * @param  \Illuminate\Support\Collection<int, Group>  $groups
     */
    private function applyGroupMetrics(\Illuminate\Support\Collection $groups): void
    {
        $ids = $groups->pluck('id')->all();

        if ($ids === []) {
            return;
        }

        $progress = DB::table('group_user')
            ->join('daily_reports', 'daily_reports.user_id', '=', 'group_user.user_id')
            ->whereIn('group_user.group_id', $ids)
            ->whereNull('daily_reports.deleted_at')
            ->where('daily_reports.report_date', '>=', now()->subDays(30)->toDateString())
            ->selectRaw('group_user.group_id, avg(daily_reports.calculated_score) as average_score')
            ->groupBy('group_user.group_id')
            ->pluck('average_score', 'group_id');

        $activities = DB::table('group_user')
            ->join('activities', 'activities.user_id', '=', 'group_user.user_id')
            ->whereIn('group_user.group_id', $ids)
            ->whereNull('activities.deleted_at')
            ->selectRaw('group_user.group_id, count(*) as activities_count')
            ->groupBy('group_user.group_id')
            ->pluck('activities_count', 'group_id');

        foreach ($groups as $group) {
            $group->setAttribute('average_score', (float) ($progress[$group->id] ?? 0));
            $group->setAttribute('activities_count', (int) ($activities[$group->id] ?? 0));
        }
    }

    private function percentChange(int $current, int $previous): float
    {
        if ($previous === 0) {
            return $current > 0 ? 100.0 : 0.0;
        }

        return round((($current - $previous) / $previous) * 100, 1);
    }
}
