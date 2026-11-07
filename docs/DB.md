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

# 15. Additional Database Modules

The following modules extend the existing database architecture without replacing any previously defined tables, relationships, migrations, models, or rules.

## 15.1 Admin Shared Timetable

The system must support Admin-created timetables that can be assigned to individual users or groups.

### shared_timetables

| Column | Type | Description |
|---|---|---|
| id | BIGINT | Primary key |
| uuid | UUID | Unique public identifier |
| title | VARCHAR(255) | Timetable title |
| description | TEXT NULL | Timetable description |
| created_by | BIGINT | Admin user ID |
| start_date | DATE NULL | Timetable start date |
| end_date | DATE NULL | Timetable end date |
| status | VARCHAR(30) | draft, published, archived |
| created_at | TIMESTAMP | Creation timestamp |
| updated_at | TIMESTAMP | Update timestamp |

### shared_timetable_activities

| Column | Type | Description |
|---|---|---|
| id | BIGINT | Primary key |
| shared_timetable_id | BIGINT | Related shared timetable |
| title | VARCHAR(255) | Activity title |
| description | TEXT NULL | Activity details |
| activity_date | DATE | Scheduled date |
| start_time | TIME NULL | Start time |
| end_time | TIME NULL | End time |
| sort_order | INTEGER DEFAULT 0 | Display order |
| created_at | TIMESTAMP | Creation timestamp |
| updated_at | TIMESTAMP | Update timestamp |

### shared_timetable_assignments

| Column | Type | Description |
|---|---|---|
| id | BIGINT | Primary key |
| shared_timetable_id | BIGINT | Related timetable |
| user_id | BIGINT NULL | Assigned individual user |
| group_id | BIGINT NULL | Assigned group |
| assigned_by | BIGINT | Admin user ID |
| assigned_at | TIMESTAMP | Assignment timestamp |

**Database Rules:**
- Exactly one of `user_id` or `group_id` must be provided.
- Only Admin users can create and assign shared timetables.
- Users can view timetables assigned to them or their groups.
- Assignment permissions must be enforced by Laravel policies.

### shared_activity_completions

Tracks each user's completion of shared activities independently.

| Column | Type | Description |
|---|---|---|
| id | BIGINT | Primary key |
| shared_timetable_activity_id | BIGINT | Related activity |
| user_id | BIGINT | User who performed the activity |
| status | VARCHAR(30) | pending, completed, skipped |
| completed_at | TIMESTAMP NULL | Completion time |
| notes | TEXT NULL | Optional notes |
| created_at | TIMESTAMP | Creation timestamp |
| updated_at | TIMESTAMP | Update timestamp |

**Constraint:** Unique combination of `shared_timetable_activity_id` and `user_id`.

An individual user's completion must never automatically mark the activity completed for other assigned users.

---

## 15.2 Digital Library

The Digital Library stores learning resources and their metadata. Actual files should be stored using a configured file-storage provider, not directly inside PostgreSQL.

### library_resources

| Column | Type | Description |
|---|---|---|
| id | BIGINT | Primary key |
| uuid | UUID | Unique identifier |
| title | VARCHAR(255) | Resource title |
| description | TEXT NULL | Resource description |
| file_name | VARCHAR(255) | Original file name |
| storage_disk | VARCHAR(100) | Laravel storage disk |
| storage_path | TEXT | Stored file location |
| mime_type | VARCHAR(150) | File MIME type |
| file_size | BIGINT | File size in bytes |
| uploaded_by | BIGINT | Admin user ID |
| visibility | VARCHAR(30) | private, assigned, public |
| status | VARCHAR(30) | active, archived |
| created_at | TIMESTAMP | Creation timestamp |
| updated_at | TIMESTAMP | Update timestamp |

### library_resource_permissions

Controls access to resources assigned to specific users or groups.

| Column | Type | Description |
|---|---|---|
| id | BIGINT | Primary key |
| library_resource_id | BIGINT | Related resource |
| user_id | BIGINT NULL | Individual user |
| group_id | BIGINT NULL | Assigned group |
| created_at | TIMESTAMP | Creation timestamp |

**Database Rules:**
- Exactly one of `user_id` or `group_id` must be provided.
- Only authorized users can access protected resources.
- File access must use Laravel authorization and secure storage URLs.
- Deleting a resource must follow an approved file-cleanup process.

---

## 15.3 User Bookmarks

Users can bookmark Digital Library resources.

### bookmarks

| Column | Type | Description |
|---|---|---|
| id | BIGINT | Primary key |
| user_id | BIGINT | Bookmark owner |
| library_resource_id | BIGINT | Bookmarked resource |
| created_at | TIMESTAMP | Bookmark timestamp |

**Constraints:**
- Unique combination of `user_id` and `library_resource_id`.
- A user can only manage their own bookmarks.
- Removing a bookmark must not delete the original resource.

---

## 15.4 Health and Fitness Records

The system must support personal exercise and fitness activity records.

### exercise_records

| Column | Type | Description |
|---|---|---|
| id | BIGINT | Primary key |
| uuid | UUID | Unique identifier |
| user_id | BIGINT | Record owner |
| exercise_type | VARCHAR(100) | Exercise category |
| title | VARCHAR(255) | Exercise title |
| duration_minutes | INTEGER NULL | Duration |
| distance | DECIMAL(10,2) NULL | Distance, when applicable |
| calories_burned | DECIMAL(10,2) NULL | Estimated calories |
| notes | TEXT NULL | Additional details |
| recorded_at | TIMESTAMP | Activity date and time |
| created_at | TIMESTAMP | Creation timestamp |
| updated_at | TIMESTAMP | Update timestamp |

**Database Rules:**
- Users can only manage their own exercise records.
- Duration and distance must be non-negative.
- Fitness records must remain private unless sharing is explicitly introduced.
- Health-related data must not be exposed to unauthorized users.

---

## 15.5 Prayer Location Preferences

Store user-specific preferences required for prayer-time configuration.

### user_prayer_preferences

| Column | Type | Description |
|---|---|---|
| id | BIGINT | Primary key |
| user_id | BIGINT | Related user |
| latitude | DECIMAL(10,7) NULL | Latitude |
| longitude | DECIMAL(10,7) NULL | Longitude |
| timezone | VARCHAR(100) | User timezone |
| calculation_method | VARCHAR(100) NULL | Selected calculation method |
| notifications_enabled | BOOLEAN DEFAULT TRUE | Prayer notifications preference |
| created_at | TIMESTAMP | Creation timestamp |
| updated_at | TIMESTAMP | Update timestamp |

**Constraints and Rules:**
- One preference record per user.
- `user_id` must be unique.
- Latitude must be between -90 and 90.
- Longitude must be between -180 and 180.
- Location data must be private and used only for authorized functionality.
- Prayer calculation rules and supported methods require product confirmation.

---

## 15.6 Firebase Cloud Messaging Device Tokens

Store device tokens required for push notifications.

### device_tokens

| Column | Type | Description |
|---|---|---|
| id | BIGINT | Primary key |
| user_id | BIGINT | Related user |
| device_token | TEXT | FCM registration token |
| device_type | VARCHAR(30) | android, ios, web |
| device_identifier | VARCHAR(255) NULL | Device identifier |
| is_active | BOOLEAN DEFAULT TRUE | Token status |
| last_used_at | TIMESTAMP NULL | Last token usage |
| created_at | TIMESTAMP | Creation timestamp |
| updated_at | TIMESTAMP | Update timestamp |

**Database Rules:**
- Tokens must not be exposed through public APIs.
- Invalid or expired tokens should be deactivated.
- A user may have multiple registered devices.
- Token updates must not create unnecessary duplicate records.
- Logout and device removal must follow the approved token lifecycle.

**Pending Decision:** Confirm whether Firebase is being used only for FCM notifications or whether other Firebase services are also required. The Laravel + PostgreSQL architecture remains the primary application backend and database unless the project scope is formally changed.

---

# 16. Offline Synchronization and Conflict Management

The system must support offline activity and later synchronization with the Laravel backend.

## 16.1 Synchronization Metadata

Offline-capable records should include the following fields where applicable:

| Column | Type | Description |
|---|---|---|
| uuid | UUID | Stable client-generated record identifier |
| client_created_at | TIMESTAMP NULL | Creation time on client |
| client_updated_at | TIMESTAMP NULL | Last client-side update |
| server_version | BIGINT DEFAULT 1 | Server record version |
| synced_at | TIMESTAMP NULL | Last successful synchronization |
| deleted_at | TIMESTAMP NULL | Soft-delete timestamp |

The existing primary key and relationships must remain unchanged. UUIDs provide stable identification across devices.

## 16.2 user_devices

Tracks devices registered for synchronization.

| Column | Type | Description |
|---|---|---|
| id | BIGINT | Primary key |
| uuid | UUID | Unique device identifier |
| user_id | BIGINT | Device owner |
| device_name | VARCHAR(255) NULL | Device name |
| platform | VARCHAR(50) | Device platform |
| last_sync_at | TIMESTAMP NULL | Last successful sync |
| is_active | BOOLEAN DEFAULT TRUE | Device status |
| created_at | TIMESTAMP | Creation timestamp |
| updated_at | TIMESTAMP | Update timestamp |

## 16.3 sync_operations

Tracks synchronization requests and prevents duplicate processing.

| Column | Type | Description |
|---|---|---|
| id | BIGINT | Primary key |
| operation_uuid | UUID | Unique idempotency identifier |
| user_id | BIGINT | Request owner |
| device_id | BIGINT NULL | Related device |
| entity_type | VARCHAR(100) | Allowed entity name |
| entity_uuid | UUID | Target record UUID |
| operation_type | VARCHAR(30) | create, update, delete |
| status | VARCHAR(30) | pending, completed, failed |
| error_message | TEXT NULL | Error details |
| processed_at | TIMESTAMP NULL | Processing timestamp |
| created_at | TIMESTAMP | Creation timestamp |
| updated_at | TIMESTAMP | Update timestamp |

**Constraints:**
- `operation_uuid` must be unique.
- Repeated requests with the same operation UUID must not create duplicate data.
- Entity types must be validated using a server-side allowlist.
- Users must not synchronize records belonging to other users.

## 16.4 sync_conflicts

Stores records where the client and server have conflicting changes.

| Column | Type | Description |
|---|---|---|
| id | BIGINT | Primary key |
| conflict_uuid | UUID | Unique conflict identifier |
| user_id | BIGINT | Related user |
| entity_type | VARCHAR(100) | Entity name |
| entity_uuid | UUID | Target record |
| client_version | BIGINT NULL | Client record version |
| server_version | BIGINT | Server record version |
| client_payload | JSONB NULL | Client-side data |
| server_payload | JSONB NULL | Server-side data |
| resolution_status | VARCHAR(30) | pending, resolved, rejected |
| resolution_type | VARCHAR(50) NULL | Applied resolution |
| resolved_at | TIMESTAMP NULL | Resolution time |
| created_at | TIMESTAMP | Creation timestamp |
| updated_at | TIMESTAMP | Update timestamp |

**Conflict Management Rules:**
- The backend must detect version conflicts.
- A conflicting update must not silently overwrite server data.
- Conflict resolution must follow a documented policy.
- Sensitive records must remain private during synchronization.
- Tombstones or soft-delete metadata must prevent deleted records from unexpectedly reappearing during sync.

**Pending Decision:** Final conflict resolution strategy must be approved before implementation. Possible strategies include server-wins, client-wins for selected fields, or manual resolution.

---

# 17. Database Integrity, Access Control and Business Rules

The following rules must be enforced through Laravel validation, policies, database constraints, and transactions where appropriate.

1. Only Admin users can create groups and assign users to groups.
2. Users can manage only their own private timetable and personal records.
3. Only Admin users can create and assign shared timetables.
4. Shared activity completion must be tracked separately for each user.
5. Admin users may comment on daily reports but must not modify the user's original report content.
6. Journal entries and private personal records must not be visible to unauthorized users.
7. Digital Library permissions must be checked before returning file access.
8. Bookmarks must always belong to their respective users.
9. Prayer location preferences must be protected as private user data.
10. FCM tokens must be protected and managed through authenticated operations.
11. Offline synchronization must prevent duplicate operations.
12. Historical reports must follow the approved editing and locking policy.
13. Foreign keys must use appropriate deletion behavior to preserve data integrity.
14. Multi-step operations must use database transactions where required.

---

# 18. Recommended Indexes and Constraints

Recommended indexes for the additional modules:

| Table | Index / Constraint |
|---|---|
| shared_timetables | created_by, status |
| shared_timetable_activities | shared_timetable_id, activity_date |
| shared_timetable_assignments | user_id, group_id |
| shared_activity_completions | UNIQUE(shared_timetable_activity_id, user_id) |
| library_resources | uploaded_by, visibility, status |
| library_resource_permissions | library_resource_id, user_id, group_id |
| bookmarks | UNIQUE(user_id, library_resource_id) |
| exercise_records | user_id, recorded_at |
| user_prayer_preferences | UNIQUE(user_id) |
| device_tokens | user_id, is_active |
| sync_operations | UNIQUE(operation_uuid), user_id, status |
| sync_conflicts | conflict_uuid, user_id, resolution_status |
| user_devices | UNIQUE(uuid), user_id |

Use PostgreSQL foreign keys, unique constraints, check constraints, and appropriate indexes. Migration definitions must match the final approved relationships and deletion rules.

---

# 19. Updated Database Acceptance Checklist

## Authentication and Access
- [ ] User authentication and API authorization are implemented.
- [ ] Admin and User permissions are enforced.
- [ ] Only Admin can create groups and assign users.

## Timetables
- [ ] Users can manage their private timetables.
- [ ] Admin can create shared timetables.
- [ ] Admin can assign shared timetables to users or groups.
- [ ] Individual activity completion is tracked per user.

## Habits, Goals and Reports
- [ ] Habit completion history is maintained.
- [ ] Goal progress is stored correctly.
- [ ] Journal entries support offline storage and synchronization.
- [ ] Daily reports support offline storage and synchronization.
- [ ] Admin can comment without editing the original user report.

## Digital Library
- [ ] Resource metadata is stored.
- [ ] File storage references are maintained.
- [ ] Access permissions are enforced.
- [ ] Users can create and remove personal bookmarks.

## Health and Prayer
- [ ] Exercise records are stored per user.
- [ ] Prayer location and timezone preferences are stored securely.

## Notifications and Synchronization
- [ ] FCM device tokens are stored securely.
- [ ] Devices can be registered for synchronization.
- [ ] UUID-based record identification is implemented.
- [ ] Duplicate sync operations are prevented.
- [ ] Sync conflicts are detected and recorded.
- [ ] Conflict resolution follows an approved policy.
- [ ] Offline deletions are handled without data reappearing.

---

# 20. Final Implementation Notes

1. Laravel is the primary backend framework.
2. PostgreSQL is the primary relational database.
3. Database schema changes must be implemented through Laravel migrations.
4. Models must define relationships, casts, fillable fields, and required scopes.
5. Factories and seeders must provide realistic development and testing data.
6. Authorization must be enforced on the backend, not only in the frontend.
7. Sensitive user data must never be exposed through unrestricted API responses.
8. Offline synchronization must be idempotent and conflict-aware.
9. File binaries must be stored in configured file storage; PostgreSQL stores their metadata and storage references.
10. Any unresolved business rule must be approved before final implementation.

All additions in Sections 15–20 extend the previously documented database architecture. They do not authorize removing or replacing existing sections.

---

# 21. Specific Review Gap Implementations

The following sections formally address the unfinalized items and gaps identified during the Database Review Status audit (Items #10, #11, and #13), fully integrating with the existing Laravel and PostgreSQL schema architecture.

## 21.1 Comprehensive Health Metrics Tracking (Review Item #10)

To satisfy the full Health & Fitness requirement alongside `exercise_records` (Section 15.4), the system provides structured tracking for daily vital metrics, hydration, and rest without relying on external wearable integrations.

### `health_records`

| Column | Type | Description |
|---|---|---|
| `id` | BIGINT | Primary key |
| `uuid` | UUID | Stable unique identifier for offline sync |
| `user_id` | BIGINT | Record owner |
| `record_date` | DATE | Date of health record |
| `weight_kg` | DECIMAL(5,2) NULL | Weight in kilograms |
| `water_intake_ml` | INTEGER NULL | Total water consumed (milliliters) |
| `sleep_hours` | DECIMAL(4,2) NULL | Sleep duration in hours |
| `systolic_bp` | INTEGER NULL | Blood pressure (systolic) |
| `diastolic_bp` | INTEGER NULL | Blood pressure (diastolic) |
| `notes` | TEXT NULL | Optional health notes |
| `created_at` | TIMESTAMP | Record creation timestamp |
| `updated_at` | TIMESTAMP | Update timestamp |

**Constraints and Rules:**
- Unique combination of (`user_id`, `record_date`).
- Index on (`user_id`, `record_date`).
- `water_intake_ml`, `weight_kg`, and `sleep_hours` must be positive values.
- Health records are strictly private and accessible only to the authenticated owner.

---

## 21.2 Formal Offline Conflict-Resolution Policy (Review Item #13)

To resolve the pending decision in Section 16.4 and comply with the checklist requirement, the following explicit resolution policies are enforced server-side by Laravel:

1. **Deterministic Last-Write-Wins (LWW) by Entity Timestamp:**
   - For simple personal entities (`habits`, `goals`, `exercise_records`, `health_records`), if `client_updated_at > server_updated_at`, the client mutation is committed and `server_version` is incremented.
2. **Immutable Append Strategy for History Records:**
   - Completed activity checks (`shared_activity_completions`), habit records (`habit_records`), and journal logs do not overwrite historical logs; records are recorded with deterministic UUID deduplication.
3. **Locking & Non-Overwritable Submissions:**
   - Submitted `daily_reports` from previous calendar dates are locked. Client sync cannot overwrite past submitted daily reports. Any synchronization discrepancy is directed into `sync_conflicts` with `resolution_status = 'rejected'`.
4. **Deleted Records (Tombstone Strategy):**
   - Soft deletes (`deleted_at IS NOT NULL`) always take precedence over data updates if the deletion timestamp is more recent than the pending local update.

---

## 21.3 Prayer Calculation Standard & Method Definition (Review Item #11)

To complete the requirements of Section 15.5 and standardize prayer timetable integrations:

1. **Standardized Calculation Conventions:**
   - The backend natively calculates prayer schedules based on the user's stored coordinates (`latitude`, `longitude`, `timezone`) in `user_prayer_preferences`.
   - Supported `calculation_method` values are restricted to standard conventions:
     - `MWL` (Muslim World League)
     - `ISNA` (Islamic Society of North America)
     - `EGYPT` (Egyptian General Authority of Survey)
     - `MAKKAH` (Umm al-Qura University, Makkah)
     - `KARACHI` (University of Islamic Sciences, Karachi)
     - `TEHRAN` (Institute of Geophysics, University of Tehran)
     - `JAFARI` (Shia Ithna Ashari, Leva Research Institute, Qum)
2. **Timetable Integration Rule:**
   - Dynamic prayer times calculated using these coordinates and methods automatically hydrate the user's daily `activities` (where `activity_type = 'prayer'`), avoiding missing timestamps during offline operation.

---

# 22. Architectural Review Alignments & Formal Gap Resolutions

The following sections define and implement the eight (8) specific checklist items required to finalize the database architecture for backend and mobile development without modifying prior section structures.

## 22.1 Categorization of Shared Timetable Activities (Checklist Item 1)

To allow the frontend to categorize shared timetable activities into distinct tabs and sections (such as Prayer, Quran, Exercise, and Personal), `shared_timetable_activities` includes an explicit activity type enumeration matching Section 5 (`ActivityType`).

### Migration Update: `shared_timetable_activities`

| Column | Type | Description |
|---|---|---|
| `activity_type` | VARCHAR(50) DEFAULT 'other' | Category: `prayer`, `quran`, `tafseer`, `reading`, `habit`, `goal`, `exercise`, `personal`, `other` |

**Constraints & Index:**
- Check constraint on `activity_type IN ('prayer', 'quran', 'tafseer', 'reading', 'habit', 'goal', 'exercise', 'personal', 'other')`.
- Composite Index: (`shared_timetable_id`, `activity_type`, `activity_date`).

---

## 22.2 Daily Report Score Formula & Computation Rules (Checklist Item 2)

### 1. Daily Performance Score Formula
The daily report score ($\text{Score}_{\text{daily}}$) evaluates completion percentage across all scheduled activities on `report_date`.

If a user has **zero (0)** scheduled activities for the day ($N_{\text{scheduled}} = 0$), their calculated score is recorded as **$0.00\%$** (to reflect that no planned agenda was fulfilled):

$$\text{Score}_{\text{daily}} = \begin{cases} 
0.00 & \text{if } N_{\text{scheduled}} = 0 \\ 
\min\left(100.00, \left(\frac{N_{\text{completed}}}{N_{\text{scheduled}}}\right) \times 100\right) & \text{if } N_{\text{scheduled}} > 0 
\end{cases}$$

Where:
- $N_{\text{scheduled}}$ = Total scheduled private activities (`activities` where `scheduled_date = report_date` and `deleted_at IS NULL`) PLUS total assigned shared activities (`shared_timetable_activities` matching the user's direct or group assignments for `activity_date = report_date`).
- $N_{\text{completed}}$ = Count of private activities with `status = 'completed'` PLUS shared activities with a corresponding `shared_activity_completions` row having `status = 'completed'`.

### 2. Schema Addition: `daily_reports`
To preserve the exact score calculated at the moment of report submission and ensure immutable history:

| Column | Type | Description |
|---|---|---|
| `calculated_score` | DECIMAL(5,2) DEFAULT 0.00 | Snapshot percentage ($0.00$ to $100.00$) frozen at submission |
| `scheduled_count` | INTEGER DEFAULT 0 | Total scheduled activities snapshot ($N_{\text{scheduled}}$) |
| `completed_count` | INTEGER DEFAULT 0 | Total completed activities snapshot ($N_{\text{completed}}$) |

**Preservation Rule:**
Subsequent additions, completions, or edits to past timetable activities after report submission will not mutate `calculated_score`. The score remains permanently locked to the submitted report instance.

---

## 22.3 Flutter Hive Local Storage & Extended Offline Sync Scope (Checklist Item 3)

The mobile client uses **Flutter with Hive local NoSQL storage** (type-safe binary boxes) for local persistence and offline operations.

### 1. Complete Offline Synchronization Scope
The following entities are officially in-scope for offline creation, update, and synchronization via Hive boxes:
- `activities` (Private timetable activities)
- `habits` & `habit_records` (Habits and daily habit logs)
- `goals` (Personal development goals)
- `journal_entries` (Private notes and reflections)
- `daily_reports` (Daily self-assessment and submitted scores)
- `shared_activity_completions` (Completion states for assigned shared activities)
- `exercise_records` & `health_records` (Health, workout, and metric logs)

### 2. Comprehensive Hive Data Box Architecture (Client-Side)
To fully match the offline entity scope, the Flutter client maintains the following type-safe Hive boxes:

| Hive Box Name | Key Scheme | Data Model / Stored Entity | Offline Capabilities |
|---|---|---|---|
| `activities_box` | `uuid` (String) | `ActivityModel` | Local CRUD, completion toggle, sync flags |
| `habits_box` | `uuid` (String) | `HabitModel` | Local CRUD, active toggling |
| `habit_records_box` | `${habit_uuid}_${record_date}` | `HabitRecordModel` | Daily habit completion logs, streaks |
| `goals_box` | `uuid` (String) | `GoalModel` | Local CRUD, progress value updates |
| `journal_entries_box` | `uuid` (String) | `JournalEntryModel` | Private offline creation, reading, and drafts |
| `daily_reports_box` | `${user_uuid}_${report_date}` | `DailyReportModel` | Current-day report composition, score caching, locking |
| `exercise_records_box` | `uuid` (String) | `ExerciseRecordModel` | Fitness sessions, duration, and calories logs |
| `health_records_box` | `${user_uuid}_${record_date}` | `HealthRecordModel` | Vitals, hydration ($ml$), sleep ($hrs$), and blood pressure |
| `shared_completions_box`| `${shared_activity_id}_${user_id}` | `SharedActivityCompletionModel` | Offline check-offs for admin-assigned shared items |
| `sync_queue_box` | Sequential integer or `operation_uuid` | `SyncOperationModel` | FIFO queue storing pending mutations for sync engine |

**Sync Engine Operation:**
1. Any offline mutation is immediately committed to its respective local Hive box and an operation entry is appended into `sync_queue_box`.
2. When internet connectivity is restored, the client iterates over `sync_queue_box` in FIFO order, dispatching batched requests to `POST /api/v1/sync/push`.
3. Upon server confirmation (`200 OK`), processed items are removed from `sync_queue_box`, and local entities in the respective boxes are marked with `synced_at` timestamps.

---

## 22.4 User Personal Documents Architecture (Checklist Item 4)

To uphold the core security boundary that `library_resources` is administered exclusively by authorized Admin staff, a distinct table is established for user-uploaded personal files and documents.

### `user_documents`

| Column | Type | Description |
|---|---|---|
| `id` | BIGINT | Primary key |
| `uuid` | UUID | Unique public identifier |
| `user_id` | BIGINT | Document owner (Foreign key to `users`) |
| `title` | VARCHAR(255) | User-defined document label |
| `description` | TEXT NULL | Optional notes or description |
| `file_name` | VARCHAR(255) | Original file name |
| `storage_disk` | VARCHAR(100) | Laravel storage disk (e.g., `local`, `s3`) |
| `storage_path` | TEXT | Encrypted storage path |
| `mime_type` | VARCHAR(150) | Validated file MIME type |
| `file_size` | BIGINT | Size in bytes |
| `created_at`, `updated_at` | TIMESTAMP | Timestamps |
| `deleted_at` | TIMESTAMP NULL | Soft-delete timestamp |

**Access & Security Boundaries:**
- Users can view, download, upload, and delete only their own documents (`user_id = auth()->id()`).
- Administrators do not have access to private user documents.
- `library_resources` remains read-only for standard users (viewing and bookmarking only).

---

## 22.5 In-App Notification Inbox & History Structure (Checklist Item 5)

To provide complete notification history, unread badge counters, and multi-device inbox state beyond ephemeral FCM alerts, the server implements an in-app notification repository.

### `notifications`

| Column | Type | Description |
|---|---|---|
| `id` | BIGINT | Primary key |
| `uuid` | UUID | Unique public notification identifier |
| `user_id` | BIGINT | Recipient user ID (Foreign key to `users`) |
| `sender_id` | BIGINT NULL | Admin or system user who triggered notification |
| `title` | VARCHAR(255) | Notification headline |
| `body` | TEXT | Message body text |
| `type` | VARCHAR(50) | Category: `admin_broadcast`, `timetable_assigned`, `report_comment`, `reminder`, `system` |
| `data` | JSONB NULL | Contextual payload (e.g., entity IDs, action deep links) |
| `read_at` | TIMESTAMP NULL | Read timestamp; NULL signifies unread |
| `created_at`, `updated_at` | TIMESTAMP | Timestamps |

**Indexes & Rules:**
- Composite Index: (`user_id`, `read_at`).
- Index: (`user_id`, `created_at`).
- An API endpoint `PATCH /api/v1/notifications/{uuid}/read` updates `read_at = NOW()`.
- An API endpoint `GET /api/v1/notifications/unread-count` returns the count of rows where `user_id = auth()->id()` and `read_at IS NULL`.

---

## 22.6 Activity & Exercise Record Unification (Checklist Item 6)

To prevent fragmented records or double-counting between timetable planning and actual fitness execution:

1. **Relation Specification:**
   - Timetable planned workouts live in `activities` with `activity_type = 'exercise'`.
   - Comprehensive exercise telemetry (duration, distance, calories, workout metrics) lives in `exercise_records`.
2. **Schema Foreign Key Link:**
   - Add `activity_id` (BIGINT NULL, Foreign Key to `activities.id`, ON DELETE SET NULL) to `exercise_records`.
3. **Synchronized Lifecycle Rule:**
   - When a user logs an exercise directly into `exercise_records`, the application service automatically updates any referenced `activities` item to `status = 'completed'`.
   - Conversely, marking an `exercise` activity as completed prompts the user for duration and metric logs, linking the resulting `exercise_records` row to that activity.

---

## 22.7 Mutual Exclusivity Constraints & Deduplication (Checklist Item 7)

To enforce the "exactly one of user_id or group_id" mandate and prevent duplicate assignments at the database level:

### 1. PostgreSQL Check Constraints

#### For `shared_timetable_assignments`:
```sql
ALTER TABLE shared_timetable_assignments
ADD CONSTRAINT chk_shared_assignments_exclusive_target
CHECK (
    (user_id IS NOT NULL AND group_id IS NULL) OR
    (user_id IS NULL AND group_id IS NOT NULL)
);
```

#### For `library_resource_permissions`:
```sql
ALTER TABLE library_resource_permissions
ADD CONSTRAINT chk_library_permissions_exclusive_target
CHECK (
    (user_id IS NOT NULL AND group_id IS NULL) OR
    (user_id IS NULL AND group_id IS NOT NULL)
);
```

### 2. Assignment Deduplication Constraints
- In `shared_timetable_assignments`:
  - `UNIQUE(shared_timetable_id, user_id)` (where `user_id IS NOT NULL`)
  - `UNIQUE(shared_timetable_id, group_id)` (where `group_id IS NOT NULL`)
- In `library_resource_permissions`:
  - `UNIQUE(library_resource_id, user_id)` (where `user_id IS NOT NULL`)
  - `UNIQUE(library_resource_id, group_id)` (where `group_id IS NOT NULL`)

---

## 22.8 Finalized Architectural Decisions (Checklist Item 8)

The remaining open decisions across technical specifications are formally resolved:

| Decision Domain | Final Architectural Standard | Implementation Specification |
|---|---|---|
| **Prayer Time Provider** | Native Calculation Engine (`adhan-php` backend / `adhan` Dart package on client) | Uses coordinates and calculation method from `user_prayer_preferences`. Eliminates external API dependencies and works fully offline. |
| **Offline Conflict Policy** | Tiered LWW & Append Strategy | Non-overwritable past daily reports; Last-Write-Wins (LWW) based on `client_updated_at` for habits/goals; Append-only for completions and logs. |
| **Reminder Delivery** | Hybrid Local Scheduled + FCM Push | Immediate high-priority timetable and prayer alerts use Flutter Local Notifications scheduled locally on device; Admin broadcasts and shared notices use Firebase Cloud Messaging (FCM). |
| **Supported Library Formats** | Validated Document & Media MIME Types | Allowed file formats: PDF (`application/pdf`), EPUB (`application/epub+zip`), Audio MP3 (`audio/mpeg`), and Images (`image/png`, `image/jpeg`). Maximum size: 50MB per resource. |