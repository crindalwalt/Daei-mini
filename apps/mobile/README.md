# Daei Mobile — Offline Hive Layer

This package contains the Flutter/Dart **offline synchronization layer** for the
Daei mobile client. It is intentionally dependency-light: it only requires
Hive, `hive_flutter`, and `uuid`.

> The repository does not currently contain a full Flutter application shell
> (no `android/`, `ios/`, or `lib/main.dart`). This package provides the
> reusable offline modules required by `docs/DB.md` §22.3. Once the app shell is
> added, call `OfflineBoxes.open()` during startup and use
> `OfflineSyncRepository` from your state management layer.

## Box layout

| Box | Key | Backend `entity_type` |
|---|---|---|
| `activities_box` | `uuid` | `activities` (existing) |
| `habits_box` | `uuid` | `habits` (existing) |
| `habit_records_box` | `${habit_uuid}_${record_date}` | `habit_records` (existing) |
| `goals_box` | `uuid` | `goals` (existing) |
| `shared_completions_box` | `${shared_activity_id}_${user_id}` | `shared_activity_completions` (existing) |
| `journal_entries_box` | `uuid` | `journal_entries` |
| `daily_reports_box` | `${user_id}_${report_date}` | `daily_reports` |
| `exercise_records_box` | `uuid` | `exercise_records` |
| `health_records_box` | `${user_id}_${record_date}` | `health_records` |
| `sync_queue_box` | `operation_uuid` (FIFO) | `sync_operations` |

All four new entities are handled idempotently by the Laravel `SyncService`
using their UUID (or the natural user + date composite key for daily reports and
health records). Each queued mutation maps 1:1 to a row in `sync_operations`.

## Usage

```dart
await OfflineBoxes.initialize();
final boxes = await OfflineBoxes.open();
final repository = OfflineSyncRepository(boxes);

repository.saveJournal(
  JournalEntry.create(
    userId: 42,
    entryDate: '2026-11-06',
    title: 'Evening reflection',
    content: 'Alhamdulillah.',
  ),
);

final pending = repository.pendingOperations();
// POST /api/v1/sync/push with { operations: pending.map((e) => e.toJson()).toList() }
```
