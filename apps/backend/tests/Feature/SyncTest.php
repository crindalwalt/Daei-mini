<?php

namespace Tests\Feature;

use App\Enums\ActivityStatus;
use App\Enums\ActivityType;
use App\Models\Activity;
use App\Models\Goal;
use App\Models\Habit;
use App\Models\HealthRecord;
use App\Models\JournalEntry;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class SyncTest extends TestCase
{
    use RefreshDatabase;

    public function test_push_is_idempotent_per_operation_uuid(): void
    {
        $user = User::factory()->create();
        Sanctum::actingAs($user);

        $operationUuid = (string) Str::uuid();
        $entityUuid = (string) Str::uuid();

        $payload = [
            'conflict_policy' => 'latest_wins',
            'operations' => [[
                'operation_uuid' => $operationUuid,
                'entity_type' => 'habit',
                'entity_uuid' => $entityUuid,
                'operation_type' => 'create',
                'client_version' => 1,
                'client_updated_at' => now()->toIso8601String(),
                'payload' => [
                    'name' => 'Read Quran',
                    'description' => 'Daily portion',
                    'is_active' => true,
                ],
            ]],
        ];

        $this->postJson('/api/v1/sync/push', $payload)
            ->assertOk()
            ->assertJsonPath('data.results.0.status', 'applied');

        $this->assertDatabaseHas('habits', [
            'uuid' => $entityUuid,
            'user_id' => $user->id,
            'name' => 'Read Quran',
        ]);

        $this->postJson('/api/v1/sync/push', $payload)
            ->assertOk()
            ->assertJsonPath('data.results.0.status', 'duplicate');

        $this->assertSame(1, Habit::query()->count());
    }

    public function test_push_rejects_reference_to_another_users_habit(): void
    {
        $owner = User::factory()->create();
        $intruder = User::factory()->create();

        $habit = Habit::create([
            'user_id' => $owner->id,
            'name' => 'Owner habit',
            'is_active' => true,
        ]);

        Sanctum::actingAs($intruder);

        $this->postJson('/api/v1/sync/push', [
            'operations' => [[
                'operation_uuid' => (string) Str::uuid(),
                'entity_type' => 'habit_record',
                'entity_uuid' => (string) Str::uuid(),
                'operation_type' => 'create',
                'client_updated_at' => now()->toIso8601String(),
                'payload' => [
                    'habit_id' => $habit->id,
                    'record_date' => today()->toDateString(),
                    'status' => 'completed',
                ],
            ]],
        ])->assertOk()
            ->assertJsonPath('data.results.0.status', 'failed');

        $this->assertDatabaseCount('habit_records', 0);
    }

    public function test_push_delete_soft_deletes_the_entity(): void
    {
        $user = User::factory()->create();
        $habit = Habit::create([
            'user_id' => $user->id,
            'name' => 'Old habit',
            'is_active' => true,
        ]);

        Sanctum::actingAs($user);

        $this->postJson('/api/v1/sync/push', [
            'operations' => [[
                'operation_uuid' => (string) Str::uuid(),
                'entity_type' => 'habit',
                'entity_uuid' => $habit->uuid,
                'operation_type' => 'delete',
                'client_updated_at' => now()->toIso8601String(),
            ]],
        ])->assertOk()
            ->assertJsonPath('data.results.0.status', 'applied');

        $this->assertSoftDeleted('habits', ['id' => $habit->id]);
    }

    public function test_pull_returns_owned_changed_entities(): void
    {
        $user = User::factory()->create();
        $other = User::factory()->create();

        $habit = Habit::create([
            'user_id' => $user->id,
            'name' => 'Pullable habit',
            'is_active' => true,
        ]);

        Habit::create([
            'user_id' => $other->id,
            'name' => 'Other habit',
            'is_active' => true,
        ]);

        Goal::create([
            'user_id' => $user->id,
            'title' => 'Pullable goal',
        ]);

        Sanctum::actingAs($user);

        $response = $this->getJson('/api/v1/sync/pull?since='.urlencode(now()->subDay()->toIso8601String()));

        $response->assertOk()
            ->assertJsonCount(1, 'data.entities.habit')
            ->assertJsonPath('data.entities.habit.0.uuid', $habit->uuid)
            ->assertJsonCount(1, 'data.entities.goal')
            ->assertJsonCount(0, 'data.entities.habit_record');
    }

    public function test_server_wins_policy_discards_stale_client_update(): void
    {
        $user = User::factory()->create();
        $habit = Habit::create([
            'user_id' => $user->id,
            'name' => 'Server name',
            'is_active' => true,
            'client_updated_at' => now()->subDay(),
        ]);

        Sanctum::actingAs($user);

        $this->postJson('/api/v1/sync/push', [
            'conflict_policy' => 'server_wins',
            'operations' => [[
                'operation_uuid' => (string) Str::uuid(),
                'entity_type' => 'habit',
                'entity_uuid' => $habit->uuid,
                'operation_type' => 'update',
                'client_version' => 1,
                'client_updated_at' => now()->subDays(2)->toIso8601String(),
                'payload' => ['name' => 'Stale client name'],
            ]],
        ])->assertOk()
            ->assertJsonPath('data.results.0.status', 'server_wins');

        $this->assertSame('Server name', $habit->refresh()->name);
    }

    public function test_manual_conflict_can_be_resolved_with_client_wins(): void
    {
        $user = User::factory()->create();
        $habit = Habit::create([
            'user_id' => $user->id,
            'name' => 'Server name',
            'is_active' => true,
            'client_updated_at' => now()->subDay(),
        ]);

        Sanctum::actingAs($user);

        $push = $this->postJson('/api/v1/sync/push', [
            'conflict_policy' => 'manual',
            'operations' => [[
                'operation_uuid' => (string) Str::uuid(),
                'entity_type' => 'habit',
                'entity_uuid' => $habit->uuid,
                'operation_type' => 'update',
                'client_version' => 2,
                'client_updated_at' => now()->subDays(2)->toIso8601String(),
                'payload' => ['name' => 'Client name'],
            ]],
        ]);

        $push->assertOk()
            ->assertJsonPath('data.results.0.status', 'conflict');

        $conflicts = $this->getJson('/api/v1/sync/conflicts')
            ->assertOk()
            ->assertJsonCount(1, 'data');

        $conflictId = $conflicts->json('data.0.id');

        $this->postJson('/api/v1/sync/conflicts/'.$conflictId.'/resolve', [
            'resolution_type' => 'client_wins',
        ])->assertOk()
            ->assertJsonPath('data.resolution_status', 'resolved')
            ->assertJsonPath('data.resolution_type', 'client_wins');

        $this->assertSame('Client name', $habit->refresh()->name);
    }

    public function test_push_supports_extended_offline_entities(): void
    {
        $user = User::factory()->create();
        Sanctum::actingAs($user);

        $journalUuid = (string) Str::uuid();
        $exerciseUuid = (string) Str::uuid();
        $healthUuid = (string) Str::uuid();

        $response = $this->postJson('/api/v1/sync/push', [
            'operations' => [
                [
                    'operation_uuid' => (string) Str::uuid(),
                    'entity_type' => 'journal_entries',
                    'entity_uuid' => $journalUuid,
                    'operation_type' => 'create',
                    'client_updated_at' => now()->toIso8601String(),
                    'payload' => [
                        'entry_date' => today()->toDateString(),
                        'title' => 'Evening reflection',
                        'content' => 'Alhamdulillah.',
                    ],
                ],
                [
                    'operation_uuid' => (string) Str::uuid(),
                    'entity_type' => 'exercise_records',
                    'entity_uuid' => $exerciseUuid,
                    'operation_type' => 'create',
                    'client_updated_at' => now()->toIso8601String(),
                    'payload' => [
                        'exercise_type' => 'running',
                        'title' => 'Morning run',
                        'duration_minutes' => 30,
                        'distance' => 5.2,
                        'calories_burned' => 320,
                        'recorded_at' => now()->toIso8601String(),
                    ],
                ],
                [
                    'operation_uuid' => (string) Str::uuid(),
                    'entity_type' => 'health_records',
                    'entity_uuid' => $healthUuid,
                    'operation_type' => 'create',
                    'client_updated_at' => now()->toIso8601String(),
                    'payload' => [
                        'record_date' => today()->toDateString(),
                        'weight_kg' => 70.5,
                        'water_ml' => 1500,
                        'sleep_hours' => 7.5,
                    ],
                ],
            ],
        ]);

        $response->assertOk()
            ->assertJsonPath('data.results.0.status', 'applied')
            ->assertJsonPath('data.results.1.status', 'applied')
            ->assertJsonPath('data.results.2.status', 'applied');

        $this->assertDatabaseHas('journal_entries', [
            'uuid' => $journalUuid,
            'user_id' => $user->id,
            'title' => 'Evening reflection',
        ]);

        $this->assertDatabaseHas('exercise_records', [
            'uuid' => $exerciseUuid,
            'user_id' => $user->id,
            'exercise_type' => 'running',
        ]);

        $this->assertDatabaseHas('health_records', [
            'uuid' => $healthUuid,
            'user_id' => $user->id,
            'water_ml' => 1500,
        ]);
    }

    public function test_health_record_sync_upserts_on_user_and_record_date(): void
    {
        $user = User::factory()->create();
        Sanctum::actingAs($user);

        $firstUuid = (string) Str::uuid();

        $this->postJson('/api/v1/sync/push', [
            'operations' => [[
                'operation_uuid' => (string) Str::uuid(),
                'entity_type' => 'health_records',
                'entity_uuid' => $firstUuid,
                'operation_type' => 'create',
                'client_updated_at' => now()->toIso8601String(),
                'payload' => [
                    'record_date' => today()->toDateString(),
                    'weight_kg' => 70.5,
                ],
            ]],
        ])->assertOk()->assertJsonPath('data.results.0.status', 'applied');

        $this->postJson('/api/v1/sync/push', [
            'operations' => [[
                'operation_uuid' => (string) Str::uuid(),
                'entity_type' => 'health_records',
                'entity_uuid' => (string) Str::uuid(),
                'operation_type' => 'update',
                'client_updated_at' => now()->addMinute()->toIso8601String(),
                'payload' => [
                    'record_date' => today()->toDateString(),
                    'weight_kg' => 71.0,
                    'water_ml' => 2000,
                ],
            ]],
        ])->assertOk()->assertJsonPath('data.results.0.status', 'applied');

        $this->assertSame(1, HealthRecord::query()->where('user_id', $user->id)->count());
        $this->assertSame('71.00', (string) HealthRecord::query()->where('user_id', $user->id)->firstOrFail()->weight_kg);
    }

    public function test_daily_report_sync_computes_snapshot_score(): void
    {
        $user = User::factory()->create();

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

        Sanctum::actingAs($user);

        $response = $this->postJson('/api/v1/sync/push', [
            'operations' => [[
                'operation_uuid' => (string) Str::uuid(),
                'entity_type' => 'daily_reports',
                'entity_uuid' => (string) Str::uuid(),
                'operation_type' => 'create',
                'client_updated_at' => now()->toIso8601String(),
                'payload' => [
                    'report_date' => today()->toDateString(),
                    'summary' => 'Synced from Hive.',
                ],
            ]],
        ]);

        $response->assertOk()
            ->assertJsonPath('data.results.0.status', 'applied')
            ->assertJsonPath('data.results.0.data.scheduled_count', 2)
            ->assertJsonPath('data.results.0.data.completed_count', 1);

        $this->assertEqualsWithDelta(50.0, $response->json('data.results.0.data.calculated_score'), 0.001);
    }

    public function test_past_daily_report_sync_is_rejected_after_submission(): void
    {
        $user = User::factory()->create();
        Sanctum::actingAs($user);

        $reportUuid = (string) Str::uuid();
        $pastDate = today()->subDay()->toDateString();

        $this->postJson('/api/v1/sync/push', [
            'operations' => [[
                'operation_uuid' => (string) Str::uuid(),
                'entity_type' => 'daily_reports',
                'entity_uuid' => $reportUuid,
                'operation_type' => 'create',
                'client_updated_at' => now()->subDay()->toIso8601String(),
                'payload' => [
                    'report_date' => $pastDate,
                    'summary' => 'Late synchronized report.',
                ],
            ]],
        ])->assertOk()->assertJsonPath('data.results.0.status', 'applied');

        $this->postJson('/api/v1/sync/push', [
            'operations' => [[
                'operation_uuid' => (string) Str::uuid(),
                'entity_type' => 'daily_reports',
                'entity_uuid' => $reportUuid,
                'operation_type' => 'update',
                'client_updated_at' => now()->toIso8601String(),
                'payload' => [
                    'report_date' => $pastDate,
                    'summary' => 'Attempted overwrite.',
                ],
            ]],
        ])->assertOk()->assertJsonPath('data.results.0.status', 'rejected');

        $this->assertDatabaseHas('daily_reports', [
            'user_id' => $user->id,
            'summary' => 'Late synchronized report.',
        ]);

        $this->assertDatabaseHas('sync_conflicts', [
            'user_id' => $user->id,
            'entity_type' => 'daily_reports',
            'resolution_status' => 'rejected',
        ]);
    }

    public function test_pull_includes_extended_offline_entities(): void
    {
        $user = User::factory()->create();

        JournalEntry::create([
            'user_id' => $user->id,
            'entry_date' => today()->toDateString(),
            'title' => 'Pullable journal',
            'content' => 'Content.',
        ]);

        HealthRecord::create([
            'user_id' => $user->id,
            'record_date' => today()->toDateString(),
            'weight_kg' => 70,
        ]);

        Sanctum::actingAs($user);

        $this->getJson('/api/v1/sync/pull?since='.urlencode(now()->subDay()->toIso8601String()))
            ->assertOk()
            ->assertJsonCount(1, 'data.entities.journal_entries')
            ->assertJsonCount(1, 'data.entities.health_records')
            ->assertJsonCount(0, 'data.entities.daily_reports')
            ->assertJsonCount(0, 'data.entities.exercise_records');
    }
}
