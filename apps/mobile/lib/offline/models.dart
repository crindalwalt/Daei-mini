import 'package:uuid/uuid.dart';

const _uuidFactory = Uuid();

/// Lifecycle of a locally persisted entity relative to the server.
enum SyncState { synced, pendingCreate, pendingUpdate, pendingDelete }

/// Common contract implemented by every entity stored in a Hive box.
abstract class OfflineEntity {
  String get uuid;

  /// Key used inside the entity's Hive box. Most entities use their UUID;
  /// daily reports and health records use `${user_id}_${date}`.
  String get boxKey;

  SyncState get syncState;

  bool get isDeleted;

  int get serverVersion;

  String? get clientUpdatedAt;

  /// Payload sent inside `sync_operations.payload`.
  Map<String, dynamic> toSyncPayload();
}

String _nowIso8601() => DateTime.now().toUtc().toIso8601String();

class JournalEntry implements OfflineEntity {
  const JournalEntry({
    required this.uuid,
    required this.userId,
    required this.entryDate,
    required this.content,
    this.title,
    this.syncState = SyncState.pendingCreate,
    this.serverVersion = 0,
    this.isDeleted = false,
    this.clientUpdatedAt,
  });

  factory JournalEntry.create({
    required int userId,
    required String entryDate,
    required String content,
    String? title,
  }) {
    return JournalEntry(
      uuid: _uuidFactory.v4(),
      userId: userId,
      entryDate: entryDate,
      content: content,
      title: title,
    );
  }

  static const String entityType = 'journal_entries';

  @override
  final String uuid;
  final int userId;
  final String entryDate;
  final String content;
  final String? title;
  @override
  final SyncState syncState;
  @override
  final int serverVersion;
  @override
  final bool isDeleted;
  @override
  final String? clientUpdatedAt;

  @override
  String get boxKey => uuid;

  @override
  Map<String, dynamic> toSyncPayload() => <String, dynamic>{
        'entry_date': entryDate,
        'title': title,
        'content': content,
      };

  JournalEntry copyWith({
    String? uuid,
    int? userId,
    String? entryDate,
    String? content,
    String? title,
    SyncState? syncState,
    int? serverVersion,
    bool? isDeleted,
    String? clientUpdatedAt,
  }) {
    return JournalEntry(
      uuid: uuid ?? this.uuid,
      userId: userId ?? this.userId,
      entryDate: entryDate ?? this.entryDate,
      content: content ?? this.content,
      title: title ?? this.title,
      syncState: syncState ?? this.syncState,
      serverVersion: serverVersion ?? this.serverVersion,
      isDeleted: isDeleted ?? this.isDeleted,
      clientUpdatedAt: clientUpdatedAt ?? this.clientUpdatedAt,
    );
  }
}

class DailyReport implements OfflineEntity {
  const DailyReport({
    required this.uuid,
    required this.userId,
    required this.reportDate,
    this.summary,
    this.selfAssessment,
    this.calculatedScore = 0,
    this.scheduledCount = 0,
    this.completedCount = 0,
    this.submittedAt,
    this.syncState = SyncState.pendingCreate,
    this.serverVersion = 0,
    this.isDeleted = false,
    this.clientUpdatedAt,
  });

  factory DailyReport.create({
    required int userId,
    required String reportDate,
    String? summary,
    String? selfAssessment,
  }) {
    return DailyReport(
      uuid: _uuidFactory.v4(),
      userId: userId,
      reportDate: reportDate,
      summary: summary,
      selfAssessment: selfAssessment,
    );
  }

  static const String entityType = 'daily_reports';

  @override
  final String uuid;
  final int userId;
  final String reportDate;
  final String? summary;
  final String? selfAssessment;

  /// Server-computed snapshot. The client never calculates or overwrites this.
  final double calculatedScore;
  final int scheduledCount;
  final int completedCount;
  final String? submittedAt;
  @override
  final SyncState syncState;
  @override
  final int serverVersion;
  @override
  final bool isDeleted;
  @override
  final String? clientUpdatedAt;

  @override
  String get boxKey => '${userId}_$reportDate';

  @override
  Map<String, dynamic> toSyncPayload() => <String, dynamic>{
        'report_date': reportDate,
        'summary': summary,
        'self_assessment': selfAssessment,
      };

  DailyReport copyWith({
    String? uuid,
    int? userId,
    String? reportDate,
    String? summary,
    String? selfAssessment,
    double? calculatedScore,
    int? scheduledCount,
    int? completedCount,
    String? submittedAt,
    SyncState? syncState,
    int? serverVersion,
    bool? isDeleted,
    String? clientUpdatedAt,
  }) {
    return DailyReport(
      uuid: uuid ?? this.uuid,
      userId: userId ?? this.userId,
      reportDate: reportDate ?? this.reportDate,
      summary: summary ?? this.summary,
      selfAssessment: selfAssessment ?? this.selfAssessment,
      calculatedScore: calculatedScore ?? this.calculatedScore,
      scheduledCount: scheduledCount ?? this.scheduledCount,
      completedCount: completedCount ?? this.completedCount,
      submittedAt: submittedAt ?? this.submittedAt,
      syncState: syncState ?? this.syncState,
      serverVersion: serverVersion ?? this.serverVersion,
      isDeleted: isDeleted ?? this.isDeleted,
      clientUpdatedAt: clientUpdatedAt ?? this.clientUpdatedAt,
    );
  }
}

class ExerciseRecord implements OfflineEntity {
  const ExerciseRecord({
    required this.uuid,
    required this.userId,
    required this.exerciseType,
    required this.title,
    required this.recordedAt,
    this.activityId,
    this.durationMinutes,
    this.distance,
    this.caloriesBurned,
    this.notes,
    this.syncState = SyncState.pendingCreate,
    this.serverVersion = 0,
    this.isDeleted = false,
    this.clientUpdatedAt,
  });

  factory ExerciseRecord.create({
    required int userId,
    required String exerciseType,
    required String title,
    required String recordedAt,
    int? activityId,
    int? durationMinutes,
    double? distance,
    int? caloriesBurned,
    String? notes,
  }) {
    return ExerciseRecord(
      uuid: _uuidFactory.v4(),
      userId: userId,
      exerciseType: exerciseType,
      title: title,
      recordedAt: recordedAt,
      activityId: activityId,
      durationMinutes: durationMinutes,
      distance: distance,
      caloriesBurned: caloriesBurned,
      notes: notes,
    );
  }

  static const String entityType = 'exercise_records';

  @override
  final String uuid;
  final int userId;
  final int? activityId;
  final String exerciseType;
  final String title;
  final int? durationMinutes;
  final double? distance;
  final int? caloriesBurned;
  final String? notes;
  final String recordedAt;
  @override
  final SyncState syncState;
  @override
  final int serverVersion;
  @override
  final bool isDeleted;
  @override
  final String? clientUpdatedAt;

  @override
  String get boxKey => uuid;

  @override
  Map<String, dynamic> toSyncPayload() => <String, dynamic>{
        'activity_id': activityId,
        'exercise_type': exerciseType,
        'title': title,
        'duration_minutes': durationMinutes,
        'distance': distance,
        'calories_burned': caloriesBurned,
        'notes': notes,
        'recorded_at': recordedAt,
      };

  ExerciseRecord copyWith({
    String? uuid,
    int? userId,
    int? activityId,
    String? exerciseType,
    String? title,
    int? durationMinutes,
    double? distance,
    int? caloriesBurned,
    String? notes,
    String? recordedAt,
    SyncState? syncState,
    int? serverVersion,
    bool? isDeleted,
    String? clientUpdatedAt,
  }) {
    return ExerciseRecord(
      uuid: uuid ?? this.uuid,
      userId: userId ?? this.userId,
      activityId: activityId ?? this.activityId,
      exerciseType: exerciseType ?? this.exerciseType,
      title: title ?? this.title,
      durationMinutes: durationMinutes ?? this.durationMinutes,
      distance: distance ?? this.distance,
      caloriesBurned: caloriesBurned ?? this.caloriesBurned,
      notes: notes ?? this.notes,
      recordedAt: recordedAt ?? this.recordedAt,
      syncState: syncState ?? this.syncState,
      serverVersion: serverVersion ?? this.serverVersion,
      isDeleted: isDeleted ?? this.isDeleted,
      clientUpdatedAt: clientUpdatedAt ?? this.clientUpdatedAt,
    );
  }
}

class HealthRecord implements OfflineEntity {
  const HealthRecord({
    required this.uuid,
    required this.userId,
    required this.recordDate,
    this.weightKg,
    this.waterMl,
    this.sleepHours,
    this.bloodPressureSystolic,
    this.bloodPressureDiastolic,
    this.notes,
    this.syncState = SyncState.pendingCreate,
    this.serverVersion = 0,
    this.isDeleted = false,
    this.clientUpdatedAt,
  });

  factory HealthRecord.create({
    required int userId,
    required String recordDate,
    double? weightKg,
    int? waterMl,
    double? sleepHours,
    int? bloodPressureSystolic,
    int? bloodPressureDiastolic,
    String? notes,
  }) {
    return HealthRecord(
      uuid: _uuidFactory.v4(),
      userId: userId,
      recordDate: recordDate,
      weightKg: weightKg,
      waterMl: waterMl,
      sleepHours: sleepHours,
      bloodPressureSystolic: bloodPressureSystolic,
      bloodPressureDiastolic: bloodPressureDiastolic,
      notes: notes,
    );
  }

  static const String entityType = 'health_records';

  @override
  final String uuid;
  final int userId;
  final String recordDate;
  final double? weightKg;
  final int? waterMl;
  final double? sleepHours;
  final int? bloodPressureSystolic;
  final int? bloodPressureDiastolic;
  final String? notes;
  @override
  final SyncState syncState;
  @override
  final int serverVersion;
  @override
  final bool isDeleted;
  @override
  final String? clientUpdatedAt;

  @override
  String get boxKey => '${userId}_$recordDate';

  @override
  Map<String, dynamic> toSyncPayload() => <String, dynamic>{
        'record_date': recordDate,
        'weight_kg': weightKg,
        'water_ml': waterMl,
        'sleep_hours': sleepHours,
        'blood_pressure_systolic': bloodPressureSystolic,
        'blood_pressure_diastolic': bloodPressureDiastolic,
        'notes': notes,
      };

  HealthRecord copyWith({
    String? uuid,
    int? userId,
    String? recordDate,
    double? weightKg,
    int? waterMl,
    double? sleepHours,
    int? bloodPressureSystolic,
    int? bloodPressureDiastolic,
    String? notes,
    SyncState? syncState,
    int? serverVersion,
    bool? isDeleted,
    String? clientUpdatedAt,
  }) {
    return HealthRecord(
      uuid: uuid ?? this.uuid,
      userId: userId ?? this.userId,
      recordDate: recordDate ?? this.recordDate,
      weightKg: weightKg ?? this.weightKg,
      waterMl: waterMl ?? this.waterMl,
      sleepHours: sleepHours ?? this.sleepHours,
      bloodPressureSystolic:
          bloodPressureSystolic ?? this.bloodPressureSystolic,
      bloodPressureDiastolic:
          bloodPressureDiastolic ?? this.bloodPressureDiastolic,
      notes: notes ?? this.notes,
      syncState: syncState ?? this.syncState,
      serverVersion: serverVersion ?? this.serverVersion,
      isDeleted: isDeleted ?? this.isDeleted,
      clientUpdatedAt: clientUpdatedAt ?? this.clientUpdatedAt,
    );
  }
}

/// A single pending mutation, serialized 1:1 with Laravel `sync_operations`.
class SyncQueueEntry {
  const SyncQueueEntry({
    required this.operationUuid,
    required this.entityType,
    required this.entityUuid,
    required this.operationType,
    required this.payload,
    this.clientVersion = 1,
    this.clientUpdatedAt,
    required this.queuedAt,
    this.attempts = 0,
    this.isProcessed = false,
    this.processedAt,
  });

  factory SyncQueueEntry.pending({
    required String entityType,
    required String entityUuid,
    required String operationType,
    required Map<String, dynamic> payload,
    int clientVersion = 1,
    String? clientUpdatedAt,
  }) {
    return SyncQueueEntry(
      operationUuid: _uuidFactory.v4(),
      entityType: entityType,
      entityUuid: entityUuid,
      operationType: operationType,
      payload: payload,
      clientVersion: clientVersion,
      clientUpdatedAt: clientUpdatedAt ?? _nowIso8601(),
      queuedAt: _nowIso8601(),
    );
  }

  final String operationUuid;
  final String entityType;
  final String entityUuid;
  final String operationType;
  final Map<String, dynamic> payload;
  final int clientVersion;
  final String? clientUpdatedAt;
  final String queuedAt;
  final int attempts;
  final bool isProcessed;
  final String? processedAt;

  /// Body accepted by `POST /api/v1/sync/push`.
  Map<String, dynamic> toJson() => <String, dynamic>{
        'operation_uuid': operationUuid,
        'entity_type': entityType,
        'entity_uuid': entityUuid,
        'operation_type': operationType,
        'client_version': clientVersion,
        'client_updated_at': clientUpdatedAt ?? _nowIso8601(),
        'payload': payload,
      };

  SyncQueueEntry copyWith({
    String? operationType,
    Map<String, dynamic>? payload,
    int? clientVersion,
    String? clientUpdatedAt,
    int? attempts,
    bool? isProcessed,
    String? processedAt,
  }) {
    return SyncQueueEntry(
      operationUuid: operationUuid,
      entityType: entityType,
      entityUuid: entityUuid,
      operationType: operationType ?? this.operationType,
      payload: payload ?? this.payload,
      clientVersion: clientVersion ?? this.clientVersion,
      clientUpdatedAt: clientUpdatedAt ?? this.clientUpdatedAt,
      queuedAt: queuedAt,
      attempts: attempts ?? this.attempts,
      isProcessed: isProcessed ?? this.isProcessed,
      processedAt: processedAt ?? this.processedAt,
    );
  }
}
