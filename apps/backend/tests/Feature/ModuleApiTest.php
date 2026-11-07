<?php

namespace Tests\Feature;

use App\Enums\ActivityStatus;
use App\Enums\ActivityType;
use App\Enums\GoalStatus;
use App\Enums\LibraryVisibility;
use App\Enums\NotificationType;
use App\Models\Activity;
use App\Models\Habit;
use App\Models\LibraryResource;
use App\Models\Notification;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class ModuleApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_user_can_create_and_list_personal_activities(): void
    {
        $user = User::factory()->create();
        Sanctum::actingAs($user);

        $response = $this->postJson('/api/v1/activities', [
            'title' => 'Morning run',
            'activity_type' => ActivityType::Exercise->value,
            'scheduled_date' => today()->toDateString(),
            'start_time' => '07:00',
            'end_time' => '08:00',
        ]);

        $response->assertStatus(201)
            ->assertJsonPath('data.title', 'Morning run')
            ->assertJsonPath('data.activity_type', ActivityType::Exercise->value)
            ->assertJsonPath('data.status', ActivityStatus::Pending->value);

        $this->getJson('/api/v1/activities')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.title', 'Morning run');
    }

    public function test_activity_ownership_is_enforced(): void
    {
        $owner = User::factory()->create();
        $other = User::factory()->create();

        $activity = Activity::create([
            'user_id' => $owner->id,
            'title' => 'Private activity',
            'activity_type' => ActivityType::Personal,
            'scheduled_date' => today()->toDateString(),
            'status' => ActivityStatus::Pending,
        ]);

        Sanctum::actingAs($other);

        $this->getJson('/api/v1/activities/'.$activity->id)->assertNotFound();
        $this->deleteJson('/api/v1/activities/'.$activity->id)->assertNotFound();
    }

    public function test_activity_reminders_are_created_with_channels(): void
    {
        $user = User::factory()->create();
        Sanctum::actingAs($user);

        $activity = Activity::create([
            'user_id' => $user->id,
            'title' => 'Quran revision',
            'activity_type' => ActivityType::Quran,
            'scheduled_date' => today()->toDateString(),
            'status' => ActivityStatus::Pending,
        ]);

        $this->postJson('/api/v1/activities/'.$activity->id.'/reminders', [
            'reminder_at' => now()->addHour()->toIso8601String(),
            'channel' => 'push',
        ])->assertStatus(201)
            ->assertJsonPath('data.channel', 'push');

        $this->getJson('/api/v1/activities/'.$activity->id.'/reminders')
            ->assertOk()
            ->assertJsonCount(1, 'data');
    }

    public function test_habit_toggle_and_streak_tracking(): void
    {
        $user = User::factory()->create();
        Sanctum::actingAs($user);

        $habitId = $this->postJson('/api/v1/habits', [
            'name' => 'Read Quran',
        ])->assertStatus(201)->json('data.id');

        $this->postJson('/api/v1/habits/'.$habitId.'/toggle', [])
            ->assertOk()
            ->assertJsonPath('data.completed_today', true)
            ->assertJsonPath('data.streak', 1);

        $this->getJson('/api/v1/habits/'.$habitId.'/streak')
            ->assertOk()
            ->assertJsonPath('data.streak', 1);

        $this->postJson('/api/v1/habits/'.$habitId.'/toggle', [])
            ->assertOk()
            ->assertJsonPath('data.completed_today', false);

        $this->assertSame(1, Habit::query()->whereKey($habitId)->firstOrFail()->records()->count());
    }

    public function test_goal_progress_completion_creates_notification(): void
    {
        $user = User::factory()->create();
        Sanctum::actingAs($user);

        $goalId = $this->postJson('/api/v1/goals', [
            'title' => 'Finish the sprint',
        ])->assertStatus(201)
            ->assertJsonPath('data.status', GoalStatus::NotStarted->value)
            ->json('data.id');

        $this->patchJson('/api/v1/goals/'.$goalId.'/progress', [
            'progress' => 100,
        ])->assertOk()
            ->assertJsonPath('data.status', GoalStatus::Completed->value)
            ->assertJsonPath('data.progress', 100);

        $this->assertDatabaseHas('notifications', [
            'user_id' => $user->id,
            'type' => NotificationType::GoalAchieved->value,
        ]);
    }

    public function test_daily_report_score_uses_completed_over_scheduled(): void
    {
        $user = User::factory()->create();
        Sanctum::actingAs($user);

        Activity::create([
            'user_id' => $user->id,
            'title' => 'Completed activity',
            'activity_type' => ActivityType::Prayer,
            'scheduled_date' => today()->toDateString(),
            'status' => ActivityStatus::Completed,
        ]);

        Activity::create([
            'user_id' => $user->id,
            'title' => 'Pending activity',
            'activity_type' => ActivityType::Reading,
            'scheduled_date' => today()->toDateString(),
            'status' => ActivityStatus::Pending,
        ]);

        $response = $this->postJson('/api/v1/daily-reports', [
            'report_date' => today()->toDateString(),
            'summary' => 'Good day',
        ]);

        $response->assertStatus(201)
            ->assertJsonPath('data.completed_activities_count', 1)
            ->assertJsonPath('data.total_activities_count', 2);

        $this->assertEqualsWithDelta(50.0, $response->json('data.score'), 0.01);
        $response->assertJsonCount(2, 'data.activities');
    }

    public function test_shared_timetable_flow_assignment_completion_and_report(): void
    {
        $admin = User::factory()->admin()->create();
        $user = User::factory()->create();

        Sanctum::actingAs($admin);

        $timetableId = $this->postJson('/api/v1/shared-timetables', [
            'title' => 'Ramadan plan',
            'start_date' => today()->toDateString(),
            'end_date' => today()->addWeek()->toDateString(),
        ])->assertStatus(201)->json('data.id');

        $activityId = $this->postJson('/api/v1/shared-timetables/'.$timetableId.'/activities', [
            'title' => 'Taraweeh',
            'activity_type' => ActivityType::Prayer->value,
            'activity_date' => today()->toDateString(),
        ])->assertStatus(201)->json('data.id');

        $this->postJson('/api/v1/shared-timetables/'.$timetableId.'/assignments', [
            'user_id' => $user->id,
        ])->assertStatus(201);

        $this->postJson('/api/v1/shared-timetables/'.$timetableId.'/publish')
            ->assertOk()
            ->assertJsonPath('data.status', 'published');

        $this->assertDatabaseHas('notifications', [
            'user_id' => $user->id,
            'type' => NotificationType::SharedActivityAssigned->value,
        ]);

        Sanctum::actingAs($user);

        $this->getJson('/api/v1/shared-timetables/'.$timetableId)
            ->assertOk()
            ->assertJsonCount(1, 'data.activities');

        $this->postJson(
            '/api/v1/shared-timetables/'.$timetableId.'/activities/'.$activityId.'/completions',
            ['status' => ActivityStatus::Completed->value],
        )->assertStatus(201)
            ->assertJsonPath('data.status', ActivityStatus::Completed->value);

        $report = $this->postJson('/api/v1/daily-reports', [
            'report_date' => today()->toDateString(),
        ]);

        $report->assertStatus(201)
            ->assertJsonPath('data.completed_activities_count', 1)
            ->assertJsonPath('data.total_activities_count', 1);

        $this->assertEqualsWithDelta(100.0, $report->json('data.score'), 0.01);
    }

    public function test_non_admin_cannot_write_shared_timetables(): void
    {
        Sanctum::actingAs(User::factory()->create());

        $this->postJson('/api/v1/shared-timetables', [
            'title' => 'Unauthorized plan',
            'start_date' => today()->toDateString(),
            'end_date' => today()->addWeek()->toDateString(),
        ])->assertForbidden();
    }

    public function test_library_visibility_and_bookmarks(): void
    {
        $admin = User::factory()->admin()->create();
        $user = User::factory()->create();

        $public = $this->createLibraryResource($admin, LibraryVisibility::Public, 'Public guide');
        $private = $this->createLibraryResource($admin, LibraryVisibility::Private, 'Private notes');

        Sanctum::actingAs($user);

        $this->getJson('/api/v1/library')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $public->id);

        $this->getJson('/api/v1/library/'.$private->id)->assertNotFound();

        $this->postJson('/api/v1/bookmarks', [
            'library_resource_id' => $public->id,
        ])->assertStatus(201);

        $this->getJson('/api/v1/library')
            ->assertOk()
            ->assertJsonPath('data.0.is_bookmarked', true);

        $this->getJson('/api/v1/bookmarks')
            ->assertOk()
            ->assertJsonCount(1, 'data');
    }

    public function test_documents_upload_download_and_ownership(): void
    {
        Storage::fake('local');

        $owner = User::factory()->create();
        $other = User::factory()->create();

        Sanctum::actingAs($owner);

        $documentId = $this->postJson('/api/v1/documents', [
            'title' => 'Worship plan',
            'file' => UploadedFile::fake()->create('plan.pdf', 12, 'application/pdf'),
            'is_private' => true,
        ])->assertStatus(201)
            ->assertJsonPath('data.title', 'Worship plan')
            ->json('data.id');

        $this->get('/api/v1/documents/'.$documentId.'/download')->assertOk();

        Sanctum::actingAs($other);
        $this->getJson('/api/v1/documents/'.$documentId)->assertNotFound();
        $this->get('/api/v1/documents/'.$documentId.'/download')->assertNotFound();
    }

    public function test_health_records_upsert_and_summary(): void
    {
        $user = User::factory()->create();
        Sanctum::actingAs($user);

        $first = $this->postJson('/api/v1/health-records', [
            'record_date' => today()->toDateString(),
            'weight_kg' => 70.5,
            'water_ml' => 1500,
            'sleep_hours' => 7.5,
            'blood_pressure_systolic' => 120,
            'blood_pressure_diastolic' => 80,
        ])->assertStatus(201)->json('data.id');

        $this->postJson('/api/v1/health-records', [
            'record_date' => today()->toDateString(),
            'weight_kg' => 71.0,
        ])->assertOk()->assertJsonPath('data.id', $first);

        $this->getJson('/api/v1/health-records/summary')
            ->assertOk()
            ->assertJsonPath('data.record_count', 1)
            ->assertJsonPath('data.latest.weight_kg', 71);
    }

    public function test_exercise_record_must_reference_owned_activity(): void
    {
        $user = User::factory()->create();
        $other = User::factory()->create();

        $activity = Activity::create([
            'user_id' => $user->id,
            'title' => 'Gym session',
            'activity_type' => ActivityType::Exercise,
            'scheduled_date' => today()->toDateString(),
            'status' => ActivityStatus::Pending,
        ]);

        Sanctum::actingAs($user);

        $this->postJson('/api/v1/exercise-records', [
            'activity_id' => $activity->id,
            'exercise_type' => 'strength',
            'title' => 'Push day',
            'recorded_at' => now()->toIso8601String(),
        ])->assertStatus(201)
            ->assertJsonPath('data.activity_id', $activity->id);

        Sanctum::actingAs($other);

        $this->postJson('/api/v1/exercise-records', [
            'activity_id' => $activity->id,
            'exercise_type' => 'strength',
            'title' => 'Stolen activity',
            'recorded_at' => now()->toIso8601String(),
        ])->assertStatus(422)
            ->assertJsonValidationErrors('activity_id');
    }

    public function test_notifications_can_be_listed_and_marked_read(): void
    {
        $user = User::factory()->create();

        Notification::create([
            'user_id' => $user->id,
            'type' => NotificationType::System,
            'title' => 'Welcome',
            'body' => 'Welcome to Daei.',
            'sent_at' => now(),
        ]);

        Sanctum::actingAs($user);

        $this->getJson('/api/v1/notifications/unread-count')
            ->assertOk()
            ->assertJsonPath('data.unread_count', 1);

        $this->postJson('/api/v1/notifications/read-all')
            ->assertOk()
            ->assertJsonPath('data.updated_count', 1);

        $this->getJson('/api/v1/notifications/unread-count')
            ->assertOk()
            ->assertJsonPath('data.unread_count', 0);
    }

    private function createLibraryResource(
        User $uploader,
        LibraryVisibility $visibility,
        string $title,
    ): LibraryResource {
        return LibraryResource::create([
            'title' => $title,
            'file_name' => 'resource.pdf',
            'storage_disk' => 'local',
            'storage_path' => 'library-resources/resource.pdf',
            'mime_type' => 'application/pdf',
            'file_size' => 1024,
            'uploaded_by' => $uploader->id,
            'visibility' => $visibility,
            'status' => 'active',
        ]);
    }
}
