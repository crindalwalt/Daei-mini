/// Canonical Hive box names used by the Daei mobile client.
///
/// Keep these values in sync with `docs/DB.md` §22.3. The box name is part of
/// the on-device storage contract, so renaming a constant requires a migration.
class HiveBoxNames {
  HiveBoxNames._();

  static const String activities = 'activities_box';
  static const String habits = 'habits_box';
  static const String habitRecords = 'habit_records_box';
  static const String goals = 'goals_box';
  static const String sharedCompletions = 'shared_completions_box';

  static const String journalEntries = 'journal_entries_box';
  static const String dailyReports = 'daily_reports_box';
  static const String exerciseRecords = 'exercise_records_box';
  static const String healthRecords = 'health_records_box';

  static const String syncQueue = 'sync_queue_box';

  static const List<String> all = <String>[
    activities,
    habits,
    habitRecords,
    goals,
    sharedCompletions,
    journalEntries,
    dailyReports,
    exerciseRecords,
    healthRecords,
    syncQueue,
  ];
}

/// Stable Hive adapter type IDs.
///
/// IDs 0–99 are reserved for the pre-existing activity/habit/goal boxes.
/// Offline-scope entities added in the daily-report update use 101+ to avoid
/// collisions with adapters generated for the older boxes.
class HiveTypeIds {
  HiveTypeIds._();

  static const int journalEntry = 101;
  static const int dailyReport = 102;
  static const int exerciseRecord = 103;
  static const int healthRecord = 104;
  static const int syncQueueEntry = 105;
}
