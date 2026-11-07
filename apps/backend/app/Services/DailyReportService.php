<?php

namespace App\Services;

use App\Enums\ActivityStatus;
use App\Enums\TimetableStatus;
use App\Models\Activity;
use App\Models\DailyReport;
use App\Models\SharedTimetableActivity;
use App\Models\User;
use Carbon\CarbonInterface;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class DailyReportService
{
    /**
     * Calculate the immutable daily performance score.
     *
     * The zero-scheduled edge case is recorded as 0.00% (not 100%) and the
     * result is always capped at 100.00%.
     */
    public static function calculateScore(int $completedCount, int $scheduledCount): float
    {
        if ($scheduledCount <= 0) {
            return 0.0;
        }

        return min(100.0, round(($completedCount / $scheduledCount) * 100, 2));
    }

    /**
     * Build an immutable snapshot of the user's personal and shared
     * timetable activities for the given date.
     *
     * @return array{items: array<int, array<string, mixed>>, completed_count: int, scheduled_count: int, calculated_score: float}
     */
    public function snapshot(User $user, CarbonInterface $date): array
    {
        $dateString = $date->toDateString();
        $groupIds = $user->groups()->pluck('groups.id')->all();

        $personalActivities = Activity::query()
            ->ownedBy($user)
            ->whereDate('scheduled_date', $dateString)
            ->orderBy('start_time')
            ->orderBy('id')
            ->get();

        $sharedActivities = SharedTimetableActivity::query()
            ->whereDate('activity_date', $dateString)
            ->whereHas('sharedTimetable', function ($query) use ($user, $groupIds): void {
                $query->where('status', TimetableStatus::Published)
                    ->where(function ($query) use ($user, $groupIds): void {
                        $query->whereHas('assignments', fn ($assignment) => $assignment->where('user_id', $user->id));

                        if ($groupIds !== []) {
                            $query->orWhereHas(
                                'assignments',
                                fn ($assignment) => $assignment->whereIn('group_id', $groupIds),
                            );
                        }
                    });
            })
            ->with(['completions' => fn ($query) => $query->where('user_id', $user->id)])
            ->orderBy('sort_order')
            ->orderBy('id')
            ->get();

        $items = [];
        $completedCount = 0;

        foreach ($personalActivities as $index => $activity) {
            $isCompleted = $activity->status === ActivityStatus::Completed;
            $completedCount += $isCompleted ? 1 : 0;

            $items[] = [
                'activity_id' => $activity->id,
                'activity_uuid' => $activity->uuid,
                'activity_title' => $activity->title,
                'activity_type' => $activity->activity_type,
                'activity_status' => $activity->status,
                'scheduled_date' => $activity->scheduled_date,
                'start_time' => $activity->start_time,
                'end_time' => $activity->end_time,
                'completed_at' => $isCompleted ? $activity->updated_at : null,
                'sort_order' => $index,
            ];
        }

        foreach ($sharedActivities as $index => $activity) {
            $completion = $activity->completions->first();
            $status = $completion?->status ?? ActivityStatus::Pending;
            $isCompleted = $status === ActivityStatus::Completed;
            $completedCount += $isCompleted ? 1 : 0;

            $items[] = [
                'activity_id' => null,
                'activity_uuid' => $activity->uuid,
                'activity_title' => $activity->title,
                'activity_type' => $activity->activity_type,
                'activity_status' => $status,
                'scheduled_date' => $activity->activity_date,
                'start_time' => $activity->start_time,
                'end_time' => $activity->end_time,
                'completed_at' => $completion?->completed_at,
                'sort_order' => $personalActivities->count() + $index,
            ];
        }

        $scheduledCount = count($items);

        return [
            'items' => $items,
            'completed_count' => $completedCount,
            'scheduled_count' => $scheduledCount,
            'calculated_score' => self::calculateScore($completedCount, $scheduledCount),
        ];
    }

    /**
     * Create or refresh a daily report and its activity snapshot.
     *
     * A report's score snapshot is frozen the moment it is first submitted.
     * Subsequent same-day edits only update the narrative fields, while any
     * edit to a previous day's submitted report is rejected.
     */
    public function submit(User $user, array $payload): DailyReport
    {
        $date = Carbon::parse($payload['report_date'])->startOfDay();
        $existing = DailyReport::query()
            ->ownedBy($user)
            ->forDate($date->toDateString())
            ->first();

        if ($existing !== null && $existing->submitted_at !== null && $date->lt(today())) {
            throw ValidationException::withMessages([
                'report_date' => ['Daily reports for previous days are locked.'],
            ]);
        }

        $isAlreadySubmitted = $existing?->submitted_at !== null;
        $snapshot = $isAlreadySubmitted ? null : $this->snapshot($user, $date);

        return DB::transaction(function () use ($user, $payload, $date, $existing, $snapshot, $isAlreadySubmitted): DailyReport {
            $report = $existing ?? new DailyReport;
            $report->fill([
                'summary' => $payload['summary'] ?? null,
                'self_assessment' => $payload['self_assessment'] ?? null,
                'client_created_at' => $payload['client_created_at'] ?? null,
                'client_updated_at' => $payload['client_updated_at'] ?? null,
            ]);

            if ($report->uuid === null && isset($payload['uuid'])) {
                $report->uuid = $payload['uuid'];
            }

            $report->user_id = $user->id;
            $report->report_date = $date->toDateString();

            if (! $isAlreadySubmitted && $snapshot !== null) {
                $this->applySnapshot($report, $snapshot);
                $report->submitted_at = now();
            }

            $report->server_version = ($report->server_version ?? 0) + 1;
            $report->synced_at = now();
            $report->save();

            if (! $isAlreadySubmitted && $snapshot !== null) {
                $this->replaceActivitySnapshot($report, $snapshot['items']);
            }

            return $report;
        });
    }

    /**
     * Update narrative fields without mutating an already frozen score snapshot.
     */
    public function update(DailyReport $report, array $payload): DailyReport
    {
        if ($report->report_date !== null && $report->report_date->lt(today())) {
            throw ValidationException::withMessages([
                'report_date' => ['Daily reports for previous days are locked.'],
            ]);
        }

        $shouldSnapshot = $report->submitted_at === null;
        $snapshot = $shouldSnapshot ? $this->snapshot($report->user, $report->report_date) : null;

        DB::transaction(function () use ($report, $payload, $snapshot, $shouldSnapshot): void {
            $report->fill([
                'summary' => $payload['summary'] ?? $report->summary,
                'self_assessment' => $payload['self_assessment'] ?? $report->self_assessment,
                'client_updated_at' => $payload['client_updated_at'] ?? $report->client_updated_at,
            ]);

            if ($shouldSnapshot && $snapshot !== null) {
                $this->applySnapshot($report, $snapshot);
                $report->submitted_at = now();
            }

            $report->server_version = ($report->server_version ?? 0) + 1;
            $report->synced_at = now();
            $report->save();

            if ($shouldSnapshot && $snapshot !== null) {
                $this->replaceActivitySnapshot($report, $snapshot['items']);
            }
        });

        return $report->refresh();
    }

    /**
     * @param  array{completed_count: int, scheduled_count: int, calculated_score: float}  $snapshot
     */
    private function applySnapshot(DailyReport $report, array $snapshot): void
    {
        $report->calculated_score = $snapshot['calculated_score'];
        $report->scheduled_count = $snapshot['scheduled_count'];
        $report->completed_count = $snapshot['completed_count'];

        // Keep the legacy columns synchronized for backward compatibility.
        $report->score = $snapshot['calculated_score'];
        $report->total_activities_count = $snapshot['scheduled_count'];
        $report->completed_activities_count = $snapshot['completed_count'];
    }

    /**
     * @param  array<int, array<string, mixed>>  $items
     */
    private function replaceActivitySnapshot(DailyReport $report, array $items): void
    {
        $report->activities()->delete();

        foreach ($items as $item) {
            $report->activities()->create([
                'activity_id' => $item['activity_id'],
                'activity_uuid' => $item['activity_uuid'],
                'activity_title' => $item['activity_title'],
                'activity_type' => $item['activity_type'],
                'activity_status' => $item['activity_status'],
                'scheduled_date' => $item['scheduled_date'],
                'start_time' => $item['start_time'],
                'end_time' => $item['end_time'],
                'completed_at' => $item['completed_at'],
                'sort_order' => $item['sort_order'],
            ]);
        }
    }
}
