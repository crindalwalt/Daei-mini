<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Enums\ActivityStatus;
use App\Enums\TimetableStatus;
use App\Http\Controllers\Controller;
use App\Http\Resources\AdminUserResource;
use App\Http\Resources\DailyReportResource;
use App\Http\Responses\ApiResponse;
use App\Models\Activity;
use App\Models\DailyReport;
use App\Models\Group;
use App\Models\SharedTimetable;
use App\Models\User;
use Illuminate\Http\JsonResponse;

class DashboardController extends Controller
{
    /**
     * Aggregate the community dashboard snapshot.
     */
    public function index(): JsonResponse
    {
        $users = User::query()->count();
        $groups = Group::query()->count();
        $reports = DailyReport::query()->count();
        $activeTimetables = SharedTimetable::query()
            ->where('status', TimetableStatus::Published)
            ->count();
        $newUsers = User::query()->where('created_at', '>=', now()->subDays(30))->count();
        $activeGroups = $this->activeGroups(30);
        $reportingUsers = User::query()->whereHas('dailyReports', function ($query): void {
            $query->whereDate('report_date', '>=', today()->subDays(30));
        })->count();

        $recentUsers = User::query()
            ->with('groups')
            ->withCount(['activities', 'dailyReports'])
            ->withAvg('dailyReports as average_score', 'calculated_score')
            ->latest()
            ->limit(5)
            ->get();

        $recentReports = DailyReport::query()
            ->with('user')
            ->withCount('comments')
            ->orderByDesc('report_date')
            ->orderByDesc('id')
            ->limit(5)
            ->get();

        $completed = Activity::query()->where('status', ActivityStatus::Completed)->count();
        $pending = Activity::query()->where('status', ActivityStatus::Pending)->count();
        $missed = Activity::query()->where('status', ActivityStatus::Missed)->count();
        $totalActivitiesForRate = max(1, $completed + $pending + $missed);

        return ApiResponse::success([
            'stats' => [
                $this->stat('Total Users', $users, $this->change(
                    $newUsers,
                    User::query()->whereBetween('created_at', [now()->subDays(60), now()->subDays(30)])->count(),
                ), $this->monthlySeries(User::class)),
                $this->stat('Total Groups', $groups, $this->change(
                    Group::query()->where('created_at', '>=', now()->subDays(30))->count(),
                    Group::query()->whereBetween('created_at', [now()->subDays(60), now()->subDays(30)])->count(),
                ), $this->monthlySeries(Group::class)),
                $this->stat('Total Reports', $reports, $this->change(
                    DailyReport::query()->where('created_at', '>=', now()->subDays(30))->count(),
                    DailyReport::query()->whereBetween('created_at', [now()->subDays(60), now()->subDays(30)])->count(),
                ), $this->monthlySeries(DailyReport::class)),
                $this->stat('Active Timetables', $activeTimetables, $this->change(
                    SharedTimetable::query()->where('created_at', '>=', now()->subDays(30))->count(),
                    SharedTimetable::query()->whereBetween('created_at', [now()->subDays(60), now()->subDays(30)])->count(),
                ), $this->monthlySeries(SharedTimetable::class)),
            ],
            'progress_overview' => [
                'user_growth' => $users > 0
                    ? min(100, (int) round(($newUsers / $users) * 100))
                    : 0,
                'group_activity' => $groups > 0
                    ? min(100, (int) round(($activeGroups / $groups) * 100))
                    : 0,
                'report_generation' => $users > 0
                    ? min(100, (int) round(($reportingUsers / $users) * 100))
                    : 0,
            ],
            'completion' => [
                'rate' => (int) round(($completed / $totalActivitiesForRate) * 100),
                'completed' => $completed,
                'in_progress' => $pending,
                'missed' => $missed,
            ],
            'recent_users' => AdminUserResource::collection($recentUsers),
            'recent_reports' => DailyReportResource::collection($recentReports),
            'charts' => [
                'weekly' => $this->dailySeries(7),
                'monthly' => $this->bucketSeries(6, 5),
            ],
            'pending_reports' => DailyReport::query()->where('status', 'submitted')->count(),
            'reports_processed' => DailyReport::query()->whereIn('status', ['reviewed', 'flagged'])->count(),
            'average_score' => round((float) (DailyReport::query()->avg('calculated_score') ?? 0), 1),
        ], 'Dashboard retrieved.');
    }

    /**
     * @param  array{0: float, 1: string}  $change
     * @param  list<int>  $series
     * @return array{label: string, value: int, change: float, trend: string, series: list<int>}
     */
    private function stat(string $label, int $value, array $change, array $series): array
    {
        return [
            'label' => $label,
            'value' => $value,
            'change' => $change[0],
            'trend' => $change[1],
            'series' => $series,
        ];
    }

    /**
     * Count the groups whose members logged an activity in the given window.
     */
    private function activeGroups(int $days): int
    {
        return Group::query()
            ->whereHas('users.activities', function ($query) use ($days): void {
                $query->whereDate('scheduled_date', '>=', today()->subDays($days));
            })
            ->count();
    }

    /**
     * Build a six-month cumulative trend for a model.
     *
     * @param  class-string<\Illuminate\Database\Eloquent\Model>  $model
     * @return list<int>
     */
    private function monthlySeries(string $model): array
    {
        $series = [];

        for ($index = 5; $index >= 0; $index--) {
            $end = $index === 0 ? now() : now()->subMonths($index)->endOfMonth();
            $series[] = (int) $model::query()->where('created_at', '<=', $end)->count();
        }

        return $series;
    }

    /**
     * @return array{0: float, 1: string}
     */
    private function change(int $current, int $previous): array
    {
        if ($previous === 0) {
            return [$current > 0 ? 100.0 : 0.0, 'up'];
        }

        $change = round((($current - $previous) / $previous) * 100, 1);

        return [abs($change), $change >= 0 ? 'up' : 'down'];
    }

    /**
     * Build a daily completed/missed series.
     *
     * @return list<array{label: string, value: int, secondary: int}>
     */
    private function dailySeries(int $days): array
    {
        $start = today()->subDays($days - 1);
        $rows = Activity::query()
            ->whereDate('scheduled_date', '>=', $start)
            ->selectRaw('scheduled_date, status, count(*) as total')
            ->groupBy('scheduled_date', 'status')
            ->get();

        $byDate = [];

        foreach ($rows as $row) {
            $date = substr((string) $row->scheduled_date, 0, 10);
            $status = $row->status instanceof ActivityStatus ? $row->status->value : (string) $row->status;
            $byDate[$date][$status] = (int) $row->total;
        }

        $series = [];

        for ($index = 0; $index < $days; $index++) {
            $date = $start->copy()->addDays($index);
            $key = $date->toDateString();
            $series[] = [
                'label' => $date->format('D'),
                'value' => $byDate[$key][ActivityStatus::Completed->value] ?? 0,
                'secondary' => $byDate[$key][ActivityStatus::Missed->value] ?? 0,
            ];
        }

        return $series;
    }

    /**
     * Build a bucketed series for longer ranges.
     *
     * @return list<array{label: string, value: int, secondary: int}>
     */
    private function bucketSeries(int $buckets, int $bucketDays): array
    {
        $series = [];
        $end = today();

        for ($index = $buckets - 1; $index >= 0; $index--) {
            $start = $end->copy()->subDays(($index + 1) * $bucketDays - 1);
            $finish = $end->copy()->subDays($index * $bucketDays);

            $completed = Activity::query()
                ->whereDate('scheduled_date', '>=', $start->toDateString())
                ->whereDate('scheduled_date', '<=', $finish->toDateString())
                ->where('status', ActivityStatus::Completed)
                ->count();
            $missed = Activity::query()
                ->whereDate('scheduled_date', '>=', $start->toDateString())
                ->whereDate('scheduled_date', '<=', $finish->toDateString())
                ->where('status', ActivityStatus::Missed)
                ->count();

            $series[] = [
                'label' => $start->format('M j'),
                'value' => $completed,
                'secondary' => $missed,
            ];
        }

        return $series;
    }
}
