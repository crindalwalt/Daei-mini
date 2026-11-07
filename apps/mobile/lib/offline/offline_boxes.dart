import 'package:hive/hive.dart';
import 'package:hive_flutter/hive_flutter.dart';

import 'adapters.dart';
import 'hive_config.dart';
import 'models.dart';

/// Opens and owns every Hive box used by the offline-first client.
///
/// Call [initialize] once from `main()` before any box is opened:
///
/// ```dart
/// await OfflineBoxes.initialize();
/// final boxes = await OfflineBoxes.open();
/// ```
class OfflineBoxes {
  OfflineBoxes._({
    required this.journalEntries,
    required this.dailyReports,
    required this.exerciseRecords,
    required this.healthRecords,
    required this.syncQueue,
  });

  final Box<JournalEntry> journalEntries;
  final Box<DailyReport> dailyReports;
  final Box<ExerciseRecord> exerciseRecords;
  final Box<HealthRecord> healthRecords;
  final Box<SyncQueueEntry> syncQueue;

  static bool _adaptersRegistered = false;

  static Future<void> initialize({String? subDir}) async {
    await Hive.initFlutter(subDir);
    _registerAdapters();
  }

  static Future<OfflineBoxes> open() async {
    _registerAdapters();

    return OfflineBoxes._(
      journalEntries:
          await Hive.openBox<JournalEntry>(HiveBoxNames.journalEntries),
      dailyReports:
          await Hive.openBox<DailyReport>(HiveBoxNames.dailyReports),
      exerciseRecords:
          await Hive.openBox<ExerciseRecord>(HiveBoxNames.exerciseRecords),
      healthRecords:
          await Hive.openBox<HealthRecord>(HiveBoxNames.healthRecords),
      syncQueue:
          await Hive.openBox<SyncQueueEntry>(HiveBoxNames.syncQueue),
    );
  }

  static void _registerAdapters() {
    if (_adaptersRegistered) {
      return;
    }

    _register<JournalEntry>(HiveTypeIds.journalEntry, JournalEntryAdapter());
    _register<DailyReport>(HiveTypeIds.dailyReport, DailyReportAdapter());
    _register<ExerciseRecord>(
      HiveTypeIds.exerciseRecord,
      ExerciseRecordAdapter(),
    );
    _register<HealthRecord>(HiveTypeIds.healthRecord, HealthRecordAdapter());
    _register<SyncQueueEntry>(
      HiveTypeIds.syncQueueEntry,
      SyncQueueEntryAdapter(),
    );

    _adaptersRegistered = true;
  }

  static void _register<T>(int typeId, TypeAdapter<T> adapter) {
    if (!Hive.isAdapterRegistered(typeId)) {
      Hive.registerAdapter<T>(adapter);
    }
  }
}
