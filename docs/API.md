# Daei Mini — API Reference

**Version:** 1.0  
**Base API version:** `/api/v1`  
**Legacy base:** `/api` (single unversioned prefix)  
**Framework:** Laravel 13 + Sanctum · **Database:** PostgreSQL · **Cache/Queue:** Redis

This document is the human-readable, comprehensive API reference for the Daei Mini backend. Every HTTP endpoint exposed by the Laravel API is documented here, including authentication requirements, request payloads, query parameters, response envelopes, status codes, and error formats.

A **machine-readable JSON URL / OpenAPI specification** for the entire API is maintained at [`docs/openapi.json`](./openapi.json) (repository root: `docs/openapi.json`). See [Machine-Readable JSON (OpenAPI)](#machine-readable-json-openapi).

---

## Table of Contents

1. [Base URLs](#base-urls)
2. [Machine-Readable JSON (OpenAPI)](#machine-readable-json-openapi)
3. [Authentication](#authentication)
4. [Conventions](#conventions)
5. [Pagination](#pagination)
6. [Errors & Status Codes](#errors--status-codes)
7. [Rate Limiting](#rate-limiting)
8. [Enums](#enums)
9. [Endpoint Reference](#endpoint-reference)
10. [Data Shape Quick Reference](#data-shape-quick-reference)
11. [Workflow Examples](#workflow-examples)
12. [curl Examples](#curl-examples)
13. [Demo Accounts](#demo-accounts)

---

## Base URLs

| Environment | Base URL | Notes |
|---|---|---|
| Local development (Laravel) | `http://localhost:8000/api/v1` | Laravel development server (`php artisan serve`) |
| Local development (Docker) | `http://localhost:8080/api/v1` | nginx gateway from `infra/docker-compose.dev.yml` |
| Production | `https://<your-domain>/api/v1` | Configure via environment variables (Coolify) |

Legacy unversioned alias (still authenticated via Sanctum): `/api/user`.

> All endpoint URIs below are shown **without** the base URL prefix, e.g. `POST /api/v1/auth/login`.

---

## Machine-Readable JSON (OpenAPI)

A complete, machine-readable OpenAPI 3.0.3 specification for the whole API is committed to the repository:

- **JSON URL (raw, canonical):** <https://raw.githubusercontent.com/crindalwalt/Daei-mini/main/docs/openapi.json>
- **Repository file:** [`docs/openapi.json`](./openapi.json)
- **Local static serving:** from the repository root run e.g. `python3 -m http.server 8080` and open `http://localhost:8080/docs/openapi.json`

```bash
curl -s https://raw.githubusercontent.com/crindalwalt/Daei-mini/main/docs/openapi.json
```

The generated document contains:

- `openapi: 3.0.3` with title `Daei Mini / ThinkCode API`
- All discovered API paths and operations (see the [Endpoint Reference](#endpoint-reference))
- Server definitions (local Laravel, Docker nginx, production placeholder)
- Security schemes: `bearerAuth` (Sanctum personal access token) and `sanctumCookie`
- Reusable schemas: `Envelope`, `Error`, `PaginationMeta`, `User`, `Activity`, `Habit`, `Goal`, `DailyReport`, `SyncOperation`, `SyncConflict`, plus all request DTOs and enum schemas
- Path/query parameters and response codes (200/201/400/401/403/404/422/429)

Clients can import this JSON file into tools such as **Postman**, **Insomnia**, or **Swagger UI** for interactive documentation and client generation.

---

## Authentication

The API supports two authentication mechanisms, both backed by Laravel Sanctum:

### 1. Personal Access Token (Bearer) — recommended for native clients / mobile

```
Authorization: Bearer <personal_access_token>
```

**How to obtain:**

- `POST /api/v1/auth/login` → response includes `data.token` (the raw Sanctum token), `data.token_type`, `data.abilities`, wrapped in the success envelope.
- `POST /api/v1/tokens` → raw response `{ "token": "...", "token_type": "Bearer", "abilities": [...], "expires_at": "...", "message": "..." }`.

**Token characteristics:**

| Property | Value |
|---|---|
| Default abilities (admin) | `["*"]` (all abilities) |
| Default abilities (standard user) | `["profile:read", "profile:update", "activities:read", "activities:write"]` |
| Default expiration | 10080 minutes (7 days) from `SANCTUM_TOKEN_EXPIRATION` / `config('sanctum.expiration')` |
| Storage | Hashed in `personal_access_tokens` table; raw value returned **only once** at issuance |

Token lifecycle endpoints:

| Method | URI | Description |
|---|---|---|
| `POST` | `/api/v1/tokens` | Issue a token (rate limited) |
| `GET` | `/api/v1/tokens` | List issued tokens (never exposes raw values) |
| `DELETE` | `/api/v1/tokens/current` | Revoke the token used for the current request |
| `DELETE` | `/api/v1/tokens/{id}` | Revoke a token by ID (404 when not found / not owned) |

### 2. Sanctum SPA Session Cookie

For browser/SPa clients using stateful Sanctum:

1. Call `GET /sanctum/csrf-cookie` to obtain the CSRF cookie.
2. Send the `X-XSRF-TOKEN` header (or `_csrf` field) on state-changing requests.
3. Session-authenticated via the `auth:sanctum` guard.

### Demo accounts

| Role | Email | Password |
|---|---|---|
| Admin | `admin@thinkcode.dev` | `password` |
| Standard user | `user@thinkcode.dev` | `password` |

> These seeded accounts exist for local development and demo purposes. Registration is available through `POST /api/v1/auth/register` unless disabled via `config('auth.registration_enabled')`.

---

## Conventions

### Request headers

| Header | Behaviour |
|---|---|
| `Authorization` | `Bearer <token>` for personal access token auth (required for protected routes) |
| `Content-Type` | `application/json` for JSON bodies; `multipart/form-data` for file uploads |
| `X-Request-ID` / `X-Correlation-ID` | Optional inbound request ID; echoed back in the response and attached to logs (custom `AssignRequestId` middleware) |
| `Accept` | Should include `application/json` for API clients |

### Success envelope

All JSON responses from API endpoints use the unified envelope:

```json
{
  "success": true,
  "data": {},
  "message": "OK",
  "meta": { "current_page": 1, "per_page": 20, "total": 1, "last_page": 1 }
}
```

- `success` — boolean flag
- `data` — payload (resource, array, scalar, or `null`)
- `message` — human-readable status message (defaults to `OK`)
- `meta` — **only present on paginated responses**

Some endpoints intentionally bypass the envelope (documented per endpoint):

- Health endpoints (`/api/v1/health*`) — raw JSON
- Token endpoints — raw JSON (`/tokens`, `/tokens/current`, `/tokens/{id}`)
- Demo endpoints — `/api/v1/tasks`, `/api/v1/queue-test`, `/api/v1/admin-check` (raw JSON)
- File download endpoints — `application/octet-stream`

### Timestamps, dates, numbers

| Field type | Format |
|---|---|
| ISO-8601 datetime | e.g. `2026-11-07T14:30:00.000000Z` (`toIso8601String()` / `toISOString()`) |
| Date | `YYYY-MM-DD` |
| Time of day | `HH:MM` 24-hour (`start_time`, `end_time`, reminder times) |
| Numbers | Integers or floats (scores, progress, averages) |

### File uploads

Multipart form-data endpoints (body fields + binary file):

- `POST /api/v1/documents` — field `file` (required), `title` (required), `description?`, `category?`, `is_private?`
- `POST /api/v1/library` — field `file` (required), `title` (required), `description?`, `visibility?`, `status?`

Responses include file metadata: `file_name`, `mime_type`, `file_size`.

---

## Pagination

List endpoints use Laravel-style pagination and return the `meta` block:

```json
"meta": {
  "current_page": 1,
  "per_page": 20,
  "total": 42,
  "last_page": 3
}
```

| Parameter | Type | Default | Max |
|---|---|---|---|
| `page` | integer | `1` | – |
| `per_page` | integer | `20` | `100` |

Habit records nested via `GET /api/v1/habits/{habit}/records` are **fixed at 30 per page**.

---

## Errors & Status Codes

Error responses use the error envelope:

```json
{
  "success": false,
  "data": null,
  "message": "Validation failed.",
  "errors": {
    "email": ["These credentials do not match our records."]
  }
}
```

| Status | Meaning | Envelope / Body |
|---|---|---|
| `200` | Success (GET, update, delete, complete, etc.) | Success envelope |
| `201` | Resource created | Success envelope |
| `400` | Bad request (e.g. token endpoint used without a token) | Success/error envelope |
| `401` | Unauthenticated — missing/invalid Sanctum token | Error envelope: `Unauthenticated.` |
| `403` | Forbidden — authenticated but not permitted (admin-only actions, disabled registration) | Error envelope: `This action is unauthorized.` |
| `404` | Resource not found | Error envelope: `Resource not found.` |
| `422` | Validation error / invalid credentials / locked out | Error envelope + `errors` map (`field => [messages]`) |
| `429` | Too many requests (rate limit exceeded) | Error envelope: `Too many login attempts. Please try again later.` |

Validation errors are returned with HTTP `422` and a field-keyed `errors` object.

---

## Rate Limiting

| Limiter | Applies to | Limit |
|---|---|---|
| `login` | `POST /api/v1/auth/login`, `POST /api/v1/auth/forgot-password` | 5 requests / minute per `email + IP` |
| `tokens` | `POST /api/v1/tokens` | 5 requests / minute per `email + IP` |

Exceeding a limit returns `429` with the standard error envelope.

---

## Enums

### Activity

| Enum | Values |
|---|---|
| `ActivityStatus` | `pending`, `completed`, `missed` |
| `ActivityType` | `prayer`, `quran`, `tafseer`, `reading`, `habit`, `goal`, `exercise`, `personal`, `other` |

### Goals

| Enum | Values |
|---|---|
| `GoalStatus` | `not_started`, `in_progress`, `completed`, `paused` |

### Library

| Enum | Values |
|---|---|
| `LibraryVisibility` | `private`, `assigned`, `public` |
| `LibraryResource.status` | `active`, `archived` |

### Notifications

| Enum | Values |
|---|---|
| `NotificationType` | `activity_reminder`, `shared_activity_assigned`, `daily_report_comment`, `goal_achieved`, `habit_reminder`, `system` |

### Reminders

| Enum | Values |
|---|---|
| `ReminderChannel` | `local`, `push`, `email` |

### Sync

| Enum | Values |
|---|---|
| `SyncEntityType` | `habit`, `habit_record`, `goal`, `shared_activity_completion`, `journal_entries`, `daily_reports`, `exercise_records`, `health_records` |
| `SyncOperationType` | `create`, `update`, `delete` |
| `SyncOperationStatus` | `pending`, `synced`, `failed` |
| `SyncConflictStatus` | `pending`, `resolved`, `ignored` |
| `ConflictResolutionPolicy` | `client_wins`, `server_wins`, `latest_wins`, `manual` |

### Prayer preferences

| Enum | Values |
|---|---|
| `PrayerCalculationMethod` | `muslim_world_league`, `egyptian`, `karachi`, `umm_al_qura`, `dubai`, `moonsighting_committee`, `north_america`, `kuwait`, `qatar`, `singapore`, `tehran`, `turkey`, `other` |

---

## Endpoint Reference

All endpoints below are versioned under `/api/v1` unless marked otherwise.

### Health & System

| Method | URI | Auth | Description |
|---|---|---|---|
| `GET` | `/api/v1/health` | Public | Readiness probe (legacy alias of `/health/ready`) |
| `GET` | `/api/v1/health/live` | Public | Liveness probe (process alive, no infra checks) |
| `GET` | `/api/v1/health/ready` | Public | Readiness probe (database + redis) |

**Responses (readiness):**

```json
{
  "status": "healthy",
  "timestamp": "2026-11-07T14:30:00.000000Z",
  "environment": "local",
  "services": {
    "database": { "status": "up" },
    "redis": { "status": "up" }
  }
}
```

Returns `200` when healthy, `503` when degraded (database/redis down; error details only exposed when debug is enabled and not production).

---

### Authentication

| Method | URI | Auth | Description |
|---|---|---|---|
| `POST` | `/api/v1/auth/login` | Public | Login and receive user + token |
| `POST` | `/api/v1/auth/register` | Public | Register a new user |
| `POST` | `/api/v1/auth/forgot-password` | Public | Request password reset email |
| `POST` | `/api/v1/auth/reset-password` | Public | Reset password with token |
| `GET` | `/api/v1/auth/me` | Sanctum | Get authenticated user |
| `PATCH` | `/api/v1/auth/profile` | Sanctum | Update profile & prayer preferences |
| `POST` | `/api/v1/auth/logout` | Sanctum | Revoke token / session |

#### `POST /api/v1/auth/login`

**Rate limit:** `throttle:login` — 5/min per `email + IP`.

**Request body** (`application/json`):

```json
{
  "email": "user@thinkcode.dev",
  "password": "password",
  "device_name": "my-device"
}
```

| Field | Type | Required | Rules |
|---|---|---|---|
| `email` | string | ✅ | email, max 255 |
| `password` | string | ✅ | max 255 |
| `device_name` | string | – | max 100 (used as token name, defaults to `api-token`) |

**Response `200`:**

```json
{
  "success": true,
  "data": {
    "user": { "id": 1, "uuid": "...", "name": "...", "email": "...", "role": "user", "roles": ["user"], "is_active": true, "email_verified": true, "prayer_preferences": { } },
    "token": "dGhpcy...token...",
    "token_type": "Bearer",
    "abilities": ["profile:read", "profile:update", "activities:read", "activities:write"]
  },
  "message": "Authentication successful."
}
```

Failure (unknown credentials / inactive account / wrong password) → `422` with `errors.email`.

#### `POST /api/v1/auth/register`

**Request body:**

```json
{
  "name": "Jane Doe",
  "email": "jane@example.com",
  "password": "secret-password",
  "password_confirmation": "secret-password"
}
```

| Field | Type | Required | Rules |
|---|---|---|---|
| `name` | string | ✅ | max 255 |
| `email` | string | ✅ | email, max 255 |
| `password` | string | ✅ | confirmed (via `password_confirmation`) |
| `password_confirmation` | string | ✅ | confirmed |

**Response `201`:** success envelope with `data.user` (`UserResource`). Message: `Registration successful.`

If registration is disabled → `403` with message `Registration is disabled.`

#### `POST /api/v1/auth/forgot-password`

**Request body:** `{ "email": "user@thinkcode.dev" }` — rate limited (5/min per email+IP).

Returns success envelope; a reset link is delivered to the user email (frontend URL configured via `FRONTEND_URL`).

#### `POST /api/v1/auth/reset-password`

**Request body:**

```json
{
  "token": "reset-token",
  "email": "user@thinkcode.dev",
  "password": "new-password",
  "password_confirmation": "new-password"
}
```

Returns success envelope, message `Password reset successfully.`

#### `GET /api/v1/auth/me`

Returns `{ "user": { ...UserResource... } }`.

#### `PATCH /api/v1/auth/profile`

**Request body** (all fields optional):

| Field | Type | Required | Rules |
|---|---|---|---|
| `name` | string | – | sometimes, required when present, max 255 |
| `timezone` | string | – | sometimes, required when present, valid timezone |
| `calculation_method` | string | – | sometimes, nullable, enum `PrayerCalculationMethod` |
| `latitude` | number | – | sometimes, nullable, -90..90 |
| `longitude` | number | – | sometimes, nullable, -180..180 |
| `notifications_enabled` | boolean | – | sometimes |

Updates run inside a DB transaction (name + prayer preference). Returns `{ "user": { ... } }`, message `Profile updated successfully.`

#### `POST /api/v1/auth/logout`

Deletes the current personal access token and invalidates the SPA session. Returns success envelope, message `Logged out successfully.`

---

### Personal Access Tokens

| Method | URI | Auth | Description |
|---|---|---|---|
| `POST` | `/api/v1/tokens` | Public (credentials in body) | Issue token |
| `GET` | `/api/v1/tokens` | Sanctum | List tokens |
| `DELETE` | `/api/v1/tokens/current` | Sanctum | Revoke current token |
| `DELETE` | `/api/v1/tokens/{id}` | Sanctum | Revoke token by ID |

#### `POST /api/v1/tokens`

**Request body:**

```json
{
  "email": "user@thinkcode.dev",
  "password": "password",
  "token_name": "my-ios-app",
  "abilities": ["profile:read", "activities:read"]
}
```

| Field | Type | Required | Rules |
|---|---|---|---|
| `email` | string | ✅ | email |
| `password` | string | ✅ | max 255 |
| `token_name` | string | ✅ | max 255 |
| `abilities` | string[] | – | max 50 each; defaults to `["*"]` |

**Response `201`:** raw JSON:

```json
{
  "token": "string",
  "token_type": "Bearer",
  "abilities": ["*"],
  "expires_at": "2026-11-14T10:00:00.000000Z",
  "message": "Personal access token issued successfully."
}
```

Failure → `422` `{ "errors": { "email": ["These credentials do not match our records."] } }`.

**Rate limit:** 5/min per `email + IP`.

#### `GET /api/v1/tokens`

**Response:** raw JSON `{ "tokens": [ { "id": 1, "name": "...", "abilities": ["*"], "last_used_at": null, "expires_at": "...", "created_at": "..." } ] }`.

#### `DELETE /api/v1/tokens/current`

Revokes the current access token. Response `{ "message": "Current token revoked successfully." }`.

#### `DELETE /api/v1/tokens/{id}`

Deletes the token with the given ID scoped to the authenticated user. `404` `{ "message": "Token not found." }` when not found.

---

### Activities & Reminders

| Method | URI | Auth | Description |
|---|---|---|---|
| `GET` | `/api/v1/activities` | Sanctum | List activities (paginated) |
| `POST` | `/api/v1/activities` | Sanctum | Create activity |
| `GET` | `/api/v1/activities/{activity}` | Sanctum | Get activity |
| `PUT` / `PATCH` | `/api/v1/activities/{activity}` | Sanctum | Update activity |
| `DELETE` | `/api/v1/activities/{activity}` | Sanctum | Delete activity |
| `POST` | `/api/v1/activities/{activity}/complete` | Sanctum | Mark complete |
| `GET` | `/api/v1/activities/{activity}/reminders` | Sanctum | List reminders |
| `POST` | `/api/v1/activities/{activity}/reminders` | Sanctum | Create reminder |
| `PUT` / `PATCH` | `/api/v1/activities/{activity}/reminders/{reminder}` | Sanctum | Update reminder |
| `DELETE` | `/api/v1/activities/{activity}/reminders/{reminder}` | Sanctum | Delete reminder |

#### `GET /api/v1/activities`

**Query params:**

| Field | Type | Required | Rules |
|---|---|---|---|
| `date` | date | – | Filter by exact date (`YYYY-MM-DD`) |
| `from` | date | – | Filter `scheduled_date >= from` |
| `to` | date | – | Filter `scheduled_date <= to`; must be `>= from` when both set |
| `status` | enum | – | `ActivityStatus` |
| `activity_type` | enum | – | `ActivityType` |
| `search` | string | – | max 255, matches title |
| `per_page` | int | – | 1..100, default 20 |

Only activities owned by the authenticated user are returned.

**Response:** paginated success envelope with `data` = array of `Activity` resources; `meta` pagination block.

`Activity` shape:

```json
{
  "id": 1,
  "uuid": "uuid",
  "title": "Fajr prayer",
  "description": null,
  "activity_type": "prayer",
  "scheduled_date": "2026-11-07",
  "start_time": "04:30",
  "end_time": null,
  "status": "pending",
  "reminder_enabled": true,
  "reminders": [],
  "exercise_records": [],
  "created_at": "2026-11-07T00:00:00.000000Z",
  "updated_at": "2026-11-07T00:00:00.000000Z"
}
```

#### `POST /api/v1/activities`

**Request body:**

```json
{
  "uuid": "client-generated-uuid",
  "title": "Fajr prayer",
  "description": "Wake up and pray Fajr",
  "activity_type": "prayer",
  "scheduled_date": "2026-11-07",
  "start_time": "04:30",
  "end_time": null,
  "status": "pending",
  "reminder_enabled": true,
  "client_created_at": "2026-11-07T00:00:00.000000Z",
  "client_updated_at": "2026-11-07T00:00:00.000000Z"
}
```

| Field | Type | Required | Rules |
|---|---|---|---|
| `title` | string | ✅ | max 255 |
| `scheduled_date` | date | ✅ | – |
| `uuid` | uuid | – | client-generated idempotency key |
| `description` | string | – | max 5000, nullable |
| `activity_type` | enum | – | `ActivityType` |
| `start_time` / `end_time` | string | – | `HH:MM` |
| `status` | enum | – | `ActivityStatus` |
| `reminder_enabled` | boolean | – | – |
| `client_created_at` / `client_updated_at` | datetime | – | client timestamps (sync) |

Creates with `user_id`, `server_version = 1`, `synced_at = now()`; returns `201` with the created `Activity`.

#### `POST /api/v1/activities/{activity}/complete`

Sets status to `completed`, increments `server_version`, updates `synced_at`. Returns updated `Activity`, message `Activity completed.`

#### Reminders

- `GET /api/v1/activities/{activity}/reminders` — returns collection, message `Reminders retrieved.`; ordered by `reminder_at`.
- `POST /api/v1/activities/{activity}/reminders` — body `{ "reminder_at": "2026-11-07T05:00:00.000000Z", "uuid": "...", "is_enabled": true, "channel": "push", "client_created_at": "...", "client_updated_at": "..." }`; required: `reminder_at`. Returns `201`, message `Reminder created.` (approx).
- `PUT/PATCH .../reminders/{reminder}` — update `reminder_at`, `is_enabled`, `channel`, `client_updated_at`.
- `DELETE .../reminders/{reminder}` — deletes; message `Reminder deleted.`

---

### Shared Timetables, Activities & Completions

Base: `/api/v1/shared-timetables`

| Method | URI | Auth | Role | Description |
|---|---|---|---|---|
| `GET` | `/api/v1/shared-timetables` | Sanctum | – | List timetables visible to user (published + owned/assigned) |
| `POST` | `/api/v1/shared-timetables` | Sanctum | **admin** | Create timetable |
| `GET` | `/api/v1/shared-timetables/{sharedTimetable}` | Sanctum | – | Get timetable |
| `PUT` / `PATCH` | `/api/v1/shared-timetables/{sharedTimetable}` | Sanctum | **admin** | Update timetable |
| `DELETE` | `/api/v1/shared-timetables/{sharedTimetable}` | Sanctum | **admin** | Delete timetable |
| `POST` | `/api/v1/shared-timetables/{sharedTimetable}/publish` | Sanctum | **admin** | Publish timetable |
| `GET` | `/api/v1/shared-timetables/{sharedTimetable}/activities` | Sanctum | – | List activities of timetable |
| `POST` | `/api/v1/shared-timetables/{sharedTimetable}/activities` | Sanctum | **admin** | Add activity to timetable |
| `GET` | `/api/v1/shared-timetables/{sharedTimetable}/activities/{activity}` | Sanctum | – | Get timetable activity |
| `PUT` / `PATCH` | `/api/v1/shared-timetables/{sharedTimetable}/activities/{activity}` | Sanctum | **admin** | Update timetable activity |
| `DELETE` | `/api/v1/shared-timetables/{sharedTimetable}/activities/{activity}` | Sanctum | **admin** | Delete timetable activity |
| `POST` | `/api/v1/shared-timetables/{sharedTimetable}/activities/{activity}/completions` | Sanctum | – | Record completion |
| `GET` | `/api/v1/shared-timetables/{sharedTimetable}/assignments` | Sanctum | – | List assignments |
| `POST` | `/api/v1/shared-timetables/{sharedTimetable}/assignments` | Sanctum | **admin** | Assign timetable activity to user/group |
| `DELETE` | `/api/v1/shared-timetables/{sharedTimetable}/assignments/{assignment}` | Sanctum | **admin** | Unassign |

Access control: non-admin users can read published timetables they created or were assigned to (directly or via group). Admin-only mutation group is protected by `RoleMiddleware:admin` (403 otherwise).

#### `POST /api/v1/shared-timetables/{sharedTimetable}/publish`

Sets status to `published`, bumps `server_version`, updates `synced_at`. Returns updated timetable (with `activities` and `assignments` counts).

#### Shared activity completion

| Method | URI | Auth | Description |
|---|---|---|---|
| `GET` | `/api/v1/shared-activity-completions` | Sanctum | List completions |
| `GET` | `/api/v1/shared-activity-completions/{sharedActivityCompletion}` | Sanctum | Get completion |
| `PUT` / `PATCH` | `/api/v1/shared-activity-completions/{sharedActivityCompletion}` | Sanctum | Update completion |
| `DELETE` | `/api/v1/shared-activity-completions/{sharedActivityCompletion}` | Sanctum | Delete completion |

Completion body: `{ "uuid", "status": "completed", "completed_at", "notes", "client_*" }`; status enum `ActivityStatus`.

---

### Habits & Habit Records

| Method | URI | Auth | Description |
|---|---|---|---|
| `GET` | `/api/v1/habits` | Sanctum | List habits (paginated) |
| `POST` | `/api/v1/habits` | Sanctum | Create habit |
| `GET` | `/api/v1/habits/{habit}` | Sanctum | Get habit |
| `PUT` / `PATCH` | `/api/v1/habits/{habit}` | Sanctum | Update habit |
| `DELETE` | `/api/v1/habits/{habit}` | Sanctum | Delete habit |
| `POST` | `/api/v1/habits/{habit}/toggle` | Sanctum | Toggle / log habit completion |
| `GET` | `/api/v1/habits/{habit}/records` | Sanctum | List habit records (fixed 30/page) |
| `POST` | `/api/v1/habits/{habit}/records` | Sanctum | Create habit record |
| `GET` | `/api/v1/habits/{habit}/streak` | Sanctum | Current streak |

Habit record endpoints: `GET /api/v1/habit-records`, `GET/PUT/PATCH/DELETE /api/v1/habit-records/{habitRecord}`.

#### `POST /api/v1/habits/{habit}/toggle`

Body: `{ "record_date": "2026-11-07", "status": "completed", "notes": "..." }` — if `record_date` omitted, uses today; toggles between `completed` and `pending` when `status` omitted. Returns updated habit/record, message e.g. `Habit toggled.`

#### `GET /api/v1/habits/{habit}/streak`

Returns `{ "habit_id": 1, "streak": 5 }` — current consecutive completed days ending today (or yesterday).

---

### Goals

| Method | URI | Auth | Description |
|---|---|---|---|
| `GET` | `/api/v1/goals` | Sanctum | List goals (paginated) |
| `POST` | `/api/v1/goals` | Sanctum | Create goal |
| `GET` | `/api/v1/goals/{goal}` | Sanctum | Get goal |
| `PUT` / `PATCH` | `/api/v1/goals/{goal}` | Sanctum | Update goal |
| `DELETE` | `/api/v1/goals/{goal}` | Sanctum | Delete goal |
| `PUT` / `PATCH` | `/api/v1/goals/{goal}/progress` | Sanctum | Update progress |

Goal resource: `{ id, uuid, title, description, target_date, progress (float 0..100), status, achieved_at, created_at, updated_at }`.

#### `PUT/PATCH /api/v1/goals/{goal}/progress`

Body: `{ "progress": 50, "status": "in_progress" }` — sets progress, optional status; runs completion state + achievement notification. Returns updated goal, message `Goal progress updated.`

---

### Daily Reports & Comments

| Method | URI | Auth | Description |
|---|---|---|---|
| `GET` | `/api/v1/daily-reports` | Sanctum | List daily reports (paginated) |
| `POST` | `/api/v1/daily-reports` | Sanctum | Create daily report |
| `GET` | `/api/v1/daily-reports/{dailyReport}` | Sanctum | Get daily report |
| `PUT` / `PATCH` | `/api/v1/daily-reports/{dailyReport}` | Sanctum | Update daily report |
| `DELETE` | `/api/v1/daily-reports/{dailyReport}` | Sanctum | Delete daily report |
| `GET` | `/api/v1/daily-reports/{dailyReport}/comments` | Sanctum | List comments |
| `POST` | `/api/v1/daily-reports/{dailyReport}/comments` | **admin** | Add comment |
| `DELETE` | `/api/v1/daily-reports/{dailyReport}/comments/{comment}` | Sanctum | Delete comment |

**Query params (list):** `user_id` (admin `all=true` only), `all`, `from`, `to`, `per_page`.

Daily report resource: `{ id, uuid, user_id, report_date, summary, self_assessment, calculated_score, scheduled_count, completed_count, score (legacy alias), completed_activities_count, total_activities_count, submitted_at, activities[], comments[], created_at, updated_at }`.

Admin comment: `{ comment }` required, max 5000; comment resource adds `id, uuid, daily_report_id, author_id, author, comment, created_at, updated_at`.

---

### User Documents

| Method | URI | Auth | Description |
|---|---|---|---|
| `GET` | `/api/v1/documents` | Sanctum | List documents (paginated) |
| `POST` | `/api/v1/documents` | Sanctum | Upload document (multipart) |
| `GET` | `/api/v1/documents/{document}` | Sanctum | Get document |
| `PUT` / `PATCH` | `/api/v1/documents/{document}` | Sanctum | Update document metadata |
| `DELETE` | `/api/v1/documents/{document}` | Sanctum | Delete document |
| `GET` | `/api/v1/documents/{document}/download` | Sanctum | Download file (`application/octet-stream`) |

Document resource: `{ id, uuid, title, description, category, file_name, mime_type, file_size, is_private, download_url, created_at, updated_at }`.

Upload body (multipart): `title` ✅, `file` ✅ (binary), `description?`, `category?`, `is_private?`.

---

### Library & Bookmarks

Library endpoints:

| Method | URI | Auth | Role | Description |
|---|---|---|---|---|
| `GET` | `/api/v1/library` | Sanctum | – | List visible library resources (paginated) |
| `GET` | `/api/v1/library/{libraryResource}` | Sanctum | – | Get library resource |
| `GET` | `/api/v1/library/{libraryResource}/download` | Sanctum | – | Download resource (`application/octet-stream`) |
| `POST` | `/api/v1/library` | Sanctum | **admin** | Upload library resource (multipart) |
| `PUT` / `PATCH` | `/api/v1/library/{libraryResource}` | Sanctum | **admin** | Update resource metadata |
| `DELETE` | `/api/v1/library/{libraryResource}` | Sanctum | **admin** | Delete resource |
| `GET` | `/api/v1/library/{libraryResource}/permissions` | Sanctum | **admin** | List permissions |
| `POST` | `/api/v1/library/{libraryResource}/permissions` | Sanctum | **admin** | Grant access (user **or** group) |
| `DELETE` | `/api/v1/library/{libraryResource}/permissions/{permission}` | Sanctum | **admin** | Revoke access |

Library item resource: `{ id, uuid, title, description, file_name, mime_type, file_size, visibility, status, uploaded_by, is_bookmarked, download_url, created_at, updated_at }`.

`POST .../permissions` body: either `user_id` (required when `group_id` absent) or `group_id` (required when `user_id` absent); cannot combine both.

Bookmarks:

| Method | URI | Auth | Description |
|---|---|---|---|
| `GET` | `/api/v1/bookmarks` | Sanctum | List bookmarks (paginated) |
| `POST` | `/api/v1/bookmarks` | Sanctum | Bookmark a library resource (`library_resource_id` required, must be visible) |
| `DELETE` | `/api/v1/bookmarks/{bookmark}` | Sanctum | Remove bookmark |

Bookmark resource: `{ id, uuid, library_resource_id, library_resource, created_at }`.

---

### Notifications

| Method | URI | Auth | Description |
|---|---|---|---|
| `GET` | `/api/v1/notifications` | Sanctum | List notifications (paginated) |
| `GET` | `/api/v1/notifications/unread-count` | Sanctum | Unread count |
| `POST` | `/api/v1/notifications/read-all` | Sanctum | Mark all read |
| `GET` | `/api/v1/notifications/{notification}` | Sanctum | Get notification |
| `POST` | `/api/v1/notifications/{notification}/read` | Sanctum | Mark read |
| `DELETE` | `/api/v1/notifications/{notification}` | Sanctum | Delete notification |

Query params for list: `unread` (boolean), `type` (enum `NotificationType`), `per_page`.

Unread count response: `{ "unread_count": 3 }`.

Notification resource: `{ id, uuid, type, title, body, data, read_at, is_read, sent_at, created_at }`.

Mark-all-read / mark-read responses use the success envelope.

---

### Device Tokens (Push)

| Method | URI | Auth | Description |
|---|---|---|---|
| `GET` | `/api/v1/device-tokens` | Sanctum | List device tokens |
| `POST` | `/api/v1/device-tokens` | Sanctum | Register / refresh device token |
| `DELETE` | `/api/v1/device-tokens/{deviceToken}` | Sanctum | Deactivate device token |

Register body: `{ "device_token": "...", "device_type": "android", "device_identifier": "..." }` — `device_type` enum: `android`, `ios`, `web`, `other`. Deactivation soft-deactivates (`is_active = false`) and returns the updated `DeviceToken` resource.

---

### Health Records, Exercise Records & Summaries

**Health records:**

| Method | URI | Auth | Description |
|---|---|---|---|
| `GET` | `/api/v1/health-records` | Sanctum | List health records (paginated) |
| `POST` | `/api/v1/health-records` | Sanctum | Create health record |
| `GET` | `/api/v1/health-records/summary` | Sanctum | Aggregates (from/to) |
| `GET` | `/api/v1/health-records/{healthRecord}` | Sanctum | Get record |
| `PUT` / `PATCH` | `/api/v1/health-records/{healthRecord}` | Sanctum | Update record |
| `DELETE` | `/api/v1/health-records/{healthRecord}` | Sanctum | Delete record |

Create/update body: `{ "record_date": "2026-11-07", "weight_kg": 70.5, "water_ml": 2000, "sleep_hours": 7.5, "blood_pressure_systolic": 120, "blood_pressure_diastolic": 80, "blood_pressure": "120/80", "notes": "...", "client_*" }`.

Summary response data: `{ record_count, average_weight_kg, average_water_ml, average_sleep_hours, ...latest... }` with optional `from` / `to` date filters.

**Exercise records:**

| Method | URI | Auth | Description |
|---|---|---|---|
| `GET` | `/api/v1/exercise-records` | Sanctum | List exercise records (paginated) |
| `POST` | `/api/v1/exercise-records` | Sanctum | Create exercise record |
| `GET` | `/api/v1/exercise-records/{exerciseRecord}` | Sanctum | Get record |
| `PUT` / `PATCH` | `/api/v1/exercise-records/{exerciseRecord}` | Sanctum | Update record |
| `DELETE` | `/api/v1/exercise-records/{exerciseRecord}` | Sanctum | Delete record |

Create body: `{ "activity_id": 1, "exercise_type": "running", "title": "Morning run", "duration_minutes": 30, "distance": 5.2, "calories_burned": 280, "notes": "...", "recorded_at": "2026-11-07T06:00:00.000000Z", "client_*": ... }`.

---

### Offline Synchronization

| Method | URI | Auth | Description |
|---|---|---|---|
| `POST` | `/api/v1/sync/push` | Sanctum | Push operations |
| `GET` | `/api/v1/sync/pull` | Sanctum | Pull changes |
| `GET` | `/api/v1/sync/conflicts` | Sanctum | List conflicts |
| `POST` | `/api/v1/sync/conflicts/{syncConflict}/resolve` | Sanctum | Resolve conflict |
| `GET` | `/api/v1/sync/operations` | Sanctum | List sync operations |

#### `POST /api/v1/sync/push`

**Request body:**

```json
{
  "device_id": 1,
  "conflict_policy": "latest_wins",
  "operations": [
    {
      "operation_uuid": "uuid",
      "entity_type": "habit",
      "entity_uuid": "uuid",
      "operation_type": "create",
      "client_version": 1,
      "client_updated_at": "2026-11-07T10:00:00.000000Z",
      "payload": { }
    }
  ]
}
```

| Field | Type | Required | Rules |
|---|---|---|---|
| `operations` | array | ✅ | min 1, max 200 items |
| `operations[].operation_uuid` | uuid | ✅ | – |
| `operations[].entity_type` | enum | ✅ | `SyncEntityType` |
| `operations[].entity_uuid` | uuid | ✅ | – |
| `operations[].operation_type` | enum | ✅ | `create`, `update`, `delete` |
| `operations[].client_version` | int | – | min 0 |
| `operations[].client_updated_at` | datetime | – | – |
| `operations[].payload` | object | – | entity payload |
| `device_id` | int | – | must belong to the authenticated user |
| `conflict_policy` | enum | – | `client_wins`, `server_wins`, `latest_wins`, `manual`; defaults to `latest_wins` |

**Response `200`:** success envelope with `data = { server_time, results: [...] }`; per-operation result: `{ operation_uuid, entity_type, entity_uuid, status, message?, server_version? }`; status `duplicate` when already synced, `failed` on error.

#### `GET /api/v1/sync/pull`

**Query params:** `since` (date, optional — ISO datetime; defaults to 100 years back).

**Response `200`:** success envelope with `data = { server_time, since, entities: { <entity_type>: [ { uuid, deleted, server_version, updated_at, data } ] } }`.

#### `GET /api/v1/sync/conflicts` / `POST /api/v1/sync/conflicts/{syncConflict}/resolve`

List conflicts (defaults to `status=pending`; filter via `status`), paginated.

Resolve body: `{ "resolution_type": "latest_wins" }`; applies client/server/manual per policy and marks conflict `resolved`.

#### `GET /api/v1/sync/operations`

Paginated list of processed sync operations.

---

### Legacy Endpoint

| Method | URI | Auth | Description |
|---|---|---|---|
| `GET` | `/api/user` | Sanctum | Legacy unversioned user endpoint |

Returns the authenticated user resource.

---

### Diagnostics

| Method | URI | Auth | Description |
|---|---|---|---|
| `GET` | `/api/v1/tasks` | Sanctum | Demo task list (raw JSON) |
| `POST` | `/api/v1/queue-test` | Sanctum | Dispatch example queue job (raw JSON) |
| `GET` | `/api/v1/admin-check` | Sanctum | Admin-only authorization check (`RoleMiddleware:admin`) |

`GET /api/v1/tasks` returns raw JSON:

```json
{ "tasks": [ { "id": 1, "title": "...", "status": "completed", "assigned_to": "..." } ] }
```

---

## Data Shape Quick Reference

### User

```json
{
  "id": 1,
  "uuid": "...",
  "name": "...",
  "email": "...",
  "role": "user",
  "roles": ["user"],
  "is_active": true,
  "email_verified": true,
  "prayer_preferences": {
    "timezone": "UTC",
    "calculation_method": "muslim_world_league",
    "latitude": 51.5,
    "longitude": -0.12,
    "notifications_enabled": true
  }
}
```

### Habit

```json
{
  "id": 1,
  "uuid": "...",
  "name": "...",
  "description": null,
  "is_active": true,
  "records": [],
  "records_count": 0,
  "created_at": "...",
  "updated_at": "..."
}
```

### Goal

```json
{
  "id": 1,
  "uuid": "...",
  "title": "...",
  "description": null,
  "target_date": "2026-12-31",
  "progress": 0.0,
  "status": "not_started",
  "achieved_at": null,
  "created_at": "...",
  "updated_at": "..."
}
```

### Habit record

```json
{ "id": 1, "uuid": "...", "habit_id": 1, "record_date": "2026-11-07", "status": "completed", "notes": null, "created_at": "...", "updated_at": "..." }
```

### Daily report

```json
{
  "id": 1,
  "uuid": "...",
  "user_id": 1,
  "report_date": "2026-11-07",
  "summary": "...",
  "self_assessment": "...",
  "calculated_score": 85.0,
  "scheduled_count": 3,
  "completed_count": 2,
  "score": null,
  "completed_activities_count": 2,
  "total_activities_count": 3,
  "submitted_at": "...",
  "activities": [],
  "comments": [],
  "created_at": "...",
  "updated_at": "..."
}
```

### Sync pull entity

```json
{
  "habit": [
    {
      "uuid": "...",
      "deleted": false,
      "server_version": 1,
      "updated_at": "2026-11-07T10:00:00.000000Z",
      "data": { }
    }
  ]
}
```

---

## Workflow Examples

### Obtain a token and create + complete an activity

```bash
# 1. Login and receive a token
curl -X POST http://localhost:8000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@thinkcode.dev","password":"password"}'

# 2. Use the returned token
TOKEN="<your-token>"
curl http://localhost:8000/api/v1/activities \
  -H "Authorization: Bearer $TOKEN"

# 3. Create an activity
curl -X POST http://localhost:8000/api/v1/activities \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title":"Fajr prayer","scheduled_date":"2026-11-07","activity_type":"prayer"}'

# 4. Complete it
curl -X POST http://localhost:8000/api/v1/activities/1/complete \
  -H "Authorization: Bearer $TOKEN"
```

### Offline sync round-trip

```bash
curl -X POST http://localhost:8000/api/v1/sync/push \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"operations":[{"operation_uuid":"op-1","entity_type":"habit","entity_uuid":"uuid","operation_type":"create","client_version":1,"payload":{}}]}'

curl "http://localhost:8000/api/v1/sync/pull?since=2026-11-07T00:00:00.000000Z" \
  -H "Authorization: Bearer $TOKEN"
```

---

## curl Examples

```bash
# Health check
curl http://localhost:8000/api/v1/health

# Authenticated request
curl http://localhost:8000/api/v1/auth/me \
  -H "Authorization: Bearer $TOKEN"

# Upload a document (multipart)
curl -X POST http://localhost:8000/api/v1/documents \
  -H "Authorization: Bearer $TOKEN" \
  -F "title=My Note" \
  -F "file=@/path/to/note.pdf"

# Download a library resource (binary)
curl -L http://localhost:8000/api/v1/library/1/download \
  -H "Authorization: Bearer $TOKEN" \
  -o resource.bin
```

---

## Demo Accounts

| Role | Email | Password | Abilities |
|---|---|---|---|
| Admin | `admin@thinkcode.dev` | `password` | `["*"]` |
| Standard user | `user@thinkcode.dev` | `password` | `["profile:read","profile:update","activities:read","activities:write"]` |

Admin-only capabilities (e.g. shared timetable management, library uploads, daily report comments, admin checks) require the admin role via `RoleMiddleware:admin` and will return `403` otherwise.

---

## See Also

- [`docs/openapi.json`](./openapi.json) — machine-readable OpenAPI JSON (the **JSON URL**)
- [`docs/DB.md`](./DB.md) — database architecture
- [`docs/PRD.md`](./PRD.md) — product requirements
- [`docs/DESIGN.md`](./DESIGN.md) — design documentation
- [`docs/AGENT.md`](./AGENT.md) — AI agent guidelines
