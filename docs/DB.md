# Daei Mini — Database Architecture & Operations

## 1. Database Overview

Daei Mini is a mobile productivity and personal development application. Its database supports personal planning, worship and activity tracking, habits, goals, journaling, daily reports, administrator oversight, and offline synchronization.

### Database technology

| Property | Specification |
|---|---|
| Backend framework | Laravel |
| Primary database | PostgreSQL |
| Database encoding | UTF-8 |
| Database port | 5432 (container/internal default) |
| Database name | `daei_mini` |
| Database user | Configured through environment variables |
| ORM | Laravel Eloquent |
| Schema management | Laravel migrations |
| Test data | Laravel factories and seeders |

> **Configuration note:** Exact PostgreSQL version, deployment topology, credentials, hosting, and local mobile database technology must be confirmed during technical setup. Never commit database credentials to source control.

### Environment configuration

Example `.env` values:

```dotenv
DB_CONNECTION=pgsql
DB_HOST=postgres
DB_PORT=5432
DB_DATABASE=daei_mini
DB_USERNAME=${DB_USERNAME}
DB_PASSWORD=${DB_PASSWORD}
```

Use actual secret values through the deployment environment or secret manager. The `${...}` placeholders above are illustrative and should not be copied as literal Laravel `.env` values.

---

## 2. Database Design Principles

- Use PostgreSQL as the authoritative server-side relational database.
- Use Laravel migrations as the version-controlled source of schema changes.
- Use Eloquent models and explicit relationships for application data.
- Enforce ownership and authorization on the server; never rely only on mobile UI restrictions.
- Use foreign keys, unique constraints, indexes, and check constraints where appropriate.
- Store timestamps consistently and preserve the user's activity date separately from synchronization time.
- Support offline-created records with stable client-generated UUIDs and synchronization metadata.
- Keep private journal content inaccessible to administrators unless a separately approved authorization rule explicitly allows it.
- Use soft deletes only where restoration or synchronization requirements justify them.
- Store passwords using Laravel's supported secure password hashing.
- Keep production demo accounts and sample credentials disabled.

---

## 3. Relational Schema & Migrations

Baseline migrations should reside in:

```text
apps/backend/database/migrations/
```

The following is the proposed logical schema based on the Daei Mini scope. Exact column types, nullability, and constraints should be finalized during implementation and reviewed against approved requirements.

### 3.1 Authentication and Access Control

#### `users`

Stores registered user and administrator accounts.

| Column | Description |
|---|---|
| `id` | Primary key |
| `uuid` | Stable public/client identifier; unique |
| `name` | User's display name |
| `email` | Unique login email |
| `email_verified_at` | Email verification timestamp; nullable |
| `password` | Securely hashed password |
| `role` | Account role, such as `user` or `admin` |
| `is_active` | Whether the account is enabled |
| `remember_token` | Nullable remember token |
| `created_at`, `updated_at` | Laravel timestamps |

**Constraints and indexes**
- Unique index on `email`.
- Unique index on `uuid`.
- Index on `role` and `is_active` where useful.
- Role values must be restricted to supported roles.
- Public administrator registration is not permitted by the approved scope.

#### `password_reset_tokens`

Stores password-reset tokens.

| Column | Description |
|---|---|
| `email` | Primary key |
| `token` | Reset token |
| `created_at` | Creation timestamp; nullable |

#### `sessions`

Laravel database-backed session storage, if selected.

| Column | Description |
|---|---|
| `id` | Session primary key |
| `user_id` | Nullable user reference |
| `ip_address` | Nullable IP address |
| `user_agent` | Nullable client information |
| `payload` | Session payload |
| `last_activity` | Last activity timestamp/index value |

The session driver is a deployment decision.

#### `personal_access_tokens`

Laravel Sanctum token storage, if Sanctum is selected for API authentication.

| Column | Description |
|---|---|
| `id` | Primary key |
| `tokenable_type`, `tokenable_id` | Polymorphic account reference |
| `name` | Token name |
| `token` | Hashed token; unique |
| `abilities` | Nullable token abilities |
| `last_used_at` | Nullable last-use timestamp |
| `expires_at` | Nullable expiration timestamp |
| `created_at`, `updated_at` | Timestamps |

---

### 3.2 Groups and User Assignments

#### `groups`

Stores groups managed by authorized administrators.

| Column | Description |
|---|---|
| `id` | Primary key |
| `uuid` | Stable unique identifier |
| `name` | Group name |
| `description` | Nullable description |
| `created_by` | Administrator/user reference |
| `created_at`, `updated_at` | Timestamps |

#### `group_user`

Pivot table connecting users and groups.

| Column | Description |
|---|---|
| `group_id` | Foreign key to `groups` |
| `user_id` | Foreign key to `users` |
| `assigned_by` | Nullable assigning administrator |
| `assigned_at` | Assignment timestamp |
| `created_at`, `updated_at` | Timestamps |

**Constraints**
- Unique composite key on (`group_id`, `user_id`).
- Foreign keys must prevent orphaned assignments.
- Group creation and assignment permissions must follow approved administrator rules.

---

### 3.3 Activities and Daily Timetable

#### `activities`

Stores user-created timetable activities.

| Column | Description |
|---|---|
| `id` | Primary key |
| `uuid` | Stable unique identifier for offline sync |
| `user_id` | Owner of the activity |
| `title` | Activity title |
| `description` | Nullable description |
| `activity_type` | Activity category |
| `scheduled_date` | Date of the planned activity |
| `start_time` | Scheduled start time |
| `end_time` | Scheduled end time |
| `status` | `pending`, `completed`, or `missed` |
| `reminder_enabled` | Whether reminder is enabled |
| `created_at`, `updated_at` | Timestamps |
| `deleted_at` | Nullable soft-delete timestamp, if soft deletes are used |

**Activity types** may include:
- `prayer`
- `quran`
- `tafseer`
- `reading`
- `habit`
- `goal`
- `exercise`
- `personal`
- `other`

The final enum values should be centralized in Laravel enums and aligned with approved UI requirements.

**Constraints and indexes**
- Index (`user_id`, `scheduled_date`).
- Index (`user_id`, `status`).
- Validate `end_time` is later than `start_time` when both are present.
- Activity ownership must be enforced.
- Overlapping activities should be detected through application-level scheduling rules; automatic rescheduling is excluded.

---

### 3.4 Prayer Tracking

Prayer tracking is represented through timetable activities.

Supported prayer names:
- Fajr
- Dhuhr
- Asr
- Maghrib
- Isha

Prayer activities use `activity_type = prayer`. The prayer name may be represented by a validated activity subtype or dedicated field if required by the final implementation.

**Scope boundary:** Automatic prayer-time calculation, location-based prayer schedules, and religious calendar integration remain pending confirmation. The database must not assume a calculation provider or methodology before approval.

---

### 3.5 Quran and Tafseer Activity Tracking

Quran and Tafseer sessions are timetable activities only.

- Use `activity_type = quran` or `tafseer`.
- Store title, scheduled date/time, status, and optional reminder in `activities`.
- Do not add Quran/Tafseer text, translations, audio, downloads, or in-app reading content tables unless separately approved.

---

### 3.6 Habits

#### `habits`

Stores user-defined habits.

| Column | Description |
|---|---|
| `id` | Primary key |
| `uuid` | Stable unique identifier |
| `user_id` | Habit owner |
| `name` | Habit name |
| `description` | Nullable description |
| `is_active` | Whether habit is active |
| `created_at`, `updated_at` | Timestamps |
| `deleted_at` | Nullable, if soft deletes are used |

#### `habit_records`

Stores habit completion history.

| Column | Description |
|---|---|
| `id` | Primary key |
| `uuid` | Stable unique identifier |
| `habit_id` | Foreign key to `habits` |
| `user_id` | Owner reference for authorization and querying |
| `record_date` | Date being tracked |
| `status` | Completion status |
| `notes` | Nullable note |
| `created_at`, `updated_at` | Timestamps |

**Constraints**
- Prevent duplicate records for the same habit and date.
- Index (`user_id`, `record_date`).
- History must remain available for reporting.

---

### 3.7 Goals and Personal Development

#### `goals`

Stores personal development goals.

| Column | Description |
|---|---|
| `id` | Primary key |
| `uuid` | Stable unique identifier |
| `user_id` | Goal owner |
| `title` | Goal title |
| `description` | Nullable description |
| `target_date` | Nullable target date |
| `progress` | Progress value, with approved range |
| `status` | Goal status |
| `achieved_at` | Nullable achievement timestamp |
| `created_at`, `updated_at` | Timestamps |

**Scope boundary:** AI-generated goal planning and automatic goal decomposition are excluded unless separately approved.

---

### 3.8 Exercise and Fitness Activities

Exercise sessions are represented through `activities` using `activity_type = exercise`.

If implementation requires structured exercise details, an optional `exercise_records` table may be introduced after requirements confirmation. Do not assume wearable integration or automatic health-data collection.

---

### 3.9 Personal Journal

#### `journal_entries`

Stores private user journal entries.

| Column | Description |
|---|---|
| `id` | Primary key |
| `uuid` | Stable unique identifier for offline sync |
| `user_id` | Journal owner |
| `entry_date` | Date the entry belongs to |
| `title` | Nullable title |
| `content` | Journal text |
| `created_at` | Original creation timestamp |
| `updated_at` | Last modification timestamp |
| `deleted_at` | Nullable soft-delete timestamp, if required |

**Security**
- Journal entries are private to their owner.
- Administrators must not access journal content by default.
- Offline entries must preserve their original entry date and timestamps during synchronization.
- AI-based journal analysis, summaries, and emotional/psychological analysis are excluded.

**Indexes**
- (`user_id`, `entry_date`)
- (`user_id`, `updated_at`)

---

### 3.10 Notifications and Reminders

#### `activity_reminders`

Stores reminder configuration for activities.

| Column | Description |
|---|---|
| `id` | Primary key |
| `uuid` | Stable unique identifier |
| `activity_id` | Related activity |
| `user_id` | Reminder owner |
| `reminder_at` | Reminder time/configuration |
| `is_enabled` | Whether reminder is enabled |
| `created_at`, `updated_at` | Timestamps |

Reminder delivery may use device-local notifications, push notifications, or another approved implementation. The exact mechanism is a technical decision.

**Scope boundary:** AI-generated reminder scheduling and mandatory alarms for every activity are excluded.

---

### 3.11 Daily Reports and Self-Assessment

#### `daily_reports`

Stores user-submitted daily reports.

| Column | Description |
|---|---|
| `id` | Primary key |
| `uuid` | Stable unique identifier |
| `user_id` | Report owner |
| `report_date` | Date being reported |
| `summary` | Activity summary |
| `self_assessment` | User's self-assessment |
| `submitted_at` | Submission timestamp |
| `created_at`, `updated_at` | Timestamps |

**Constraints and rules**
- Unique report per user and report date, unless approved requirements specify otherwise.
- Users may edit the current day's report only.
- Previous-day reports are view-only.
- The server must enforce the editing restriction.
- Original report date and submission timestamp must be preserved when offline reports synchronize.
- A late synchronization must not make a previous-day report editable.

#### `daily_report_activities`

Optional snapshot table for recording activity status as part of a submitted report.

| Column | Description |
|---|---|
| `id` | Primary key |
| `daily_report_id` | Related report |
| `activity_id` | Nullable original activity reference |
| `activity_title` | Activity title snapshot |
| `activity_status` | Status at report submission |
| `created_at`, `updated_at` | Timestamps |

Use this table if immutable report snapshots are required by the approved implementation. Otherwise, reports may derive summaries from activity records.

---

### 3.12 Administrator Comments and Feedback

#### `activity_comments`

Stores administrator feedback on activities.

| Column | Description |
|---|---|
| `id` | Primary key |
| `uuid` | Stable unique identifier |
| `activity_id` | Related activity |
| `author_id` | Administrator who wrote the comment |
| `comment` | Comment content |
| `created_at`, `updated_at` | Timestamps |

#### `daily_report_comments`

Stores administrator feedback on daily reports.

| Column | Description |
|---|---|
| `id` | Primary key |
| `uuid` | Stable unique identifier |
| `daily_report_id` | Related report |
| `author_id` | Administrator who wrote the comment |
| `comment` | Comment content |
| `created_at`, `updated_at` | Timestamps |

Only authorized administrators may create feedback. Users may view feedback associated with their own activities and reports.

---

### 3.13 Digital Library and Reading Progress

The digital library scope is conditional on an approved content source and supported formats.

Potential table, only if approved:

#### `reading_records`

| Column | Description |
|---|---|
| `id` | Primary key |
| `uuid` | Stable unique identifier |
| `user_id` | Reader |
| `title` | Reading material title |
| `source_reference` | Nullable reference to approved content |
| `progress` | Reading progress, if supported |
| `last_read_at` | Nullable timestamp |
| `created_at`, `updated_at` | Timestamps |

Do not implement copyrighted content distribution without authorization. External book purchasing is excluded. Final content source and formats are pending confirmation.

---

## 4. Laravel Models and Relationships

Recommended Eloquent models:

| Model | Main relationships |
|---|---|
| `User` | hasMany activities, habits, goals, journal entries, daily reports; belongsToMany groups |
| `Group` | belongsTo creator; belongsToMany users |
| `Activity` | belongsTo user; hasMany reminders and comments |
| `Habit` | belongsTo user; hasMany habit records |
| `HabitRecord` | belongsTo habit and user |
| `Goal` | belongsTo user |
| `JournalEntry` | belongsTo user |
| `ActivityReminder` | belongsTo activity and user |
| `DailyReport` | belongsTo user; hasMany comments and optional activity snapshots |
| `ActivityComment` | belongsTo activity and author |
| `DailyReportComment` | belongsTo daily report and author |
| `ReadingRecord` | belongsTo user, if implemented |

Use explicit relationship names and avoid exposing unrestricted model serialization from API endpoints.

---

## 5. Enums and Status Values

Recommended Laravel backed enums:

### `UserRole`
- `user`
- `admin`

### `ActivityStatus`
- `pending`
- `completed`
- `missed`

### `ActivityType`
- `prayer`
- `quran`
- `tafseer`
- `reading`
- `habit`
- `goal`
- `exercise`
- `personal`
- `other`

### `GoalStatus`
- `not_started`
- `in_progress`
- `completed`
- `paused`

### `SyncStatus`
- `pending`
- `synced`
- `failed`

> Enum values are proposed implementation values and must be kept consistent across Laravel validation, database constraints, API responses, and the mobile client.

---

## 6. Offline-First Data and Synchronization

The mobile application will maintain a local database for supported offline features. The exact local database technology remains pending confirmation.

### 6.1 Offline-capable data

Subject to final module confirmation, local storage may include:
- Previously synchronized timetable activities.
- Supported activity completion records.
- Journal entries.
- Daily reports recorded offline.
- Pending changes awaiting synchronization.

### 6.2 Synchronization metadata

For records that can be created or changed offline, use a stable `uuid` and synchronization metadata. This may be implemented through common columns or a dedicated synchronization table.

Recommended metadata:

| Field | Purpose |
|---|---|
| `uuid` | Stable client/server record identity |
| `client_updated_at` | Client-side modification timestamp |
| `synced_at` | Last successful server synchronization |
| `sync_status` | Pending, synced, or failed |
| `deleted_at` | Optional deletion marker for sync-aware deletion |

### 6.3 Synchronization rules

1. Identify pending local changes when connectivity returns.
2. Send changes to the server using stable record identifiers.
3. Validate ownership and authorization on the server.
4. Prevent duplicate records through unique identifiers and idempotent handling.
5. Mark successful records as synchronized.
6. Retry failed synchronization attempts safely.
7. Preserve original activity/report dates and timestamps.
8. Do not allow late synchronization to bypass previous-day report restrictions.
9. Administrators cannot see records that have not yet synchronized to the server.

### 6.4 Conflict handling

The final conflict-resolution strategy must be confirmed during technical design. Do not silently overwrite user data without a defined policy. Record enough metadata to identify conflicting updates and handle retries idempotently.

---

## 7. Database Operations and Commands

Run commands from the Laravel backend directory.

### Run migrations

```bash
php artisan migrate
```

Production deployment:

```bash
php artisan migrate --force
```

### Roll back the latest migration batch

```bash
php artisan migrate:rollback
```

### Check migration status

```bash
php artisan migrate:status
```

### Run seeders

```bash
php artisan db:seed
```

### Refresh database (development only — destructive)

```bash
php artisan migrate:fresh --seed
```

> **Warning:** `migrate:fresh` drops all tables. Never run it against production or any database containing data that must be retained.

### Create a migration

```bash
php artisan make:migration create_activities_table
```

### Create a model with migration, factory, and seeder

```bash
php artisan make:model Activity -mfs
```

---

## 8. Factories and Seeders

Factories should generate realistic, internally consistent development and test data.

Recommended factories:
- `UserFactory`
- `GroupFactory`
- `ActivityFactory`
- `HabitFactory`
- `HabitRecordFactory`
- `GoalFactory`
- `JournalEntryFactory`
- `DailyReportFactory`
- `ActivityReminderFactory`
- Comment factories

Recommended seeders:
- `DatabaseSeeder`
- `DevelopmentUserSeeder`
- `DevelopmentGroupSeeder`
- `DevelopmentActivitySeeder`
- `DevelopmentHabitSeeder`
- `DevelopmentGoalSeeder`

### Seeding policy

- Seed sample data only in local/testing environments by default.
- Never seed a known default administrator password into production.
- Provision production administrators through a secure, documented process.
- Use factories for automated tests rather than relying on production-like sample credentials.

---

## 9. Backup and Restore Strategy

Backups should be scheduled according to deployment requirements and stored securely outside the database host.

### Create a PostgreSQL custom-format backup

```bash
pg_dump \
  --host="$DB_HOST" \
  --port="$DB_PORT" \
  --username="$DB_USERNAME" \
  --format=custom \
  --blobs \
  --verbose \
  --file="daei_mini_backup.dump" \
  "$DB_DATABASE"
```

### Restore a backup

```bash
pg_restore \
  --host="$DB_HOST" \
  --port="$DB_PORT" \
  --username="$DB_USERNAME" \
  --dbname="$DB_DATABASE" \
  --clean \
  --if-exists \
  --verbose \
  "daei_mini_backup.dump"
```

> Restore commands can overwrite existing data. Test restoration in a separate environment before using a backup for production recovery.

### Backup policy decisions

Confirm before release:
- Backup frequency.
- Retention duration.
- Encryption at rest and during transfer.
- Backup storage provider and access controls.
- Recovery Point Objective (RPO).
- Recovery Time Objective (RTO).
- Restoration testing schedule.

---

## 10. Indexing and Data Integrity

Recommended indexes, subject to query-plan validation:

| Table | Index |
|---|---|
| `users` | unique `email`; unique `uuid` |
| `activities` | (`user_id`, `scheduled_date`); (`user_id`, `status`) |
| `groups` | unique `uuid`; index `created_by` |
| `group_user` | unique (`group_id`, `user_id`); index `user_id` |
| `habits` | (`user_id`, `is_active`) |
| `habit_records` | unique (`habit_id`, `record_date`); (`user_id`, `record_date`) |
| `goals` | (`user_id`, `status`) |
| `journal_entries` | (`user_id`, `entry_date`); (`user_id`, `updated_at`) |
| `activity_reminders` | (`user_id`, `is_enabled`); index `activity_id` |
| `daily_reports` | unique (`user_id`, `report_date`); (`user_id`, `submitted_at`) |
| `activity_comments` | index `activity_id`; index `author_id` |
| `daily_report_comments` | index `daily_report_id`; index `author_id` |

Use foreign keys with deliberate deletion behavior. Avoid cascading deletion of important reports, journal records, or audit-relevant history without explicit approval.

---

## 11. Security and Privacy

- Enforce authentication for protected API endpoints.
- Apply role-based authorization for administrator and user operations.
- Scope user queries to the authenticated user's records.
- Prevent insecure direct object reference (IDOR) vulnerabilities.
- Keep journal entries private by default.
- Enforce report editing rules on the server.
- Validate all incoming data through Laravel Form Requests or equivalent validation.
- Use parameterized database operations and Eloquent safely.
- Protect secrets through environment configuration.
- Use HTTPS for production API traffic.
- Define retention and deletion policies before production.
- Log security-relevant events without logging passwords, tokens, or private journal content.
- Apply rate limiting to authentication and sensitive endpoints.

---

## 12. Scope Boundaries and Pending Decisions

The following are not to be assumed as finalized database requirements:

| Item | Status |
|---|---|
| PostgreSQL version | Confirm during environment setup |
| Mobile local database | Pending technical decision |
| Prayer-time calculation/provider | Pending confirmation |
| Automatic religious calendar integration | Not included unless approved |
| Digital library content source/formats | Pending confirmation |
| Firebase services/configuration | Scope document identifies Firebase; implementation direction here is Laravel + PostgreSQL and must be reconciled with supervisor approval |
| Offline modules | Exact supported modules to be confirmed |
| Synchronization conflict policy | Pending technical design |
| Reminder delivery mechanism | Pending technical decision |
| Group creation/assignment permissions | Pending confirmation |
| Daily report submission deadline | Pending confirmation |
| Data retention and encryption requirements | Pending security design |

### Explicitly excluded unless approved through change management

- AI-generated schedules or automatic rescheduling.
- Predictive activity recommendations or behavioral profiling.
- AI-generated habit or goal recommendations.
- AI-based journal analysis or emotional/psychological analysis.
- Quran/Tafseer content, translations, audio, downloads, and in-app reading.
- Unconfirmed wearable, health-platform, external calendar, or content integrations.
- Features not explicitly included in the approved scope.

---

## 13. Acceptance-Oriented Database Checklist

- [ ] User and administrator accounts are stored securely.
- [ ] Role-based access control is enforced.
- [ ] Users can create and manage their own timetable activities.
- [ ] Prayer and Quran/Tafseer activities are tracked as timetable activities.
- [ ] Habits and habit history are persisted.
- [ ] Goals and progress are persisted.
- [ ] Exercise activities can be recorded.
- [ ] Journal entries remain private and support approved offline behavior.
- [ ] Daily reports preserve their original date and submission timestamp.
- [ ] Previous-day reports cannot be edited through API requests.
- [ ] Administrators can access only authorized users, groups, activities, and reports.
- [ ] Administrator comments and feedback are persisted.
- [ ] Offline synchronization prevents duplicate records.
- [ ] Database migrations can be applied in a clean environment.
- [ ] Seeders do not expose production demo credentials.
- [ ] Backup and restore procedures are documented and tested.

---

## 14. Database Scope Summary

Daei Mini's proposed Laravel/PostgreSQL database supports user authentication, role-based access, groups, personal timetables, prayer and Quran/Tafseer activity tracking, habits, goals, exercise, private journaling, reminders, daily reports, administrator feedback, and offline synchronization metadata.

The database design follows the project's stated scope and preserves its exclusions. Pending decisions—especially local database technology, offline module coverage, synchronization conflict handling, prayer-time calculations, digital library content, and reminder delivery—must be finalized before implementation is treated as production-ready.

**Document status:** Database architecture draft for technical review.
