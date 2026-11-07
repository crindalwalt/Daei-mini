<?php

namespace App\Services;

use App\Enums\ActivityStatus;
use App\Enums\ConflictResolutionPolicy;
use App\Enums\SyncStatus;
use App\Enums\TimetableStatus;
use App\Models\Activity;
use App\Models\DailyReport;
use App\Models\ExerciseRecord;
use App\Models\Goal;
use App\Models\Habit;
use App\Models\HabitRecord;
use App\Models\HealthRecord;
use App\Models\JournalEntry;
use App\Models\SharedActivityCompletion;
use App\Models\SharedTimetableActivity;
use App\Models\SyncConflict;
use App\Models\SyncOperation;
use App\Models\User;
use App\Models\UserDevice;
use Carbon\Carbon;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Validation\ValidationException;
use Throwable;

class SyncService
{
    public function __construct(private readonly DailyReportService $dailyReports) {}

    /**
     * @var array<string, class-string<Model>>
     */
    private const ENTITY_MODELS = [
        'habit' => Habit::class,
        'habit_record' => HabitRecord::class,
        'goal' => Goal::class,
        'shared_activity_completion' => SharedActivityCompletion::class,
        'journal_entries' => JournalEntry::class,
        'daily_reports' => DailyReport::class,
        'exercise_records' => ExerciseRecord::class,
        'health_records' => HealthRecord::class,
    ];

    /**
     * @var array<string, list<string>>
     */
    private const ENTITY_FILLABLE = [
        'habit' => ['name', 'description', 'is_active'],
        'habit_record' => ['habit_id', 'record_date', 'status', 'notes'],
        'goal' => ['title', 'description', 'target_date', 'progress', 'status', 'achieved_at'],
        'shared_activity_completion' => [
            'shared_timetable_activity_id',
            'status',
            'completed_at',
            'notes',
        ],
        'journal_entries' => ['entry_date', 'title', 'content'],
        'daily_reports' => ['report_date', 'summary', 'self_assessment'],
        'exercise_records' => [
            'activity_id',
            'exercise_type',
            'title',
            'duration_minutes',
            'distance',
            'calories_burned',
            'notes',
            'recorded_at',
        ],
        'health_records' => [
            'record_date',
            'weight_kg',
            'water_ml',
            'sleep_hours',
            'blood_pressure_systolic',
            'blood_pressure_diastolic',
            'notes',
        ],
    ];

    /**
     * Apply a batch of client operations with idempotency and conflict handling.
     *
     * @return array<string, mixed>
     */
    public function push(User $user, array $payload): array
    {
        $policy = ConflictResolutionPolicy::tryFrom($payload['conflict_policy'] ?? '')
            ?? ConflictResolutionPolicy::LatestWins;
        $deviceId = $payload['device_id'] ?? null;

        if ($deviceId !== null) {
            $ownsDevice = UserDevice::query()
                ->whereKey($deviceId)
                ->where('user_id', $user->id)
                ->exists();

            if (! $ownsDevice) {
                throw ValidationException::withMessages([
                    'device_id' => ['The selected device does not belong to you.'],
                ]);
            }
        }

        $results = [];

        foreach ($payload['operations'] as $operationPayload) {
            $operation = SyncOperation::query()
                ->where('operation_uuid', $operationPayload['operation_uuid'])
                ->first();

            if ($operation !== null && $operation->status === SyncStatus::Synced) {
                $results[] = [
                    'operation_uuid' => $operationPayload['operation_uuid'],
                    'entity_type' => $operationPayload['entity_type'],
                    'entity_uuid' => $operationPayload['entity_uuid'],
                    'status' => 'duplicate',
                    'server_version' => null,
                ];

                continue;
            }

            $operation ??= new SyncOperation;
            $operation->fill([
                'operation_uuid' => $operationPayload['operation_uuid'],
                'user_id' => $user->id,
                'device_id' => $deviceId,
                'entity_type' => $operationPayload['entity_type'],
                'entity_uuid' => $operationPayload['entity_uuid'],
                'operation_type' => $operationPayload['operation_type'],
            ]);

            try {
                $result = $this->applyOperation($user, $operationPayload, $policy);
                $operation->status = SyncStatus::Synced;
                $operation->error_message = null;
            } catch (Throwable $exception) {
                $result = [
                    'operation_uuid' => $operationPayload['operation_uuid'],
                    'entity_type' => $operationPayload['entity_type'],
                    'entity_uuid' => $operationPayload['entity_uuid'],
                    'status' => 'failed',
                    'message' => $exception->getMessage(),
                ];
                $operation->status = SyncStatus::Failed;
                $operation->error_message = $exception->getMessage();
            }

            $operation->processed_at = now();
            $operation->save();

            $results[] = $result;
        }

        if ($deviceId !== null) {
            UserDevice::query()->whereKey($deviceId)->update(['last_sync_at' => now()]);
        }

        return [
            'server_time' => now()->toIso8601String(),
            'results' => $results,
        ];
    }

    /**
     * Pull all syncable records changed since the supplied timestamp.
     *
     * @return array<string, mixed>
     */
    public function pull(User $user, ?string $since = null): array
    {
        $sinceDate = $since !== null ? Carbon::parse($since) : now()->subCentury();

        $entities = [];

        foreach (self::ENTITY_MODELS as $type => $modelClass) {
            $entities[$type] = $modelClass::query()
                ->withTrashed()
                ->ownedBy($user)
                ->where('updated_at', '>=', $sinceDate)
                ->orderBy('updated_at')
                ->get()
                ->map(fn (Model $model): array => [
                    'uuid' => $model->getAttribute('uuid'),
                    'deleted' => method_exists($model, 'trashed') && $model->trashed(),
                    'server_version' => (int) $model->getAttribute('server_version'),
                    'updated_at' => $model->getAttribute('updated_at')?->toIso8601String(),
                    'data' => $model->toArray(),
                ])
                ->values()
                ->all();
        }

        return [
            'server_time' => now()->toIso8601String(),
            'since' => $sinceDate->toIso8601String(),
            'entities' => $entities,
        ];
    }

    /**
     * Resolve a stored conflict using the requested policy.
     */
    public function resolveConflict(
        User $user,
        SyncConflict $conflict,
        ConflictResolutionPolicy $resolution,
    ): SyncConflict {
        if ($conflict->user_id !== $user->id) {
            throw ValidationException::withMessages([
                'conflict' => ['The selected conflict does not belong to you.'],
            ]);
        }

        $applyClient = match ($resolution) {
            ConflictResolutionPolicy::ClientWins => true,
            ConflictResolutionPolicy::ServerWins => false,
            ConflictResolutionPolicy::LatestWins => $this->clientIsNewer($conflict),
            ConflictResolutionPolicy::Manual => false,
        };

        if ($applyClient) {
            $this->applyEntityPayload(
                $user,
                $conflict->entity_type,
                $conflict->entity_uuid,
                $conflict->client_payload ?? [],
                Carbon::parse($conflict->client_payload['client_updated_at'] ?? now()),
            );
        }

        $conflict->forceFill([
            'resolution_status' => 'resolved',
            'resolution_type' => $resolution,
            'resolved_at' => now(),
        ])->save();

        return $conflict->refresh();
    }

    /**
     * @return array<string, mixed>
     */
    private function applyOperation(User $user, array $operation, ConflictResolutionPolicy $policy): array
    {
        $entityType = $operation['entity_type'];
        $entityUuid = $operation['entity_uuid'];
        $operationType = $operation['operation_type'];

        if (! isset(self::ENTITY_MODELS[$entityType])) {
            throw ValidationException::withMessages([
                'entity_type' => ["Unsupported sync entity type [{$entityType}]."],
            ]);
        }

        $payload = $operation['payload'] ?? [];
        $entity = $this->findEntity($user, $entityType, $entityUuid, $payload);

        if ($operationType === 'delete') {
            if ($entity !== null && ! $entity->trashed()) {
                if ($entity instanceof DailyReport && $this->isLockedDailyReport($entity)) {
                    throw ValidationException::withMessages([
                        'entity_uuid' => ['Daily reports for previous days are locked.'],
                    ]);
                }

                $entity->delete();
            }

            return [
                'operation_uuid' => $operation['operation_uuid'],
                'entity_type' => $entityType,
                'entity_uuid' => $entityUuid,
                'status' => 'applied',
                'server_version' => $entity?->getAttribute('server_version'),
            ];
        }

        $clientUpdatedAt = Carbon::parse($operation['client_updated_at'] ?? now());

        if ($entity instanceof DailyReport && $this->isLockedDailyReport($entity)) {
            return $this->rejectedDailyReportResult($user, $operation, $entity);
        }

        if ($entity !== null) {
            $serverUpdatedAt = $entity->getAttribute('client_updated_at')
                ?? $entity->getAttribute('updated_at');

            if ($serverUpdatedAt !== null && $clientUpdatedAt->lt($serverUpdatedAt)) {
                $decision = $this->resolvePolicy($user, $operation, $entity, $policy);

                if ($decision !== 'apply') {
                    return $decision;
                }
            }
        }

        $entity = $this->applyEntityPayload($user, $entityType, $entityUuid, $payload, $clientUpdatedAt);

        return [
            'operation_uuid' => $operation['operation_uuid'],
            'entity_type' => $entityType,
            'entity_uuid' => $entityUuid,
            'status' => 'applied',
            'server_version' => $entity->getAttribute('server_version'),
            'data' => $entity->toArray(),
        ];
    }

    /**
     * @return array<string, mixed>|string
     */
    private function resolvePolicy(
        User $user,
        array $operation,
        Model $entity,
        ConflictResolutionPolicy $policy,
    ): array|string {
        $clientPayload = $operation['payload'] ?? [];
        $serverPayload = $entity->toArray();

        if ($policy === ConflictResolutionPolicy::ClientWins) {
            return 'apply';
        }

        if ($policy === ConflictResolutionPolicy::LatestWins) {
            $clientUpdatedAt = Carbon::parse($operation['client_updated_at'] ?? now());
            $serverUpdatedAt = $entity->getAttribute('client_updated_at')
                ?? $entity->getAttribute('updated_at');

            return $serverUpdatedAt !== null && $clientUpdatedAt->lt($serverUpdatedAt)
                ? $this->serverWinsResult($operation, $entity)
                : 'apply';
        }

        if ($policy === ConflictResolutionPolicy::ServerWins) {
            return $this->serverWinsResult($operation, $entity);
        }

        $conflict = SyncConflict::query()->create([
            'user_id' => $user->id,
            'entity_type' => $operation['entity_type'],
            'entity_uuid' => $operation['entity_uuid'],
            'client_version' => $operation['client_version'] ?? 0,
            'server_version' => $entity->getAttribute('server_version'),
            'client_payload' => array_merge($clientPayload, [
                'client_updated_at' => $operation['client_updated_at'] ?? null,
            ]),
            'server_payload' => $serverPayload,
            'resolution_status' => 'pending',
        ]);

        return [
            'operation_uuid' => $operation['operation_uuid'],
            'entity_type' => $operation['entity_type'],
            'entity_uuid' => $operation['entity_uuid'],
            'status' => 'conflict',
            'conflict_uuid' => $conflict->conflict_uuid,
            'server_version' => $entity->getAttribute('server_version'),
            'data' => $serverPayload,
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function serverWinsResult(array $operation, Model $entity): array
    {
        return [
            'operation_uuid' => $operation['operation_uuid'],
            'entity_type' => $operation['entity_type'],
            'entity_uuid' => $operation['entity_uuid'],
            'status' => 'server_wins',
            'server_version' => $entity->getAttribute('server_version'),
            'data' => $entity->toArray(),
        ];
    }

    /**
     * Create or update a single entity from a client payload.
     */
    private function applyEntityPayload(
        User $user,
        string $entityType,
        string $entityUuid,
        array $payload,
        Carbon $clientUpdatedAt,
    ): Model {
        if (! isset(self::ENTITY_MODELS[$entityType])) {
            throw ValidationException::withMessages([
                'entity_type' => ["Unsupported sync entity type [{$entityType}]."],
            ]);
        }

        $this->assertEntityReferences($user, $entityType, $payload);

        if ($entityType === 'daily_reports') {
            return $this->applyDailyReportPayload($user, $entityUuid, $payload, $clientUpdatedAt);
        }

        $modelClass = self::ENTITY_MODELS[$entityType];
        $entity = $this->findEntity($user, $entityType, $entityUuid, $payload)
            ?? new $modelClass;

        if ($entity->exists && method_exists($entity, 'restore') && $entity->trashed()) {
            $entity->restore();
        }

        $entity->fill($this->onlyFillable($entityType, $payload));

        if (blank($entity->getAttribute('uuid'))) {
            $entity->setAttribute('uuid', $entityUuid);
        }

        $entity->setAttribute('user_id', $user->id);
        $entity->setAttribute('client_created_at', $payload['client_created_at'] ?? $entity->getAttribute('client_created_at') ?? now());
        $entity->setAttribute('client_updated_at', $clientUpdatedAt);
        $entity->setAttribute('server_version', ((int) $entity->getAttribute('server_version')) + 1);
        $entity->setAttribute('synced_at', now());
        $entity->save();

        return $entity->refresh();
    }

    /**
     * Resolve an entity by UUID, falling back to the client-side composite
     * key for records that the mobile Hive boxes key by user + date.
     */
    private function findEntity(
        User $user,
        string $entityType,
        string $entityUuid,
        array $payload,
    ): ?Model {
        $modelClass = self::ENTITY_MODELS[$entityType];
        $query = $modelClass::query()
            ->withTrashed()
            ->ownedBy($user);

        $compositeDateColumn = match ($entityType) {
            'daily_reports' => 'report_date',
            'health_records' => 'record_date',
            default => null,
        };

        if ($compositeDateColumn !== null && isset($payload[$compositeDateColumn])) {
            $byDate = (clone $query)
                ->whereDate($compositeDateColumn, Carbon::parse($payload[$compositeDateColumn])->toDateString())
                ->first();

            if ($byDate !== null) {
                return $byDate;
            }
        }

        return $query->where('uuid', $entityUuid)->first();
    }

    /**
     * Daily reports always recompute their immutable server-side snapshot.
     */
    private function applyDailyReportPayload(
        User $user,
        string $entityUuid,
        array $payload,
        Carbon $clientUpdatedAt,
    ): DailyReport {
        if (! isset($payload['report_date'])) {
            throw ValidationException::withMessages([
                'payload.report_date' => ['The report date is required.'],
            ]);
        }

        $date = Carbon::parse($payload['report_date'])->startOfDay();

        $existing = DailyReport::query()
            ->withTrashed()
            ->ownedBy($user)
            ->forDate($date->toDateString())
            ->first();

        if ($existing !== null && $existing->trashed()) {
            $existing->restore();
        }

        return $this->dailyReports->submit($user, [
            'uuid' => $entityUuid,
            'report_date' => $date->toDateString(),
            'summary' => array_key_exists('summary', $payload) ? $payload['summary'] : $existing?->summary,
            'self_assessment' => array_key_exists('self_assessment', $payload) ? $payload['self_assessment'] : $existing?->self_assessment,
            'client_created_at' => $payload['client_created_at'] ?? $existing?->client_created_at?->toIso8601String(),
            'client_updated_at' => $clientUpdatedAt->toIso8601String(),
        ]);
    }

    /**
     * A submitted report for a previous calendar day is immutable.
     */
    private function isLockedDailyReport(DailyReport $report): bool
    {
        return $report->submitted_at !== null
            && $report->report_date !== null
            && $report->report_date->lt(today());
    }

    /**
     * Record a rejected conflict when an offline client tries to overwrite
     * a previously submitted report.
     *
     * @return array<string, mixed>
     */
    private function rejectedDailyReportResult(
        User $user,
        array $operation,
        DailyReport $report,
    ): array {
        $conflict = SyncConflict::query()->create([
            'user_id' => $user->id,
            'entity_type' => $operation['entity_type'],
            'entity_uuid' => $operation['entity_uuid'],
            'client_version' => $operation['client_version'] ?? 0,
            'server_version' => $report->server_version,
            'client_payload' => array_merge($operation['payload'] ?? [], [
                'client_updated_at' => $operation['client_updated_at'] ?? null,
            ]),
            'server_payload' => $report->toArray(),
            'resolution_status' => 'rejected',
            'resolution_type' => ConflictResolutionPolicy::ServerWins,
            'resolved_at' => now(),
        ]);

        return [
            'operation_uuid' => $operation['operation_uuid'],
            'entity_type' => $operation['entity_type'],
            'entity_uuid' => $operation['entity_uuid'],
            'status' => 'rejected',
            'conflict_uuid' => $conflict->conflict_uuid,
            'server_version' => $report->server_version,
            'data' => $report->toArray(),
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function onlyFillable(string $entityType, array $payload): array
    {
        return collect($payload)
            ->only(self::ENTITY_FILLABLE[$entityType])
            ->filter(fn (mixed $value, string $key): bool => $key !== 'status' || $value !== null)
            ->all();
    }

    private function assertEntityReferences(User $user, string $entityType, array $payload): void
    {
        if ($entityType === 'habit_record' && isset($payload['habit_id'])) {
            $owned = Habit::query()
                ->whereKey($payload['habit_id'])
                ->ownedBy($user)
                ->exists();

            if (! $owned) {
                throw ValidationException::withMessages([
                    'payload.habit_id' => ['The selected habit does not belong to you.'],
                ]);
            }
        }

        if ($entityType === 'shared_activity_completion' && isset($payload['shared_timetable_activity_id'])) {
            $groupIds = $user->groups()->pluck('groups.id')->all();

            $accessible = SharedTimetableActivity::query()
                ->whereKey($payload['shared_timetable_activity_id'])
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
                ->exists();

            if (! $accessible) {
                throw ValidationException::withMessages([
                    'payload.shared_timetable_activity_id' => ['The selected shared activity is not assigned to you.'],
                ]);
            }
        }

        if ($entityType === 'shared_activity_completion' && isset($payload['status'])) {
            $allowed = array_column(ActivityStatus::cases(), 'value');

            if (! in_array($payload['status'], $allowed, true)) {
                throw ValidationException::withMessages([
                    'payload.status' => ['The status is invalid.'],
                ]);
            }
        }

        if ($entityType === 'daily_reports') {
            if (! isset($payload['report_date'])) {
                throw ValidationException::withMessages([
                    'payload.report_date' => ['The report date is required.'],
                ]);
            }

            if (Carbon::parse($payload['report_date'])->startOfDay()->gt(today())) {
                throw ValidationException::withMessages([
                    'payload.report_date' => ['The report date cannot be in the future.'],
                ]);
            }
        }

        if ($entityType === 'exercise_records' && isset($payload['activity_id'])) {
            $owned = Activity::query()
                ->whereKey($payload['activity_id'])
                ->ownedBy($user)
                ->exists();

            if (! $owned) {
                throw ValidationException::withMessages([
                    'payload.activity_id' => ['The selected activity does not belong to you.'],
                ]);
            }
        }
    }

    private function clientIsNewer(SyncConflict $conflict): bool
    {
        $clientUpdatedAt = Carbon::parse($conflict->client_payload['client_updated_at'] ?? now());
        $serverUpdatedAt = isset($conflict->server_payload['updated_at'])
            ? Carbon::parse($conflict->server_payload['updated_at'])
            : now()->subCentury();

        return $clientUpdatedAt->gte($serverUpdatedAt);
    }
}
