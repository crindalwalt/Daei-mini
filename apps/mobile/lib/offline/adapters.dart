import 'package:hive/hive.dart';

import 'hive_config.dart';
import 'models.dart';

Map<int, dynamic> _readFields(BinaryReader reader) {
  final count = reader.readByte();
  final fields = <int, dynamic>{};
  for (var i = 0; i < count; i++) {
    fields[reader.readByte()] = reader.read();
  }
  return fields;
}

void _writeFields(BinaryWriter writer, Map<int, dynamic> fields) {
  writer.writeByte(fields.length);
  fields.forEach((int key, dynamic value) {
    writer.writeByte(key);
    writer.write(value);
  });
}

int _asInt(dynamic value) => (value as num).toInt();

double? _asNullableDouble(dynamic value) =>
    value == null ? null : (value as num).toDouble();

SyncState _asSyncState(dynamic value) {
  final index = value is int ? value : 0;
  return SyncState.values[index.clamp(0, SyncState.values.length - 1)];
}

class JournalEntryAdapter extends TypeAdapter<JournalEntry> {
  @override
  final int typeId = HiveTypeIds.journalEntry;

  @override
  JournalEntry read(BinaryReader reader) {
    final fields = _readFields(reader);
    return JournalEntry(
      uuid: fields[0] as String,
      userId: _asInt(fields[1]),
      entryDate: fields[2] as String,
      title: fields[3] as String?,
      content: fields[4] as String? ?? '',
      syncState: _asSyncState(fields[5]),
      serverVersion: _asInt(fields[6] ?? 0),
      isDeleted: fields[7] as bool? ?? false,
      clientUpdatedAt: fields[8] as String?,
    );
  }

  @override
  void write(BinaryWriter writer, JournalEntry obj) {
    _writeFields(writer, <int, dynamic>{
      0: obj.uuid,
      1: obj.userId,
      2: obj.entryDate,
      3: obj.title,
      4: obj.content,
      5: obj.syncState.index,
      6: obj.serverVersion,
      7: obj.isDeleted,
      8: obj.clientUpdatedAt,
    });
  }
}

class DailyReportAdapter extends TypeAdapter<DailyReport> {
  @override
  final int typeId = HiveTypeIds.dailyReport;

  @override
  DailyReport read(BinaryReader reader) {
    final fields = _readFields(reader);
    return DailyReport(
      uuid: fields[0] as String,
      userId: _asInt(fields[1]),
      reportDate: fields[2] as String,
      summary: fields[3] as String?,
      selfAssessment: fields[4] as String?,
      calculatedScore: _asNullableDouble(fields[5]) ?? 0,
      scheduledCount: _asInt(fields[6] ?? 0),
      completedCount: _asInt(fields[7] ?? 0),
      submittedAt: fields[8] as String?,
      syncState: _asSyncState(fields[9]),
      serverVersion: _asInt(fields[10] ?? 0),
      isDeleted: fields[11] as bool? ?? false,
      clientUpdatedAt: fields[12] as String?,
    );
  }

  @override
  void write(BinaryWriter writer, DailyReport obj) {
    _writeFields(writer, <int, dynamic>{
      0: obj.uuid,
      1: obj.userId,
      2: obj.reportDate,
      3: obj.summary,
      4: obj.selfAssessment,
      5: obj.calculatedScore,
      6: obj.scheduledCount,
      7: obj.completedCount,
      8: obj.submittedAt,
      9: obj.syncState.index,
      10: obj.serverVersion,
      11: obj.isDeleted,
      12: obj.clientUpdatedAt,
    });
  }
}

class ExerciseRecordAdapter extends TypeAdapter<ExerciseRecord> {
  @override
  final int typeId = HiveTypeIds.exerciseRecord;

  @override
  ExerciseRecord read(BinaryReader reader) {
    final fields = _readFields(reader);
    return ExerciseRecord(
      uuid: fields[0] as String,
      userId: _asInt(fields[1]),
      activityId: fields[2] == null ? null : _asInt(fields[2]),
      exerciseType: fields[3] as String,
      title: fields[4] as String,
      durationMinutes: fields[5] == null ? null : _asInt(fields[5]),
      distance: _asNullableDouble(fields[6]),
      caloriesBurned: fields[7] == null ? null : _asInt(fields[7]),
      notes: fields[8] as String?,
      recordedAt: fields[9] as String,
      syncState: _asSyncState(fields[10]),
      serverVersion: _asInt(fields[11] ?? 0),
      isDeleted: fields[12] as bool? ?? false,
      clientUpdatedAt: fields[13] as String?,
    );
  }

  @override
  void write(BinaryWriter writer, ExerciseRecord obj) {
    _writeFields(writer, <int, dynamic>{
      0: obj.uuid,
      1: obj.userId,
      2: obj.activityId,
      3: obj.exerciseType,
      4: obj.title,
      5: obj.durationMinutes,
      6: obj.distance,
      7: obj.caloriesBurned,
      8: obj.notes,
      9: obj.recordedAt,
      10: obj.syncState.index,
      11: obj.serverVersion,
      12: obj.isDeleted,
      13: obj.clientUpdatedAt,
    });
  }
}

class HealthRecordAdapter extends TypeAdapter<HealthRecord> {
  @override
  final int typeId = HiveTypeIds.healthRecord;

  @override
  HealthRecord read(BinaryReader reader) {
    final fields = _readFields(reader);
    return HealthRecord(
      uuid: fields[0] as String,
      userId: _asInt(fields[1]),
      recordDate: fields[2] as String,
      weightKg: _asNullableDouble(fields[3]),
      waterMl: fields[4] == null ? null : _asInt(fields[4]),
      sleepHours: _asNullableDouble(fields[5]),
      bloodPressureSystolic: fields[6] == null ? null : _asInt(fields[6]),
      bloodPressureDiastolic: fields[7] == null ? null : _asInt(fields[7]),
      notes: fields[8] as String?,
      syncState: _asSyncState(fields[9]),
      serverVersion: _asInt(fields[10] ?? 0),
      isDeleted: fields[11] as bool? ?? false,
      clientUpdatedAt: fields[12] as String?,
    );
  }

  @override
  void write(BinaryWriter writer, HealthRecord obj) {
    _writeFields(writer, <int, dynamic>{
      0: obj.uuid,
      1: obj.userId,
      2: obj.recordDate,
      3: obj.weightKg,
      4: obj.waterMl,
      5: obj.sleepHours,
      6: obj.bloodPressureSystolic,
      7: obj.bloodPressureDiastolic,
      8: obj.notes,
      9: obj.syncState.index,
      10: obj.serverVersion,
      11: obj.isDeleted,
      12: obj.clientUpdatedAt,
    });
  }
}

class SyncQueueEntryAdapter extends TypeAdapter<SyncQueueEntry> {
  @override
  final int typeId = HiveTypeIds.syncQueueEntry;

  @override
  SyncQueueEntry read(BinaryReader reader) {
    final fields = _readFields(reader);
    return SyncQueueEntry(
      operationUuid: fields[0] as String,
      entityType: fields[1] as String,
      entityUuid: fields[2] as String,
      operationType: fields[3] as String,
      payload: Map<String, dynamic>.from(fields[4] as Map),
      clientVersion: _asInt(fields[5] ?? 1),
      clientUpdatedAt: fields[6] as String?,
      queuedAt: fields[7] as String,
      attempts: _asInt(fields[8] ?? 0),
      isProcessed: fields[9] as bool? ?? false,
      processedAt: fields[10] as String?,
    );
  }

  @override
  void write(BinaryWriter writer, SyncQueueEntry obj) {
    _writeFields(writer, <int, dynamic>{
      0: obj.operationUuid,
      1: obj.entityType,
      2: obj.entityUuid,
      3: obj.operationType,
      4: obj.payload,
      5: obj.clientVersion,
      6: obj.clientUpdatedAt,
      7: obj.queuedAt,
      8: obj.attempts,
      9: obj.isProcessed,
      10: obj.processedAt,
    });
  }
}
