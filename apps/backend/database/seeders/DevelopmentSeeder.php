<?php

namespace Database\Seeders;

use App\Enums\ActivityStatus;
use App\Enums\ActivityType;
use App\Enums\GoalStatus;
use App\Enums\LibraryVisibility;
use App\Enums\SyncStatus;
use App\Enums\TimetableStatus;
use App\Enums\UserRole;
use App\Models\Activity;
use App\Models\ActivityComment;
use App\Models\ActivityReminder;
use App\Models\Bookmark;
use App\Models\DailyReport;
use App\Models\DailyReportActivity;
use App\Models\DailyReportComment;
use App\Models\DeviceToken;
use App\Models\ExerciseRecord;
use App\Models\Goal;
use App\Models\Group;
use App\Models\Habit;
use App\Models\HabitRecord;
use App\Models\JournalEntry;
use App\Models\LibraryResource;
use App\Models\LibraryResourcePermission;
use App\Models\SharedActivityCompletion;
use App\Models\SharedTimetable;
use App\Models\SharedTimetableActivity;
use App\Models\SharedTimetableAssignment;
use App\Models\SyncConflict;
use App\Models\SyncOperation;
use App\Models\User;
use App\Models\UserDevice;
use App\Models\UserPrayerPreference;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;

class DevelopmentSeeder extends Seeder
{
    /**
     * Seed realistic development data for local and testing environments.
     */
    public function run(): void
    {
        if (app()->isProduction()) {
            $this->command?->warn('Skipping development data seeding in production environment.');

            return;
        }

        $admin = $this->resolveAdministrator();
        $demo = $this->resolveDemoUser();

        $group = Group::firstOrCreate(
            ['uuid' => 'a0000000-0000-4000-8000-000000000001'],
            [
                'name' => 'Morning Routine Circle',
                'description' => 'A small accountability group focused on consistent morning worship and reading.',
                'leader_name' => 'Aisha Rahman',
                'color' => 'emerald',
                'created_by' => $admin->id,
                'client_created_at' => now(),
                'synced_at' => now(),
            ]
        );

        $group->users()->syncWithoutDetaching([
            $admin->id => ['assigned_by' => $admin->id, 'assigned_at' => now()],
            $demo->id => ['assigned_by' => $admin->id, 'assigned_at' => now()],
        ]);

        $timetable = SharedTimetable::firstOrCreate(
            ['uuid' => 'b0000000-0000-4000-8000-000000000001'],
            [
                'title' => 'Weekday Spiritual Growth Plan',
                'description' => 'A shared weekday plan covering prayer reflection, Quran reading, and an evening review.',
                'created_by' => $admin->id,
                'start_date' => today()->startOfWeek()->toDateString(),
                'end_date' => today()->endOfWeek()->toDateString(),
                'status' => TimetableStatus::Published,
                'client_created_at' => now(),
                'synced_at' => now(),
            ]
        );

        $sharedActivities = collect([
            [
                'uuid' => 'b0000000-0000-4000-8000-000000000002',
                'title' => 'Fajr reflection',
                'description' => 'Pray Fajr and write one intention for the day.',
                'activity_date' => today()->toDateString(),
                'start_time' => '05:15',
                'end_time' => '05:35',
                'sort_order' => 1,
            ],
            [
                'uuid' => 'b0000000-0000-4000-8000-000000000003',
                'title' => 'Quran reading',
                'description' => 'Read and reflect on one page.',
                'activity_date' => today()->toDateString(),
                'start_time' => '06:00',
                'end_time' => '06:30',
                'sort_order' => 2,
            ],
            [
                'uuid' => 'b0000000-0000-4000-8000-000000000004',
                'title' => 'Evening review',
                'description' => 'Review the day and prepare tomorrow.',
                'activity_date' => today()->toDateString(),
                'start_time' => '20:00',
                'end_time' => '20:20',
                'sort_order' => 3,
            ],
        ])->map(function (array $attributes) use ($timetable): SharedTimetableActivity {
            return SharedTimetableActivity::firstOrCreate(
                ['uuid' => $attributes['uuid']],
                [...$attributes, 'shared_timetable_id' => $timetable->id, 'synced_at' => now()]
            );
        });

        SharedTimetableAssignment::firstOrCreate(
            [
                'shared_timetable_id' => $timetable->id,
                'group_id' => $group->id,
            ],
            [
                'uuid' => 'b0000000-0000-4000-8000-000000000010',
                'assigned_by' => $admin->id,
                'assigned_at' => now(),
                'synced_at' => now(),
            ]
        );

        SharedTimetableAssignment::firstOrCreate(
            [
                'shared_timetable_id' => $timetable->id,
                'user_id' => $demo->id,
            ],
            [
                'uuid' => 'b0000000-0000-4000-8000-000000000011',
                'assigned_by' => $admin->id,
                'assigned_at' => now(),
                'synced_at' => now(),
            ]
        );

        SharedActivityCompletion::firstOrCreate(
            [
                'shared_timetable_activity_id' => $sharedActivities->first()->id,
                'user_id' => $demo->id,
            ],
            [
                'uuid' => 'b0000000-0000-4000-8000-000000000012',
                'status' => ActivityStatus::Completed,
                'completed_at' => now(),
                'notes' => 'Completed before leaving for work.',
                'client_updated_at' => now(),
                'synced_at' => now(),
            ]
        );

        $activities = collect([
            [
                'uuid' => 'c0000000-0000-4000-8000-000000000001',
                'title' => 'Fajr prayer',
                'description' => 'Pray Fajr on time.',
                'activity_type' => ActivityType::Prayer,
                'start_time' => '05:15',
                'end_time' => '05:35',
                'status' => ActivityStatus::Completed,
                'reminder_enabled' => true,
            ],
            [
                'uuid' => 'c0000000-0000-4000-8000-000000000002',
                'title' => 'Quran reading',
                'description' => 'Read one page with reflection.',
                'activity_type' => ActivityType::Quran,
                'start_time' => '06:00',
                'end_time' => '06:30',
                'status' => ActivityStatus::Completed,
                'reminder_enabled' => false,
            ],
            [
                'uuid' => 'c0000000-0000-4000-8000-000000000003',
                'title' => 'Morning run',
                'description' => 'Easy 5 km run.',
                'activity_type' => ActivityType::Exercise,
                'start_time' => '06:45',
                'end_time' => '07:20',
                'status' => ActivityStatus::Completed,
                'reminder_enabled' => false,
            ],
            [
                'uuid' => 'c0000000-0000-4000-8000-000000000004',
                'title' => 'Evening journaling',
                'description' => 'Write a short reflection before bed.',
                'activity_type' => ActivityType::Personal,
                'start_time' => '21:00',
                'end_time' => '21:20',
                'status' => ActivityStatus::Pending,
                'reminder_enabled' => true,
            ],
        ])->map(function (array $attributes) use ($demo): Activity {
            return Activity::firstOrCreate(
                ['uuid' => $attributes['uuid']],
                [
                    ...$attributes,
                    'user_id' => $demo->id,
                    'scheduled_date' => today()->toDateString(),
                    'synced_at' => now(),
                ]
            );
        });

        ActivityReminder::firstOrCreate(
            ['uuid' => 'c0000000-0000-4000-8000-000000000010'],
            [
                'activity_id' => $activities->firstWhere('activity_type', ActivityType::Prayer)->id,
                'user_id' => $demo->id,
                'reminder_at' => today()->setTime(5, 5),
                'is_enabled' => true,
                'synced_at' => now(),
            ]
        );

        $habit = Habit::firstOrCreate(
            ['uuid' => 'd0000000-0000-4000-8000-000000000001'],
            [
                'user_id' => $demo->id,
                'name' => 'Read 10 pages',
                'description' => 'Read at least ten pages of a beneficial book each day.',
                'is_active' => true,
                'client_created_at' => now(),
                'synced_at' => now(),
            ]
        );

        collect([
            ['uuid' => 'd0000000-0000-4000-8000-000000000002', 'days_ago' => 0, 'status' => ActivityStatus::Completed, 'notes' => 'Read after Fajr.'],
            ['uuid' => 'd0000000-0000-4000-8000-000000000003', 'days_ago' => 1, 'status' => ActivityStatus::Completed, 'notes' => null],
            ['uuid' => 'd0000000-0000-4000-8000-000000000004', 'days_ago' => 2, 'status' => ActivityStatus::Missed, 'notes' => 'Busy travel day.'],
        ])->each(function (array $attributes) use ($habit, $demo): void {
            HabitRecord::firstOrCreate(
                ['uuid' => $attributes['uuid']],
                [
                    'habit_id' => $habit->id,
                    'user_id' => $demo->id,
                    'record_date' => today()->subDays($attributes['days_ago'])->toDateString(),
                    'status' => $attributes['status'],
                    'notes' => $attributes['notes'],
                    'synced_at' => now(),
                ]
            );
        });

        Goal::firstOrCreate(
            ['uuid' => 'e0000000-0000-4000-8000-000000000001'],
            [
                'user_id' => $demo->id,
                'title' => 'Complete the Tafseer reading plan',
                'description' => 'Finish the selected Tafseer volume before the end of the quarter.',
                'target_date' => today()->addMonth()->toDateString(),
                'progress' => 35.00,
                'status' => GoalStatus::InProgress,
                'synced_at' => now(),
            ]
        );

        $journal = JournalEntry::firstOrCreate(
            ['uuid' => 'f0000000-0000-4000-8000-000000000001'],
            [
                'user_id' => $demo->id,
                'entry_date' => today()->toDateString(),
                'title' => 'A calm start',
                'content' => 'The morning felt calm and focused. I want to protect this routine and keep the evening review short.',
                'client_created_at' => now(),
                'synced_at' => now(),
            ]
        );

        $report = DailyReport::firstOrCreate(
            ['uuid' => 'f1000000-0000-4000-8000-000000000001'],
            [
                'user_id' => $demo->id,
                'report_date' => today()->toDateString(),
                'summary' => 'Completed the morning routine and the planned run.',
                'self_assessment' => 'Good focus in the morning; the evening review still needs work.',
                'score' => 75.00,
                'calculated_score' => 75.00,
                'scheduled_count' => 4,
                'completed_count' => 3,
                'completed_activities_count' => 3,
                'total_activities_count' => 4,
                'status' => 'submitted',
                'submitted_at' => now(),
                'synced_at' => now(),
            ]
        );

        $activities->each(function (Activity $activity, int $index) use ($report): void {
            DailyReportActivity::firstOrCreate(
                [
                    'daily_report_id' => $report->id,
                    'activity_id' => $activity->id,
                ],
                [
                    'activity_uuid' => $activity->uuid,
                    'activity_title' => $activity->title,
                    'activity_type' => $activity->activity_type,
                    'activity_status' => $activity->status,
                    'scheduled_date' => $activity->scheduled_date,
                    'start_time' => $activity->start_time,
                    'end_time' => $activity->end_time,
                    'completed_at' => $activity->status === ActivityStatus::Completed ? now() : null,
                    'sort_order' => $index + 1,
                ]
            );
        });

        DailyReportComment::firstOrCreate(
            ['uuid' => 'f1000000-0000-4000-8000-000000000002'],
            [
                'daily_report_id' => $report->id,
                'author_id' => $admin->id,
                'comment' => 'Strong consistency this week. Try moving the evening review earlier.',
            ]
        );

        ActivityComment::firstOrCreate(
            ['uuid' => 'f1000000-0000-4000-8000-000000000003'],
            [
                'activity_id' => $activities->firstWhere('activity_type', ActivityType::Quran)->id,
                'author_id' => $admin->id,
                'comment' => 'Keep the reflection notes with the reading; they are useful for the weekly review.',
            ]
        );

        $readingPlanPdf = <<<'PDF'
%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>
endobj
4 0 obj
<< /Length 74 >>
stream
BT /F1 20 Tf 72 720 Td (Ramadan Reading Plan) Tj ET
endstream
endobj
5 0 obj
<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>
endobj
trailer
<< /Size 6 /Root 1 0 R >>
%%EOF
PDF;

        Storage::disk('local')->put('library/ramadan-reading-plan.pdf', $readingPlanPdf);

        $assignedResource = LibraryResource::updateOrCreate(
            ['uuid' => 'c1000000-0000-4000-8000-000000000001'],
            [
                'title' => 'Ramadan Reading Plan',
                'description' => 'A group reading plan with daily targets and reflection prompts.',
                'category' => 'Quran',
                'file_name' => 'ramadan-reading-plan.pdf',
                'storage_disk' => 'local',
                'storage_path' => 'library/ramadan-reading-plan.pdf',
                'mime_type' => 'application/pdf',
                'file_size' => strlen($readingPlanPdf),
                'uploaded_by' => $admin->id,
                'visibility' => LibraryVisibility::Assigned,
                'status' => 'active',
                'synced_at' => now(),
            ]
        );

        LibraryResourcePermission::firstOrCreate(
            ['uuid' => 'c1000000-0000-4000-8000-000000000002'],
            [
                'library_resource_id' => $assignedResource->id,
                'group_id' => $group->id,
            ]
        );

        $reflectionTemplate = "# Weekly Reflection Template\n\n"
            ."Use this template at the end of each week to review your progress.\n\n"
            ."## What went well?\n\n- \n\n"
            ."## What could improve?\n\n- \n\n"
            ."## Focus for next week\n\n- \n";

        Storage::disk('local')->put('library/weekly-reflection-template.md', $reflectionTemplate);

        $publicResource = LibraryResource::updateOrCreate(
            ['uuid' => 'c1000000-0000-4000-8000-000000000003'],
            [
                'title' => 'Weekly Reflection Template',
                'description' => 'A simple template for the weekly personal review.',
                'category' => 'Planning',
                'file_name' => 'weekly-reflection-template.md',
                'storage_disk' => 'local',
                'storage_path' => 'library/weekly-reflection-template.md',
                'mime_type' => 'text/markdown',
                'file_size' => strlen($reflectionTemplate),
                'uploaded_by' => $admin->id,
                'visibility' => LibraryVisibility::Public,
                'status' => 'active',
                'synced_at' => now(),
            ]
        );

        Bookmark::firstOrCreate(
            ['uuid' => 'c1000000-0000-4000-8000-000000000004'],
            [
                'user_id' => $demo->id,
                'library_resource_id' => $publicResource->id,
                'synced_at' => now(),
            ]
        );

        ExerciseRecord::firstOrCreate(
            ['uuid' => 'c2000000-0000-4000-8000-000000000001'],
            [
                'user_id' => $demo->id,
                'exercise_type' => 'running',
                'title' => 'Morning 5K',
                'duration_minutes' => 32,
                'distance' => 5.20,
                'calories_burned' => 320,
                'notes' => 'Easy pace through the park.',
                'recorded_at' => today()->setTime(6, 45),
                'synced_at' => now(),
            ]
        );

        UserPrayerPreference::firstOrCreate(
            ['uuid' => 'c3000000-0000-4000-8000-000000000001'],
            [
                'user_id' => $demo->id,
                'latitude' => 24.7136,
                'longitude' => 46.6753,
                'timezone' => 'Asia/Riyadh',
                'calculation_method' => 'muslim_world_league',
                'notifications_enabled' => true,
                'synced_at' => now(),
            ]
        );

        $device = UserDevice::firstOrCreate(
            ['uuid' => 'c4000000-0000-4000-8000-000000000001'],
            [
                'user_id' => $demo->id,
                'device_name' => 'Pixel 9',
                'platform' => 'android',
                'last_sync_at' => now(),
                'is_active' => true,
                'synced_at' => now(),
            ]
        );

        DeviceToken::firstOrCreate(
            ['device_token' => 'demo-device-token'],
            [
                'user_id' => $demo->id,
                'device_type' => 'android',
                'device_identifier' => 'demo-device-001',
                'is_active' => true,
                'last_used_at' => now(),
            ]
        );

        SyncOperation::firstOrCreate(
            ['operation_uuid' => 'c5000000-0000-4000-8000-000000000001'],
            [
                'user_id' => $demo->id,
                'device_id' => $device->id,
                'entity_type' => 'activity',
                'entity_uuid' => $activities->first()->uuid,
                'operation_type' => 'create',
                'status' => SyncStatus::Synced,
                'processed_at' => now(),
            ]
        );

        SyncConflict::firstOrCreate(
            ['conflict_uuid' => 'c6000000-0000-4000-8000-000000000001'],
            [
                'user_id' => $demo->id,
                'entity_type' => 'journal_entries',
                'entity_uuid' => $journal->uuid,
                'client_version' => 2,
                'server_version' => 3,
                'client_payload' => [
                    'title' => 'A calm start',
                    'content' => 'A local draft that was written before the last sync.',
                ],
                'server_payload' => [
                    'title' => 'A calm start',
                    'content' => $journal->content,
                ],
                'resolution_status' => 'pending',
            ]
        );
    }

    private function resolveAdministrator(): User
    {
        $admin = User::where('role', UserRole::Admin->value)->first();

        if ($admin !== null) {
            return $admin;
        }

        $this->call(AdminUserSeeder::class);

        return User::where('role', UserRole::Admin->value)->firstOrFail();
    }

    private function resolveDemoUser(): User
    {
        $demo = User::firstOrCreate(
            ['email' => 'user@thinkcode.dev'],
            [
                'name' => 'Demo User',
                'password' => Hash::make('password'),
                'role' => UserRole::User,
                'is_active' => true,
            ]
        );

        if ($demo->email_verified_at === null) {
            $demo->forceFill(['email_verified_at' => now()])->save();
        }

        return $demo;
    }
}
