import 'dart:collection';

import 'offline_boxes.dart';
import 'models.dart';

String _now() => DateTime.now().toUtc().toIso8601String();

/// Coordinates local Hive persistence with the `sync_operations` queue.
///
/// Every mutation is written to its entity box first (so the UI can continue
/// offline) and then collapsed into a single pending operation per entity. The
/// operation UUID is what makes `POST /api/v1/sync/push` idempotent.
class OfflineSyncRepository {
  OfflineSyncRepository(this._boxes);

  final OfflineBoxes _boxes;

  // ---------------------------------------------------------------------------
  // Journal entries (UUID key)
  // ---------------------------------------------------------------------------

  void saveJournal(JournalEntry entry) {
    final exists = _boxes.journalEntries.containsKey(entry.uuid);
    final state = exists || entry.serverVersion > 0
        ? SyncState.pendingUpdate
        : SyncState.pendingCreate;
    final saved = entry.copyWith(
      syncState: state,
      clientUpdatedAt: _now(),
    );

    _boxes.journalEntries.put(saved.uuid, saved);
    _enqueue(
      entityType: JournalEntry.entityType,
      entityUuid: saved.uuid,
      operationType: state == SyncState.pendingCreate ? 'create' : 'update',
      payload: saved.toSyncPayload(),
      clientVersion: saved.serverVersion,
    );
  }

  void deleteJournal(String uuid) {
    final entry = _boxes.journalEntries.get(uuid);
    if (entry == null) {
      return;
    }

    _boxes.journalEntries.put(
      uuid,
      entry.copyWith(
        syncState: SyncState.pendingDelete,
        isDeleted: true,
        clientUpdatedAt: _now(),
      ),
    );
    _enqueue(
      entityType: JournalEntry.entityType,
      entityUuid: uuid,
      operationType: 'delete',
      payload: const <String, dynamic>{},
      clientVersion: entry.serverVersion,
    );
  }

  // ---------------------------------------------------------------------------
  // Daily reports (`${user_id}_${report_date}` key)
  // ---------------------------------------------------------------------------

  void saveDailyReport(DailyReport report) {
    final exists = _boxes.dailyReports.containsKey(report.boxKey);
    final state = exists || report.serverVersion > 0
        ? SyncState.pendingUpdate
        : SyncState.pendingCreate;
    final saved = report.copyWith(
      syncState: state,
      clientUpdatedAt: _now(),
    );

    _boxes.dailyReports.put(saved.boxKey, saved);
    _enqueue(
      entityType: DailyReport.entityType,
      entityUuid: saved.uuid,
      operationType: state == SyncState.pendingCreate ? 'create' : 'update',
      payload: saved.toSyncPayload(),
      clientVersion: saved.serverVersion,
    );
  }

  DailyReport? findDailyReport(int userId, String reportDate) {
    return _boxes.dailyReports.get('${userId}_$reportDate');
  }

  // ---------------------------------------------------------------------------
  // Exercise records (UUID key)
  // ---------------------------------------------------------------------------

  void saveExerciseRecord(ExerciseRecord record) {
    final exists = _boxes.exerciseRecords.containsKey(record.uuid);
    final state = exists || record.serverVersion > 0
        ? SyncState.pendingUpdate
        : SyncState.pendingCreate;
    final saved = record.copyWith(
      syncState: state,
      clientUpdatedAt: _now(),
    );

    _boxes.exerciseRecords.put(saved.uuid, saved);
    _enqueue(
      entityType: ExerciseRecord.entityType,
      entityUuid: saved.uuid,
      operationType: state == SyncState.pendingCreate ? 'create' : 'update',
      payload: saved.toSyncPayload(),
      clientVersion: saved.serverVersion,
    );
  }

  // ---------------------------------------------------------------------------
  // Health records (`${user_id}_${record_date}` key)
  // ---------------------------------------------------------------------------

  void saveHealthRecord(HealthRecord record) {
    final exists = _boxes.healthRecords.containsKey(record.boxKey);
    final state = exists || record.serverVersion > 0
        ? SyncState.pendingUpdate
        : SyncState.pendingCreate;
    final saved = record.copyWith(
      syncState: state,
      clientUpdatedAt: _now(),
    );

    _boxes.healthRecords.put(saved.boxKey, saved);
    _enqueue(
      entityType: HealthRecord.entityType,
      entityUuid: saved.uuid,
      operationType: state == SyncState.pendingCreate ? 'create' : 'update',
      payload: saved.toSyncPayload(),
      clientVersion: saved.serverVersion,
    );
  }

  HealthRecord? findHealthRecord(int userId, String recordDate) {
    return _boxes.healthRecords.get('${userId}_$recordDate');
  }

  // ---------------------------------------------------------------------------
  // Sync queue
  // ---------------------------------------------------------------------------

  /// FIFO list of mutations still waiting to reach the server.
  List<SyncQueueEntry> pendingOperations() {
    final pending = _boxes.syncQueue.values
        .where((SyncQueueEntry entry) => !entry.isProcessed)
        .toList()
      ..sort((SyncQueueEntry a, SyncQueueEntry b) =>
          a.queuedAt.compareTo(b.queuedAt));

    return UnmodifiableListView<SyncQueueEntry>(pending);
  }

  /// Mark an operation as acknowledged by the server and clear the entity's
  /// dirty flag when no other operation targets it.
  void markProcessed(String operationUuid, {bool accepted = true}) {
    final entry = _boxes.syncQueue.get(operationUuid);
    if (entry == null) {
      return;
    }

    _boxes.syncQueue.put(
      operationUuid,
      entry.copyWith(
        isProcessed: true,
        processedAt: _now(),
        attempts: entry.attempts + 1,
      ),
    );

    if (!accepted) {
      return;
    }

    final stillPending = _boxes.syncQueue.values.any(
      (SyncQueueEntry candidate) =>
          !candidate.isProcessed &&
          candidate.entityType == entry.entityType &&
          candidate.entityUuid == entry.entityUuid,
    );

    if (!stillPending) {
      _markEntitySynced(entry.entityType, entry.entityUuid);
    }
  }

  /// Record a failed attempt without dropping the mutation.
  void markAttemptFailed(String operationUuid) {
    final entry = _boxes.syncQueue.get(operationUuid);
    if (entry == null) {
      return;
    }

    _boxes.syncQueue.put(
      operationUuid,
      entry.copyWith(attempts: entry.attempts + 1),
    );
  }

  /// Remove acknowledged operations after a successful push cycle.
  Future<void> pruneProcessedOperations() async {
    final processedKeys = _boxes.syncQueue.toMap().entries
        .where((MapEntry<dynamic, SyncQueueEntry> entry) =>
            entry.value.isProcessed)
        .map((MapEntry<dynamic, SyncQueueEntry> entry) => entry.key)
        .toList();

    await _boxes.syncQueue.deleteAll(processedKeys);
  }

  Future<void> clearLocalData() async {
    await _boxes.journalEntries.clear();
    await _boxes.dailyReports.clear();
    await _boxes.exerciseRecords.clear();
    await _boxes.healthRecords.clear();
    await _boxes.syncQueue.clear();
  }

  // ---------------------------------------------------------------------------
  // Internals
  // ---------------------------------------------------------------------------

  void _enqueue({
    required String entityType,
    required String entityUuid,
    required String operationType,
    required Map<String, dynamic> payload,
    required int clientVersion,
  }) {
    final clientUpdatedAt = _now();
    final existing = _boxes.syncQueue.values
        .where((SyncQueueEntry entry) =>
            !entry.isProcessed &&
            entry.entityType == entityType &&
            entry.entityUuid == entityUuid)
        .toList();

    if (existing.isNotEmpty) {
      final pending = existing.last;
      final mergedOperation = pending.operationType == 'create'
          ? 'create'
          : operationType;

      _boxes.syncQueue.put(
        pending.operationUuid,
        pending.copyWith(
          operationType: mergedOperation,
          payload: payload,
          clientVersion: clientVersion,
          clientUpdatedAt: clientUpdatedAt,
        ),
      );
      return;
    }

    final entry = SyncQueueEntry.pending(
      entityType: entityType,
      entityUuid: entityUuid,
      operationType: operationType,
      payload: payload,
      clientVersion: clientVersion,
      clientUpdatedAt: clientUpdatedAt,
    );

    _boxes.syncQueue.put(entry.operationUuid, entry);
  }

  void _markEntitySynced(String entityType, String entityUuid) {
    switch (entityType) {
      case JournalEntry.entityType:
        final journal = _boxes.journalEntries.get(entityUuid);
        if (journal != null) {
          _boxes.journalEntries.put(
            journal.uuid,
            journal.copyWith(syncState: SyncState.synced),
          );
        }
        break;
      case DailyReport.entityType:
        final report = _firstWhere(
          _boxes.dailyReports.values,
          (DailyReport item) => item.uuid == entityUuid,
        );
        if (report != null) {
          _boxes.dailyReports.put(
            report.boxKey,
            report.copyWith(syncState: SyncState.synced),
          );
        }
        break;
      case ExerciseRecord.entityType:
        final exercise = _boxes.exerciseRecords.get(entityUuid);
        if (exercise != null) {
          _boxes.exerciseRecords.put(
            exercise.uuid,
            exercise.copyWith(syncState: SyncState.synced),
          );
        }
        break;
      case HealthRecord.entityType:
        final health = _firstWhere(
          _boxes.healthRecords.values,
          (HealthRecord item) => item.uuid == entityUuid,
        );
        if (health != null) {
          _boxes.healthRecords.put(
            health.boxKey,
            health.copyWith(syncState: SyncState.synced),
          );
        }
        break;
    }
  }

  T? _firstWhere<T>(Iterable<T> values, bool Function(T value) predicate) {
    for (final value in values) {
      if (predicate(value)) {
        return value;
      }
    }
    return null;
  }
}
