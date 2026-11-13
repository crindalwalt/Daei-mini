# ThinkCode API

Complete REST API reference for the ThinkCode full-stack template. Every endpoint is documented with a runnable `curl` example, request fields, query filters, and response shapes.

All endpoints are prefixed with `/api/v1`.

---

## Table of contents

- [Base URLs](#base-urls)
- [Conventions](#conventions)
- [Quickstart](#quickstart)
- [Health](#health)
- [Authentication](#authentication)
- [Personal access tokens](#personal-access-tokens)
- [Activities](#activities)
- [Shared timetables](#shared-timetables)
- [Shared activity completions](#shared-activity-completions)
- [Habits](#habits)
- [Habit records](#habit-records)
- [Goals](#goals)
- [Daily reports](#daily-reports)
- [User documents](#user-documents)
- [Library resources](#library-resources)
- [Bookmarks](#bookmarks)
- [Notifications](#notifications)
- [Device tokens](#device-tokens)
- [Health records](#health-records)
- [Exercise records](#exercise-records)
- [Offline synchronization](#offline-synchronization)
- [Demo endpoints](#demo-endpoints)
- [Admin API](#admin-api)
- [Legacy endpoints](#legacy-endpoints)
- [Endpoint reference](#endpoint-reference)
- [Common error responses](#common-error-responses)
- [Reference](#reference)

---

## Base URLs

| Environment | Base URL |
|---|---|
| Docker (nginx gateway) | `http://localhost:8082/api/v1` |
| Backend (PHP-FPM / `artisan serve`) | `http://localhost:8000/api/v1` |

> After changing `FORWARD_HTTP_PORT`, update the URLs above (currently `8082`).
>
> Every example below uses `http://localhost:8082`. Replace `8082` with `8000` when calling
> `php artisan serve` directly.

The examples use these shell variables:

```bash
export BASE="http://localhost:8082/api/v1"
export TOKEN="1|your-personal-access-token"
export ADMIN_TOKEN="2|your-admin-personal-access-token"
```

For the SPA cookie flow, see [SPA cookie authentication](#spa-cookie-authentication-sanctum).

---

## Conventions

### Headers

- JSON requests and responses use `Content-Type: application/json` and `Accept: application/json`.
- File uploads use `multipart/form-data` (`-F` in curl) and must **not** set `Content-Type` manually.
  curl adds the multipart boundary automatically.
- Authenticated endpoints accept either:
  - **Bearer token**: `Authorization: Bearer <token>` from `POST /api/v1/auth/login` or
    `POST /api/v1/tokens`, or
  - **SPA cookie session**: Sanctum cookie auth from the frontend origin.
- Every response includes an `X-Request-ID` header. You can supply your own `X-Request-ID`
  (or `X-Correlation-ID`) header to correlate logs.

### Success envelope

Most JSON endpoints return:

```json
{
  "success": true,
  "data": {},
  "message": "OK"
}
```

Paginated endpoints return an array in `data` plus a `meta` object:

```json
{
  "success": true,
  "data": [],
  "message": "Activities retrieved.",
  "meta": {
    "current_page": 1,
    "per_page": 20,
    "total": 0,
    "last_page": 1
  }
}
```

### Error envelope

```json
{
  "success": false,
  "data": null,
  "message": "The given data was invalid.",
  "errors": {
    "email": ["The email field is required."]
  }
}
```

`errors` is only present for validation errors (`422`).

### Endpoints without the envelope

These return plain JSON or plain text/CSV:

- `GET /health`, `GET /health/live`, `GET /health/ready`
- `POST /tokens`, `GET /tokens`, `DELETE /tokens/current`, `DELETE /tokens/{id}`
- `GET /tasks`, `POST /queue-test`, `GET /admin-check`
- `GET /user` (legacy)
- Admin CSV exports (`/admin/*/export`)

### Pagination

List endpoints accept `per_page` unless documented otherwise.

- Default is `20` (some endpoints default to `10`, `15`, `30`, or `9`; each section states it).
- Maximum is `100`.
- Values outside `1..100` return `422`.
- `meta.total` is the total number of matching records.

### Date and time formats

- Dates: `YYYY-MM-DD` (for example `2026-11-09`).
- Times: 24-hour `HH:MM` (for example `07:30`).
- Timestamps: ISO 8601, for example `2026-11-09T10:00:00.000000Z`.

### IDs and UUIDs

- Path IDs are numeric database IDs unless stated otherwise.
- Offline-capable resources accept an optional client-generated `uuid` on create.
  Repeating a create with the same `uuid` is idempotent for activities.
- Sync operations require UUIDs for `operation_uuid` and `entity_uuid`.

### Rate limits

Rate limits are keyed by email + IP, per minute:

| Endpoint | Limit |
|---|---|
| `POST /auth/login` | 5/min |
| `POST /auth/forgot-password` | 5/min |
| `POST /auth/reset-password` | 5/min |
| `POST /auth/email/verification-notification` | 6/min |
| `POST /tokens` | 5/min |

Exceeding a limit returns `429` with a `success: false` envelope.

### Authorization

- `Sanctum` means a valid Bearer token or SPA cookie session is required.
- `Admin` means the authenticated user must have `role = "admin"`.
- Ownership is enforced: trying to read or mutate another user's record returns `404`.
- Suspended users receive `403` on every authenticated endpoint.

---

## Quickstart

Register, log in, and call an authenticated endpoint in one shell session.

```bash
export BASE="http://localhost:8082/api/v1"
export EMAIL="ada@example.com"
export PASSWORD="Secret123!"

# 1. Register (returns 201 and sends a verification email)
curl -i -X POST "$BASE/auth/register" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -d "{
    \"name\": \"Ada Lovelace\",
    \"email\": \"$EMAIL\",
    \"password\": \"$PASSWORD\",
    \"password_confirmation\": \"$PASSWORD\"
  }"

# 2. Log in and capture the Bearer token (requires jq)
TOKEN=$(curl -s -X POST "$BASE/auth/login" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -d "{
    \"email\": \"$EMAIL\",
    \"password\": \"$PASSWORD\",
    \"device_name\": \"my-device\"
  }" | jq -r '.data.token')

# 3. Call an authenticated endpoint
curl -i "$BASE/auth/me" \
  -H "Accept: application/json" \
  -H "Authorization: Bearer $TOKEN"

# 4. Use the token on any protected endpoint
curl -i "$BASE/activities" \
  -H "Accept: application/json" \
  -H "Authorization: Bearer $TOKEN"
```

To get an admin token, log in with an admin account and use the returned token:

```bash
export ADMIN_TOKEN=$(curl -s -X POST "$BASE/auth/login" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -d '{"email":"admin@example.com","password":"password","device_name":"admin-cli"}' \
  | jq -r '.data.token')
```

### SPA cookie authentication (Sanctum)

The frontend normally authenticates with the Sanctum cookie flow. When testing by hand:

```bash
# 1. Obtain the XSRF-TOKEN cookie
curl -i -c cookies.txt http://localhost:8082/sanctum/csrf-cookie

# 2. Read and URL-decode the token into a header variable
XSRF=$(grep XSRF-TOKEN cookies.txt | awk '{print $7}' \
  | python3 -c 'import sys,urllib.parse; print(urllib.parse.unquote(sys.stdin.read().strip()))')

# 3. Log in using the cookie jar
curl -i -b cookies.txt -c cookies.txt -X POST http://localhost:8082/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -H "X-XSRF-TOKEN: $XSRF" \
  -d '{"email":"ada@example.com","password":"Secret123!"}'

# 4. Reuse the cookies for authenticated requests
curl -i -b cookies.txt http://localhost:8082/api/v1/auth/me \
  -H "Accept: application/json"
```

> Cookie-authenticated requests must originate from the configured Sanctum stateful domain
> and include the `X-XSRF-TOKEN` header for state-changing methods.

---

## Health

Health endpoints return plain JSON (no `success` envelope). They are public.

### Check service health

Alias of the readiness probe.

```bash
curl -i "$BASE/health"
```

**Response `200`:**

```json
{
  "status": "healthy",
  "timestamp": "2026-11-09T10:00:00.000000Z",
  "environment": "local",
  "services": {
    "database": { "status": "up" },
    "redis": { "status": "up" }
  },
  "version": {
    "laravel": "12.x",
    "php": "8.4.x"
  }
}
```

`version` is only included outside production when `APP_DEBUG=true`.

If a dependency is down, `status` is `"degraded"` and the endpoint returns `503`.

### Liveness probe

Verifies the PHP process is running. Does not query the database or Redis.

```bash
curl -i "$BASE/health/live"
```

**Response `200`:**

```json
{
  "status": "ok",
  "timestamp": "2026-11-09T10:00:00.000000Z"
}
```

### Readiness probe

Verifies database and cache/queue connectivity.

```bash
curl -i "$BASE/health/ready"
```

**Response `200`:**

```json
{
  "status": "healthy",
  "timestamp": "2026-11-09T10:00:00.000000Z",
  "environment": "local",
  "services": {
    "database": { "status": "up" },
    "redis": { "status": "up" }
  }
}
```

**Response `503` when a dependency is unavailable:**

```json
{
  "status": "degraded",
  "timestamp": "2026-11-09T10:00:00.000000Z",
  "environment": "production",
  "services": {
    "database": { "status": "down", "error": "Database service unavailable." },
    "redis": { "status": "up" }
  }
}
```

When Redis is not configured as the cache or queue driver:

```json
{
  "services": {
    "redis": {
      "status": "skipped",
      "note": "Redis not configured as primary driver"
    }
  }
}
```

---

## Authentication

### Login

`POST /auth/login` — public, throttled to 5 requests per minute per email + IP.

| Field | Type | Required | Notes |
|---|---|---|---|
| `email` | string | yes | Max 255 characters. |
| `password` | string | yes | Max 255 characters. |
| `device_name` | string | no | Token name. Max 100 characters. Defaults to `api-token`. |

```bash
curl -i -X POST "$BASE/auth/login" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -d '{
    "email": "developer@thinkcode.dev",
    "password": "password",
    "device_name": "my-device"
  }'
```

**Response `200`:**

```json
{
  "success": true,
  "data": {
    "user": {
      "id": 1,
      "uuid": "0f5d7b1e-8a5c-4b7a-9d2f-2f7a3c4b5d6e",
      "name": "Ada Lovelace",
      "email": "developer@thinkcode.dev",
      "bio": null,
      "role": "user",
      "roles": ["user"],
      "is_active": true,
      "email_verified": true,
      "created_at": "2026-11-01T09:00:00.000000Z",
      "updated_at": "2026-11-09T10:00:00.000000Z",
      "prayer_preferences": {
        "timezone": "UTC",
        "calculation_method": "muslim_world_league",
        "latitude": null,
        "longitude": null,
        "notifications_enabled": true
      }
    },
    "token": "1|...",
    "token_type": "Bearer",
    "abilities": [
      "profile:read",
      "profile:update",
      "activities:read",
      "activities:write"
    ]
  },
  "message": "Authentication successful."
}
```

**Errors:**

- `422` — invalid credentials, deactivated account (`is_active = false`), or suspended account.
- `429` — too many attempts.

```json
{
  "success": false,
  "data": null,
  "message": "These credentials do not match our records.",
  "errors": {
    "email": ["These credentials do not match our records."]
  }
}
```

Admin users receive `["*"]` abilities.

### Register

`POST /auth/register` — public. Can be disabled with `ALLOW_REGISTRATION=false`; then it returns `403`.

| Field | Type | Required | Notes |
|---|---|---|---|
| `name` | string | yes | Max 255 characters. |
| `email` | string | yes | Must be unique. Max 255 characters. |
| `password` | string | yes | Must satisfy the default password rules and match `password_confirmation`. |
| `password_confirmation` | string | yes | Must match `password`. |

```bash
curl -i -X POST "$BASE/auth/register" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -d '{
    "name": "Ada Lovelace",
    "email": "ada@example.com",
    "password": "Secret123!",
    "password_confirmation": "Secret123!"
  }'
```

**Response `201`:**

```json
{
  "success": true,
  "data": {
    "user": {
      "id": 2,
      "uuid": "6a1c2d3e-4f5a-6b7c-8d9e-0f1a2b3c4d5e",
      "name": "Ada Lovelace",
      "email": "ada@example.com",
      "bio": null,
      "role": "user",
      "roles": ["user"],
      "is_active": true,
      "email_verified": false,
      "created_at": "2026-11-09T10:00:00.000000Z",
      "updated_at": "2026-11-09T10:00:00.000000Z",
      "prayer_preferences": {
        "timezone": "UTC",
        "calculation_method": "muslim_world_league",
        "latitude": null,
        "longitude": null,
        "notifications_enabled": true
      }
    }
  },
  "message": "Registration successful."
}
```

Registration sends a signed verification email. Opening the link verifies the address and redirects to
`FRONTEND_URL/login?verified=1` (or `?verified=0` for an invalid or expired link).

### Verify email (signed link)

`GET /auth/email/verify/{id}/{hash}` — signed URL from the verification email.

```bash
curl -i -L "http://localhost:8082/api/v1/auth/email/verify/2/<sha1-hash>?expires=...&signature=..."
```

- Valid link: marks `email_verified_at`, redirects to `FRONTEND_URL/login?verified=1`.
- Invalid/expired link: redirects to `FRONTEND_URL/login?verified=0`.

This endpoint returns a redirect, not a JSON envelope.

### Resend email verification

`POST /auth/email/verification-notification` — Sanctum, throttled to 6/min.

```bash
curl -i -X POST "$BASE/auth/email/verification-notification" \
  -H "Accept: application/json" \
  -H "Authorization: Bearer $TOKEN"
```

**Response `200`:**

```json
{
  "success": true,
  "data": null,
  "message": "Verification email sent."
}
```

Already-verified accounts return `200` with `"Email address is already verified."`.

### Forgot password (email OTP)

`POST /auth/forgot-password` — public, throttled to 5/min.

| Field | Type | Required |
|---|---|---|
| `email` | string | yes |

```bash
curl -i -X POST "$BASE/auth/forgot-password" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -d '{
    "email": "developer@thinkcode.dev"
  }'
```

**Response `200`:**

```json
{
  "success": true,
  "data": {
    "email": "developer@thinkcode.dev"
  },
  "message": "If the account exists, a one-time code has been sent."
}
```

A six-digit one-time code is emailed to the account. The same message is returned even when the
account does not exist, to avoid account enumeration. Requesting another code too soon returns
`429` with `"Please wait before requesting another code."`.

> Outside production some deployments also return the code as `data.reset_token` for local testing.

### Reset password

`POST /auth/reset-password` — public, throttled to 5/min.

| Field | Type | Required | Notes |
|---|---|---|---|
| `token` | string | yes | The six-digit OTP from the email. |
| `email` | string | yes | Account email. |
| `password` | string | yes | Must satisfy the default password rules and match `password_confirmation`. |
| `password_confirmation` | string | yes | Must match `password`. |

```bash
curl -i -X POST "$BASE/auth/reset-password" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -d '{
    "token": "123456",
    "email": "developer@thinkcode.dev",
    "password": "NewSecret123!",
    "password_confirmation": "NewSecret123!"
  }'
```

**Response `200`:**

```json
{
  "success": true,
  "data": null,
  "message": "Password reset successfully."
}
```

A successful reset revokes every existing personal access token. If the account was unverified,
the email is marked verified.

### Current user

`GET /auth/me` — Sanctum.

```bash
curl -i "$BASE/auth/me" \
  -H "Accept: application/json" \
  -H "Authorization: Bearer $TOKEN"
```

**Response `200`:**

```json
{
  "success": true,
  "data": {
    "user": {
      "id": 1,
      "uuid": "0f5d7b1e-8a5c-4b7a-9d2f-2f7a3c4b5d6e",
      "name": "Ada Lovelace",
      "email": "developer@thinkcode.dev",
      "bio": "Building the ThinkCode template.",
      "role": "user",
      "roles": ["user"],
      "is_active": true,
      "email_verified": true,
      "created_at": "2026-11-01T09:00:00.000000Z",
      "updated_at": "2026-11-09T10:00:00.000000Z",
      "prayer_preferences": {
        "timezone": "Europe/London",
        "calculation_method": "muslim_world_league",
        "latitude": 51.5074,
        "longitude": -0.1278,
        "notifications_enabled": true
      }
    }
  },
  "message": "OK"
}
```

### Update profile

`PATCH /auth/profile` — Sanctum. All fields are optional; send only what changes.

| Field | Type | Notes |
|---|---|---|
| `name` | string | Max 255. |
| `email` | string | Must be unique. Changing it clears `email_verified_at`. |
| `bio` | string\|null | Max 2000. |
| `timezone` | string | Must be a valid PHP timezone identifier. |
| `calculation_method` | string\|null | See [Prayer calculation methods](#prayer-calculation-methods). |
| `latitude` | number\|null | Between `-90` and `90`. |
| `longitude` | number\|null | Between `-180` and `180`. |
| `notifications_enabled` | boolean | |

```bash
curl -i -X PATCH "$BASE/auth/profile" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "name": "Ada Lovelace",
    "email": "ada@example.com",
    "bio": "Mathematician and API tester.",
    "timezone": "Europe/London",
    "calculation_method": "muslim_world_league",
    "latitude": 51.5074,
    "longitude": -0.1278,
    "notifications_enabled": true
  }'
```

**Response `200`:**

```json
{
  "success": true,
  "data": {
    "user": {
      "id": 1,
      "uuid": "0f5d7b1e-8a5c-4b7a-9d2f-2f7a3c4b5d6e",
      "name": "Ada Lovelace",
      "email": "ada@example.com",
      "bio": "Mathematician and API tester.",
      "role": "user",
      "roles": ["user"],
      "is_active": true,
      "email_verified": false,
      "created_at": "2026-11-01T09:00:00.000000Z",
      "updated_at": "2026-11-09T10:00:00.000000Z",
      "prayer_preferences": {
        "timezone": "Europe/London",
        "calculation_method": "muslim_world_league",
        "latitude": 51.5074,
        "longitude": -0.1278,
        "notifications_enabled": true
      }
    }
  },
  "message": "Profile updated successfully."
}
```

### Update password

`PATCH /auth/password` — Sanctum.

| Field | Type | Required | Notes |
|---|---|---|---|
| `current_password` | string | yes | Must match the current password. |
| `password` | string | yes | Minimum 8 characters, must match `password_confirmation`, and must differ from `current_password`. |
| `password_confirmation` | string | yes | Must match `password`. |

```bash
curl -i -X PATCH "$BASE/auth/password" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "current_password": "Secret123!",
    "password": "NewSecret123!",
    "password_confirmation": "NewSecret123!"
  }'
```

**Response `200`:**

```json
{
  "success": true,
  "data": null,
  "message": "Password updated successfully."
}
```

The current token stays valid. Every other personal access token for the user is revoked.

### Logout

`POST /auth/logout` — Sanctum.

```bash
curl -i -X POST "$BASE/auth/logout" \
  -H "Accept: application/json" \
  -H "Authorization: Bearer $TOKEN"
```

**Response `200`:**

```json
{
  "success": true,
  "data": null,
  "message": "Logged out successfully."
}
```

Logout revokes the current personal access token and invalidates the SPA session when present.

---

## Personal access tokens

Token endpoints return plain JSON (no `success` envelope).

### Issue token

`POST /tokens` — public, throttled to 5/min.

| Field | Type | Required | Notes |
|---|---|---|---|
| `email` | string | yes | Account email. |
| `password` | string | yes | Account password. |
| `token_name` | string | yes | Max 255. |
| `abilities` | string[] | no | Max 50 characters per ability. Omit for `["*"]`. |

```bash
curl -i -X POST "$BASE/tokens" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -d '{
    "email": "developer@thinkcode.dev",
    "password": "password",
    "token_name": "my-api-client",
    "abilities": ["profile:read", "activities:read"]
  }'
```

**Response `201`:**

```json
{
  "token": "2|...",
  "token_type": "Bearer",
  "abilities": ["profile:read", "activities:read"],
  "expires_at": "2026-11-16T10:00:00.000000Z",
  "message": "Personal access token issued successfully."
}
```

Tokens expire after `SANCTUM_TOKEN_EXPIRATION` minutes (default `10080`, i.e. 7 days).

Default abilities by role:

| Role | Abilities |
|---|---|
| `user` | `profile:read`, `profile:update`, `activities:read`, `activities:write` |
| `admin` | `*` |

### List tokens

`GET /tokens` — Sanctum. Raw token values are never returned after issuance.

```bash
curl -i "$BASE/tokens" \
  -H "Accept: application/json" \
  -H "Authorization: Bearer $TOKEN"
```

**Response `200`:**

```json
{
  "tokens": [
    {
      "id": 1,
      "name": "my-api-client",
      "abilities": ["profile:read"],
      "last_used_at": null,
      "expires_at": "2026-11-16T10:00:00.000000Z",
      "created_at": "2026-11-09T10:00:00.000000Z"
    }
  ]
}
```

### Revoke current token

`DELETE /tokens/current` — Sanctum.

```bash
curl -i -X DELETE "$BASE/tokens/current" \
  -H "Accept: application/json" \
  -H "Authorization: Bearer $TOKEN"
```

**Response `200`:**

```json
{
  "message": "Current token revoked successfully."
}
```

If the request was authenticated with an SPA cookie instead of a Bearer token:

```json
{
  "message": "The current request did not use a personal access token."
}
```

with status `400`.

### Revoke token by id

`DELETE /tokens/{id}` — Sanctum. You can only revoke your own tokens.

```bash
curl -i -X DELETE "$BASE/tokens/1" \
  -H "Accept: application/json" \
  -H "Authorization: Bearer $TOKEN"
```

**Response `200`:**

```json
{
  "message": "Token revoked successfully."
}
```

Unknown token ID:

```json
{
  "message": "Token not found."
}
```

with status `404`.

---

## Activities

Personal activities for the authenticated user. All endpoints require Sanctum and enforce
ownership.

Activity object shape:

```json
{
  "id": 1,
  "uuid": "6f1c1e3a-2b4d-4c5e-8f90-123456789abc",
  "title": "Morning run",
  "description": "5km easy run",
  "activity_type": "exercise",
  "scheduled_date": "2026-11-09",
  "start_time": "07:00",
  "end_time": "07:45",
  "status": "pending",
  "reminder_enabled": true,
  "reminders": [],
  "created_at": "2026-11-09T06:00:00.000000Z",
  "updated_at": "2026-11-09T06:00:00.000000Z"
}
```

`exercise_records` is included when the activity detail is fetched.

### List activities

`GET /activities` — Sanctum, paginated.

| Query | Type | Notes |
|---|---|---|
| `date` | date | Exact scheduled date. |
| `from` | date | Scheduled date >= `from`. |
| `to` | date | Scheduled date <= `to`; must be after or equal to `from`. |
| `status` | enum | See [Activity statuses](#activity-statuses). |
| `activity_type` | enum | See [Activity types](#activity-types). |
| `search` | string | Matches the title (contains). Max 255. |
| `per_page` | integer | 1–100, default 20. |

```bash
curl -i "$BASE/activities?from=2026-11-01&to=2026-11-30&status=pending&activity_type=exercise&search=run&per_page=50" \
  -H "Accept: application/json" \
  -H "Authorization: Bearer $TOKEN"
```

**Response `200`:**

```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "uuid": "6f1c1e3a-2b4d-4c5e-8f90-123456789abc",
      "title": "Morning run",
      "description": "5km easy run",
      "activity_type": "exercise",
      "scheduled_date": "2026-11-09",
      "start_time": "07:00",
      "end_time": "07:45",
      "status": "pending",
      "reminder_enabled": true,
      "reminders": [],
      "created_at": "2026-11-09T06:00:00.000000Z",
      "updated_at": "2026-11-09T06:00:00.000000Z"
    }
  ],
  "message": "Activities retrieved.",
  "meta": {
    "current_page": 1,
    "per_page": 50,
    "total": 1,
    "last_page": 1
  }
}
```

### Create activity

`POST /activities` — Sanctum.

| Field | Type | Required | Notes |
|---|---|---|---|
| `uuid` | uuid | no | Client-generated id. Repeating it returns the existing activity. |
| `title` | string | yes | Max 255. |
| `description` | string\|null | no | Max 5000. |
| `activity_type` | enum | no | Defaults to the database default (`other`). |
| `scheduled_date` | date | yes | |
| `start_time` | `HH:MM` | no | |
| `end_time` | `HH:MM` | no | Must be after `start_time`. |
| `status` | enum | no | Defaults to `pending`. |
| `reminder_enabled` | boolean | no | |
| `client_created_at` | timestamp | no | |
| `client_updated_at` | timestamp | no | |

```bash
curl -i -X POST "$BASE/activities" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "title": "Morning run",
    "description": "5km easy run",
    "activity_type": "exercise",
    "scheduled_date": "2026-11-09",
    "start_time": "07:00",
    "end_time": "07:45",
    "status": "pending",
    "reminder_enabled": true
  }'
```

**Response `201`:**

```json
{
  "success": true,
  "data": {
    "id": 1,
    "uuid": "6f1c1e3a-2b4d-4c5e-8f90-123456789abc",
    "title": "Morning run",
    "description": "5km easy run",
    "activity_type": "exercise",
    "scheduled_date": "2026-11-09",
    "start_time": "07:00",
    "end_time": "07:45",
    "status": "pending",
    "reminder_enabled": true,
    "reminders": [],
    "created_at": "2026-11-09T06:00:00.000000Z",
    "updated_at": "2026-11-09T06:00:00.000000Z"
  },
  "message": "Activity created."
}
```

Creating with an existing `uuid` returns `200` and `"Activity already synchronized."`.

### Get activity

`GET /activities/{activity}` — Sanctum.

```bash
curl -i "$BASE/activities/1" \
  -H "Accept: application/json" \
  -H "Authorization: Bearer $TOKEN"
```

**Response `200`:**

```json
{
  "success": true,
  "data": {
    "id": 1,
    "uuid": "6f1c1e3a-2b4d-4c5e-8f90-123456789abc",
    "title": "Morning run",
    "description": "5km easy run",
    "activity_type": "exercise",
    "scheduled_date": "2026-11-09",
    "start_time": "07:00",
    "end_time": "07:45",
    "status": "completed",
    "reminder_enabled": true,
    "reminders": [],
    "exercise_records": [],
    "created_at": "2026-11-09T06:00:00.000000Z",
    "updated_at": "2026-11-09T07:50:00.000000Z"
  },
  "message": "OK"
}
```

### Update activity

`PUT|PATCH /activities/{activity}` — Sanctum. Send only the fields to change.

Fields are the same as create, except `uuid` and `client_created_at` are not accepted.

```bash
curl -i -X PATCH "$BASE/activities/1" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "title": "Morning run (updated)",
    "status": "completed"
  }'
```

**Response `200`:**

```json
{
  "success": true,
  "data": {
    "id": 1,
    "uuid": "6f1c1e3a-2b4d-4c5e-8f90-123456789abc",
    "title": "Morning run (updated)",
    "description": "5km easy run",
    "activity_type": "exercise",
    "scheduled_date": "2026-11-09",
    "start_time": "07:00",
    "end_time": "07:45",
    "status": "completed",
    "reminder_enabled": true,
    "reminders": [],
    "created_at": "2026-11-09T06:00:00.000000Z",
    "updated_at": "2026-11-09T07:50:00.000000Z"
  },
  "message": "Activity updated."
}
```

### Delete activity

`DELETE /activities/{activity}` — Sanctum. Soft-deletes the activity.

```bash
curl -i -X DELETE "$BASE/activities/1" \
  -H "Accept: application/json" \
  -H "Authorization: Bearer $TOKEN"
```

**Response `200`:**

```json
{
  "success": true,
  "data": null,
  "message": "Activity deleted."
}
```

### Complete activity

`POST /activities/{activity}/complete` — Sanctum. Sets `status` to `completed`.

```bash
curl -i -X POST "$BASE/activities/1/complete" \
  -H "Accept: application/json" \
  -H "Authorization: Bearer $TOKEN"
```

**Response `200`:**

```json
{
  "success": true,
  "data": {
    "id": 1,
    "uuid": "6f1c1e3a-2b4d-4c5e-8f90-123456789abc",
    "title": "Morning run",
    "description": "5km easy run",
    "activity_type": "exercise",
    "scheduled_date": "2026-11-09",
    "start_time": "07:00",
    "end_time": "07:45",
    "status": "completed",
    "reminder_enabled": true,
    "reminders": [],
    "created_at": "2026-11-09T06:00:00.000000Z",
    "updated_at": "2026-11-09T07:50:00.000000Z"
  },
  "message": "Activity completed."
}
```

### List activity reminders

`GET /activities/{activity}/reminders` — Sanctum. Returns a non-paginated array.

```bash
curl -i "$BASE/activities/1/reminders" \
  -H "Accept: application/json" \
  -H "Authorization: Bearer $TOKEN"
```

**Response `200`:**

```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "uuid": "8a2f7c1d-3e4b-4f5a-9c6d-7e8f9a0b1c2d",
      "activity_id": 1,
      "reminder_at": "2026-11-10T07:00:00+00:00",
      "is_enabled": true,
      "channel": "push",
      "created_at": "2026-11-09T06:05:00+00:00",
      "updated_at": "2026-11-09T06:05:00+00:00"
    }
  ],
  "message": "Reminders retrieved."
}
```

### Create activity reminder

`POST /activities/{activity}/reminders` — Sanctum.

| Field | Type | Required | Notes |
|---|---|---|---|
| `uuid` | uuid | no | |
| `reminder_at` | timestamp | yes | Must be after now. |
| `is_enabled` | boolean | no | Defaults to `true`. |
| `channel` | enum | no | `local`, `push`, or `email`. Defaults to `local`. |
| `client_created_at` | timestamp | no | |
| `client_updated_at` | timestamp | no | |

```bash
curl -i -X POST "$BASE/activities/1/reminders" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "reminder_at": "2026-11-10T07:00:00Z",
    "channel": "push",
    "is_enabled": true
  }'
```

**Response `201`:**

```json
{
  "success": true,
  "data": {
    "id": 1,
    "uuid": "8a2f7c1d-3e4b-4f5a-9c6d-7e8f9a0b1c2d",
    "activity_id": 1,
    "reminder_at": "2026-11-10T07:00:00+00:00",
    "is_enabled": true,
    "channel": "push",
    "created_at": "2026-11-09T06:05:00+00:00",
    "updated_at": "2026-11-09T06:05:00+00:00"
  },
  "message": "Reminder created."
}
```

### Update activity reminder

`PUT|PATCH /activities/{activity}/reminders/{reminder}` — Sanctum.

| Field | Type | Notes |
|---|---|---|
| `reminder_at` | timestamp | |
| `is_enabled` | boolean | |
| `channel` | enum | `local`, `push`, `email`. |
| `client_updated_at` | timestamp | |

```bash
curl -i -X PUT "$BASE/activities/1/reminders/1" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "reminder_at": "2026-11-10T07:30:00Z",
    "is_enabled": false
  }'
```

**Response `200`:**

```json
{
  "success": true,
  "data": {
    "id": 1,
    "uuid": "8a2f7c1d-3e4b-4f5a-9c6d-7e8f9a0b1c2d",
    "activity_id": 1,
    "reminder_at": "2026-11-10T07:30:00+00:00",
    "is_enabled": false,
    "channel": "push",
    "created_at": "2026-11-09T06:05:00+00:00",
    "updated_at": "2026-11-09T06:10:00+00:00"
  },
  "message": "Reminder updated."
}
```

### Delete activity reminder

`DELETE /activities/{activity}/reminders/{reminder}` — Sanctum.

```bash
curl -i -X DELETE "$BASE/activities/1/reminders/1" \
  -H "Accept: application/json" \
  -H "Authorization: Bearer $TOKEN"
```

**Response `200`:**

```json
{
  "success": true,
  "data": null,
  "message": "Reminder deleted."
}
```

---

## Shared timetables

Shared timetables are created by admins and assigned to users or groups. Regular users only see
published timetables they own or are assigned to.

Timetable object shape:

```json
{
  "id": 1,
  "uuid": "3b7d9e1f-2a4c-4d6e-8f01-23456789abcd",
  "title": "Team schedule",
  "description": "November rotation",
  "created_by": 1,
  "start_date": "2026-11-01",
  "end_date": "2026-11-30",
  "status": "published",
  "created_at": "2026-10-25T09:00:00.000000Z",
  "updated_at": "2026-10-26T09:00:00.000000Z"
}
```

List/detail responses may also include `activities`, `assignments`, and `activities_count` /
`assignments_count` when loaded.

### List shared timetables

`GET /shared-timetables` — Sanctum, paginated.

| Query | Type | Notes |
|---|---|---|
| `status` | enum | `draft`, `published`, `archived`. Only applied for admins. |
| `search` | string | Matches the title. |
| `per_page` | integer | 1–100, default 20. |

Regular users only receive `published` timetables they created or that are assigned to them
directly or through a group.

```bash
curl -i "$BASE/shared-timetables?status=published&search=team&per_page=20" \
  -H "Accept: application/json" \
  -H "Authorization: Bearer $TOKEN"
```

**Response `200`:**

```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "uuid": "3b7d9e1f-2a4c-4d6e-8f01-23456789abcd",
      "title": "Team schedule",
      "description": "November rotation",
      "created_by": 1,
      "start_date": "2026-11-01",
      "end_date": "2026-11-30",
      "status": "published",
      "activities_count": 4,
      "assignments_count": 2,
      "created_at": "2026-10-25T09:00:00.000000Z",
      "updated_at": "2026-10-26T09:00:00.000000Z"
    }
  ],
  "message": "Shared timetables retrieved.",
  "meta": {
    "current_page": 1,
    "per_page": 20,
    "total": 1,
    "last_page": 1
  }
}
```

### Get shared timetable

`GET /shared-timetables/{sharedTimetable}` — Sanctum. Includes activities (with the current user's
completion) and assignments.

```bash
curl -i "$BASE/shared-timetables/1" \
  -H "Accept: application/json" \
  -H "Authorization: Bearer $TOKEN"
```

**Response `200`:**

```json
{
  "success": true,
  "data": {
    "id": 1,
    "uuid": "3b7d9e1f-2a4c-4d6e-8f01-23456789abcd",
    "title": "Team schedule",
    "description": "November rotation",
    "created_by": 1,
    "start_date": "2026-11-01",
    "end_date": "2026-11-30",
    "status": "published",
    "activities": [
      {
        "id": 1,
        "uuid": "4c8e0f2a-3b5d-4e6f-9a01-3456789abcde",
        "shared_timetable_id": 1,
        "title": "Group reading",
        "description": "Surah Al-Kahf",
        "activity_type": "quran",
        "activity_date": "2026-11-10",
        "start_time": "18:00",
        "end_time": "19:00",
        "sort_order": 1,
        "completion": null,
        "created_at": "2026-10-25T09:05:00.000000Z",
        "updated_at": "2026-10-25T09:05:00.000000Z"
      }
    ],
    "assignments": [],
    "created_at": "2026-10-25T09:00:00.000000Z",
    "updated_at": "2026-10-26T09:00:00.000000Z"
  },
  "message": "OK"
}
```

### Create shared timetable (admin)

`POST /shared-timetables` — Admin.

| Field | Type | Required | Notes |
|---|---|---|---|
| `uuid` | uuid | no | |
| `title` | string | yes | Max 255. |
| `description` | string\|null | no | Max 5000. |
| `start_date` | date | yes | |
| `end_date` | date | yes | Must be after or equal to `start_date`. |
| `status` | enum | no | Defaults to `draft`. |
| `client_created_at` | timestamp | no | |
| `client_updated_at` | timestamp | no | |

```bash
curl -i -X POST "$BASE/shared-timetables" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d '{
    "title": "Team schedule",
    "description": "November rotation",
    "start_date": "2026-11-01",
    "end_date": "2026-11-30",
    "status": "draft"
  }'
```

**Response `201`:**

```json
{
  "success": true,
  "data": {
    "id": 1,
    "uuid": "3b7d9e1f-2a4c-4d6e-8f01-23456789abcd",
    "title": "Team schedule",
    "description": "November rotation",
    "created_by": 1,
    "start_date": "2026-11-01",
    "end_date": "2026-11-30",
    "status": "draft",
    "activities_count": 0,
    "assignments_count": 0,
    "created_at": "2026-10-25T09:00:00.000000Z",
    "updated_at": "2026-10-25T09:00:00.000000Z"
  },
  "message": "Shared timetable created."
}
```

### Update shared timetable (admin)

`PUT|PATCH /shared-timetables/{sharedTimetable}` — Admin.

| Field | Type | Notes |
|---|---|---|
| `title` | string | Max 255. |
| `description` | string\|null | Max 5000. |
| `start_date` | date | |
| `end_date` | date | Must be after or equal to `start_date`. |
| `status` | enum | `draft`, `published`, `archived`. |
| `client_updated_at` | timestamp | |

```bash
curl -i -X PATCH "$BASE/shared-timetables/1" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d '{
    "title": "Team schedule (updated)",
    "end_date": "2026-12-31"
  }'
```

**Response `200`:**

```json
{
  "success": true,
  "data": {
    "id": 1,
    "uuid": "3b7d9e1f-2a4c-4d6e-8f01-23456789abcd",
    "title": "Team schedule (updated)",
    "description": "November rotation",
    "created_by": 1,
    "start_date": "2026-11-01",
    "end_date": "2026-12-31",
    "status": "draft",
    "activities_count": 1,
    "assignments_count": 1,
    "created_at": "2026-10-25T09:00:00.000000Z",
    "updated_at": "2026-10-26T09:00:00.000000Z"
  },
  "message": "Shared timetable updated."
}
```

### Delete shared timetable (admin)

`DELETE /shared-timetables/{sharedTimetable}` — Admin. Soft-deletes the timetable.

```bash
curl -i -X DELETE "$BASE/shared-timetables/1" \
  -H "Accept: application/json" \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

**Response `200`:**

```json
{
  "success": true,
  "data": null,
  "message": "Shared timetable deleted."
}
```

### Publish shared timetable (admin)

`POST /shared-timetables/{sharedTimetable}/publish` — Admin. Sets `status` to `published`.

```bash
curl -i -X POST "$BASE/shared-timetables/1/publish" \
  -H "Accept: application/json" \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

**Response `200`:**

```json
{
  "success": true,
  "data": {
    "id": 1,
    "uuid": "3b7d9e1f-2a4c-4d6e-8f01-23456789abcd",
    "title": "Team schedule",
    "description": "November rotation",
    "created_by": 1,
    "start_date": "2026-11-01",
    "end_date": "2026-11-30",
    "status": "published",
    "activities_count": 4,
    "assignments_count": 2,
    "created_at": "2026-10-25T09:00:00.000000Z",
    "updated_at": "2026-10-26T09:00:00.000000Z"
  },
  "message": "Shared timetable published."
}
```

### List shared timetable activities

`GET /shared-timetables/{sharedTimetable}/activities` — Sanctum. Returns a non-paginated array,
ordered by `activity_date` and `sort_order`.

```bash
curl -i "$BASE/shared-timetables/1/activities" \
  -H "Accept: application/json" \
  -H "Authorization: Bearer $TOKEN"
```

**Response `200`:**

```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "uuid": "4c8e0f2a-3b5d-4e6f-9a01-3456789abcde",
      "shared_timetable_id": 1,
      "title": "Group reading",
      "description": "Surah Al-Kahf",
      "activity_type": "quran",
      "activity_date": "2026-11-10",
      "start_time": "18:00",
      "end_time": "19:00",
      "sort_order": 1,
      "completion": null,
      "created_at": "2026-10-25T09:05:00.000000Z",
      "updated_at": "2026-10-25T09:05:00.000000Z"
    }
  ],
  "message": "Shared timetable activities retrieved."
}
```

### Create shared timetable activity (admin)

`POST /shared-timetables/{sharedTimetable}/activities` — Admin.

| Field | Type | Required | Notes |
|---|---|---|---|
| `uuid` | uuid | no | |
| `title` | string | yes | Max 255. |
| `description` | string\|null | no | Max 5000. |
| `activity_type` | enum | no | See [Activity types](#activity-types). |
| `activity_date` | date | yes | Must fall within the timetable start/end dates. |
| `start_time` | `HH:MM` | no | |
| `end_time` | `HH:MM` | no | Must be after `start_time`. |
| `sort_order` | integer | no | Minimum 0. |
| `client_created_at` | timestamp | no | |
| `client_updated_at` | timestamp | no | |

```bash
curl -i -X POST "$BASE/shared-timetables/1/activities" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d '{
    "title": "Group reading",
    "description": "Surah Al-Kahf",
    "activity_type": "quran",
    "activity_date": "2026-11-10",
    "start_time": "18:00",
    "end_time": "19:00",
    "sort_order": 1
  }'
```

**Response `201`:**

```json
{
  "success": true,
  "data": {
    "id": 1,
    "uuid": "4c8e0f2a-3b5d-4e6f-9a01-3456789abcde",
    "shared_timetable_id": 1,
    "title": "Group reading",
    "description": "Surah Al-Kahf",
    "activity_type": "quran",
    "activity_date": "2026-11-10",
    "start_time": "18:00",
    "end_time": "19:00",
    "sort_order": 1,
    "created_at": "2026-10-25T09:05:00.000000Z",
    "updated_at": "2026-10-25T09:05:00.000000Z"
  },
  "message": "Shared timetable activity created."
}
```

Out-of-range dates return `422`:

```json
{
  "success": false,
  "data": null,
  "message": "The activity date must fall within the timetable date range.",
  "errors": {
    "activity_date": ["The activity date must fall within the timetable date range."]
  }
}
```

### Update shared timetable activity (admin)

`PUT|PATCH /shared-timetables/{sharedTimetable}/activities/{activity}` — Admin.

Fields are the same as create, except `uuid` and `client_created_at` are not accepted.

```bash
curl -i -X PUT "$BASE/shared-timetables/1/activities/1" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d '{
    "description": "Extra context",
    "sort_order": 2
  }'
```

**Response `200`:**

```json
{
  "success": true,
  "data": {
    "id": 1,
    "uuid": "4c8e0f2a-3b5d-4e6f-9a01-3456789abcde",
    "shared_timetable_id": 1,
    "title": "Group reading",
    "description": "Extra context",
    "activity_type": "quran",
    "activity_date": "2026-11-10",
    "start_time": "18:00",
    "end_time": "19:00",
    "sort_order": 2,
    "created_at": "2026-10-25T09:05:00.000000Z",
    "updated_at": "2026-10-26T09:05:00.000000Z"
  },
  "message": "Shared timetable activity updated."
}
```

### Delete shared timetable activity (admin)

`DELETE /shared-timetables/{sharedTimetable}/activities/{activity}` — Admin.

```bash
curl -i -X DELETE "$BASE/shared-timetables/1/activities/1" \
  -H "Accept: application/json" \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

**Response `200`:**

```json
{
  "success": true,
  "data": null,
  "message": "Shared timetable activity deleted."
}
```

### List shared timetable assignments

`GET /shared-timetables/{sharedTimetable}/assignments` — Sanctum. Returns a non-paginated array.

```bash
curl -i "$BASE/shared-timetables/1/assignments" \
  -H "Accept: application/json" \
  -H "Authorization: Bearer $TOKEN"
```

**Response `200`:**

```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "uuid": "5d9f1a2b-3c4d-4e5f-8a90-4567890abcde",
      "shared_timetable_id": 1,
      "user_id": 2,
      "group_id": null,
      "assigned_by": 1,
      "assigned_at": "2026-10-25T09:10:00+00:00",
      "created_at": "2026-10-25T09:10:00+00:00",
      "updated_at": "2026-10-25T09:10:00+00:00"
    }
  ],
  "message": "Assignments retrieved."
}
```

### Add assignment (admin)

`POST /shared-timetables/{sharedTimetable}/assignments` — Admin. Assign either a user **or** a
group. `user_id` and `group_id` are mutually exclusive and one is required.

| Field | Type | Required | Notes |
|---|---|---|---|
| `uuid` | uuid | no | |
| `user_id` | integer | one of | Must exist. Prohibits `group_id`. |
| `group_id` | integer | one of | Must exist. Prohibits `user_id`. |

Assign a user:

```bash
curl -i -X POST "$BASE/shared-timetables/1/assignments" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d '{ "user_id": 1 }'
```

Assign a group:

```bash
curl -i -X POST "$BASE/shared-timetables/1/assignments" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d '{ "group_id": 1 }'
```

**Response `201`:**

```json
{
  "success": true,
  "data": {
    "id": 1,
    "uuid": "5d9f1a2b-3c4d-4e5f-8a90-4567890abcde",
    "shared_timetable_id": 1,
    "user_id": 1,
    "group_id": null,
    "assigned_by": 1,
    "assigned_at": "2026-10-25T09:10:00+00:00",
    "user": {
      "id": 1,
      "uuid": "0f5d7b1e-8a5c-4b7a-9d2f-2f7a3c4b5d6e",
      "name": "Ada Lovelace",
      "email": "ada@example.com",
      "bio": null,
      "role": "admin",
      "roles": ["admin"],
      "is_active": true,
      "email_verified": true,
      "created_at": "2026-11-01T09:00:00.000000Z",
      "updated_at": "2026-11-09T10:00:00.000000Z"
    },
    "created_at": "2026-10-25T09:10:00+00:00",
    "updated_at": "2026-10-25T09:10:00+00:00"
  },
  "message": "Assignment created."
}
```

Repeating the same user/group assignment updates it instead of creating a duplicate. Assigned
users and group members receive a `shared_activity_assigned` notification.

### Delete assignment (admin)

`DELETE /shared-timetables/{sharedTimetable}/assignments/{assignment}` — Admin.

```bash
curl -i -X DELETE "$BASE/shared-timetables/1/assignments/1" \
  -H "Accept: application/json" \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

**Response `200`:**

```json
{
  "success": true,
  "data": null,
  "message": "Assignment removed."
}
```

### Record a shared activity completion

`POST /shared-timetables/{sharedTimetable}/activities/{activity}/completions` — Sanctum. The user
must have access to the timetable. Repeating the call for the same activity updates the existing
completion.

| Field | Type | Required | Notes |
|---|---|---|---|
| `uuid` | uuid | no | |
| `status` | enum | no | `pending`, `completed`, or `missed`. Defaults to `completed`. |
| `completed_at` | timestamp\|null | no | Defaults to now when status is `completed`. |
| `notes` | string\|null | no | Max 5000. |
| `client_created_at` | timestamp | no | |
| `client_updated_at` | timestamp | no | |

```bash
curl -i -X POST "$BASE/shared-timetables/1/activities/1/completions" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "status": "completed",
    "completed_at": "2026-11-10T18:30:00Z",
    "notes": "Finished early"
  }'
```

**Response `201` (or `200` when updating an existing completion):**

```json
{
  "success": true,
  "data": {
    "id": 1,
    "uuid": "6e0a2b3c-4d5e-4f6a-9b01-567890abcdef",
    "shared_timetable_activity_id": 1,
    "user_id": 2,
    "status": "completed",
    "completed_at": "2026-11-10T18:30:00+00:00",
    "notes": "Finished early",
    "created_at": "2026-11-10T18:30:00+00:00",
    "updated_at": "2026-11-10T18:30:00+00:00"
  },
  "message": "Completion recorded."
}
```

---

## Shared activity completions

Manage the authenticated user's shared activity completions across timetables. All endpoints
require Sanctum and enforce ownership.

### List shared activity completions

`GET /shared-activity-completions` — Sanctum, paginated.

| Query | Type | Notes |
|---|---|---|
| `from` | date | `created_at` date >= `from`. |
| `to` | date | `created_at` date <= `to`; must be after or equal to `from`. |
| `status` | enum | `pending`, `completed`, `missed`. |
| `per_page` | integer | 1–100, default 20. |

```bash
curl -i "$BASE/shared-activity-completions?from=2026-11-01&to=2026-11-30&status=completed&per_page=20" \
  -H "Accept: application/json" \
  -H "Authorization: Bearer $TOKEN"
```

**Response `200`:**

```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "uuid": "6e0a2b3c-4d5e-4f6a-9b01-567890abcdef",
      "shared_timetable_activity_id": 1,
      "user_id": 2,
      "status": "completed",
      "completed_at": "2026-11-10T18:30:00+00:00",
      "notes": "Finished early",
      "activity": {
        "id": 1,
        "uuid": "4c8e0f2a-3b5d-4e6f-9a01-3456789abcde",
        "shared_timetable_id": 1,
        "title": "Group reading",
        "description": "Surah Al-Kahf",
        "activity_type": "quran",
        "activity_date": "2026-11-10",
        "start_time": "18:00",
        "end_time": "19:00",
        "sort_order": 1,
        "created_at": "2026-10-25T09:05:00.000000Z",
        "updated_at": "2026-10-25T09:05:00.000000Z"
      },
      "created_at": "2026-11-10T18:30:00+00:00",
      "updated_at": "2026-11-10T18:30:00+00:00"
    }
  ],
  "message": "Shared activity completions retrieved.",
  "meta": {
    "current_page": 1,
    "per_page": 20,
    "total": 1,
    "last_page": 1
  }
}
```

### Update completion

`PUT|PATCH /shared-activity-completions/{sharedActivityCompletion}` — Sanctum.

| Field | Type | Notes |
|---|---|---|
| `status` | enum | `pending`, `completed`, `missed`. |
| `completed_at` | timestamp\|null | Ignored/cleared when status is not `completed`. |
| `notes` | string\|null | Max 5000. |
| `client_updated_at` | timestamp | |

```bash
curl -i -X PUT "$BASE/shared-activity-completions/1" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "status": "completed",
    "completed_at": "2026-11-10T19:00:00Z",
    "notes": "Completed with the group"
  }'
```

**Response `200`:**

```json
{
  "success": true,
  "data": {
    "id": 1,
    "uuid": "6e0a2b3c-4d5e-4f6a-9b01-567890abcdef",
    "shared_timetable_activity_id": 1,
    "user_id": 2,
    "status": "completed",
    "completed_at": "2026-11-10T19:00:00+00:00",
    "notes": "Completed with the group",
    "created_at": "2026-11-10T18:30:00+00:00",
    "updated_at": "2026-11-10T19:00:00+00:00"
  },
  "message": "Completion updated."
}
```

### Delete completion

`DELETE /shared-activity-completions/{sharedActivityCompletion}` — Sanctum. Soft-deletes the
completion.

```bash
curl -i -X DELETE "$BASE/shared-activity-completions/1" \
  -H "Accept: application/json" \
  -H "Authorization: Bearer $TOKEN"
```

**Response `200`:**

```json
{
  "success": true,
  "data": null,
  "message": "Completion deleted."
}
```

---

## Habits

Habits are owned by the authenticated user. All endpoints require Sanctum.

Habit object shape:

```json
{
  "id": 1,
  "uuid": "7f1b3c4d-5e6f-4a70-9c12-67890abcdef1",
  "name": "Morning meditation",
  "description": "10 minutes after Fajr",
  "is_active": true,
  "records_count": 12,
  "created_at": "2026-11-01T05:00:00.000000Z",
  "updated_at": "2026-11-09T05:00:00.000000Z"
}
```

### List habits

`GET /habits` — Sanctum, paginated.

| Query | Type | Notes |
|---|---|---|
| `is_active` | boolean | `true` or `false`. |
| `search` | string | Matches the habit name. |
| `per_page` | integer | 1–100, default 20. |

```bash
curl -i "$BASE/habits?is_active=true&search=meditation&per_page=20" \
  -H "Accept: application/json" \
  -H "Authorization: Bearer $TOKEN"
```

**Response `200`:**

```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "uuid": "7f1b3c4d-5e6f-4a70-9c12-67890abcdef1",
      "name": "Morning meditation",
      "description": "10 minutes after Fajr",
      "is_active": true,
      "records_count": 12,
      "created_at": "2026-11-01T05:00:00.000000Z",
      "updated_at": "2026-11-09T05:00:00.000000Z"
    }
  ],
  "message": "Habits retrieved.",
  "meta": {
    "current_page": 1,
    "per_page": 20,
    "total": 1,
    "last_page": 1
  }
}
```

### Create habit

`POST /habits` — Sanctum.

| Field | Type | Required | Notes |
|---|---|---|---|
| `uuid` | uuid | no | |
| `name` | string | yes | Max 255. |
| `description` | string\|null | no | Max 5000. |
| `is_active` | boolean | no | Defaults to `true`. |
| `client_created_at` | timestamp | no | |
| `client_updated_at` | timestamp | no | |

```bash
curl -i -X POST "$BASE/habits" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "name": "Morning meditation",
    "description": "10 minutes after Fajr",
    "is_active": true
  }'
```

**Response `201`:**

```json
{
  "success": true,
  "data": {
    "id": 1,
    "uuid": "7f1b3c4d-5e6f-4a70-9c12-67890abcdef1",
    "name": "Morning meditation",
    "description": "10 minutes after Fajr",
    "is_active": true,
    "created_at": "2026-11-01T05:00:00.000000Z",
    "updated_at": "2026-11-01T05:00:00.000000Z"
  },
  "message": "Habit created."
}
```

### Get habit

`GET /habits/{habit}` — Sanctum. Includes the latest 30 records and the current streak.

```bash
curl -i "$BASE/habits/1" \
  -H "Accept: application/json" \
  -H "Authorization: Bearer $TOKEN"
```

**Response `200`:**

```json
{
  "success": true,
  "data": {
    "habit": {
      "id": 1,
      "uuid": "7f1b3c4d-5e6f-4a70-9c12-67890abcdef1",
      "name": "Morning meditation",
      "description": "10 minutes after Fajr",
      "is_active": true,
      "records": [
        {
          "id": 1,
          "uuid": "8a2c4d5e-6f70-4a81-9b23-7890abcdef12",
          "habit_id": 1,
          "record_date": "2026-11-09",
          "status": "completed",
          "notes": "Felt good",
          "created_at": "2026-11-09T05:30:00.000000Z",
          "updated_at": "2026-11-09T05:30:00.000000Z"
        }
      ],
      "created_at": "2026-11-01T05:00:00.000000Z",
      "updated_at": "2026-11-09T05:00:00.000000Z"
    },
    "streak": 4
  },
  "message": "OK"
}
```

### Update habit

`PUT|PATCH /habits/{habit}` — Sanctum.

| Field | Type | Notes |
|---|---|---|
| `name` | string | Max 255. |
| `description` | string\|null | Max 5000. |
| `is_active` | boolean | |
| `client_updated_at` | timestamp | |

```bash
curl -i -X PATCH "$BASE/habits/1" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "name": "Morning meditation (updated)",
    "is_active": false
  }'
```

**Response `200`:**

```json
{
  "success": true,
  "data": {
    "id": 1,
    "uuid": "7f1b3c4d-5e6f-4a70-9c12-67890abcdef1",
    "name": "Morning meditation (updated)",
    "description": "10 minutes after Fajr",
    "is_active": false,
    "created_at": "2026-11-01T05:00:00.000000Z",
    "updated_at": "2026-11-09T05:00:00.000000Z"
  },
  "message": "Habit updated."
}
```

### Delete habit

`DELETE /habits/{habit}` — Sanctum. Soft-deletes the habit.

```bash
curl -i -X DELETE "$BASE/habits/1" \
  -H "Accept: application/json" \
  -H "Authorization: Bearer $TOKEN"
```

**Response `200`:**

```json
{
  "success": true,
  "data": null,
  "message": "Habit deleted."
}
```

### Toggle habit

`POST /habits/{habit}/toggle` — Sanctum. Toggles today's status, or explicitly sets a status/date
when supplied.

| Field | Type | Required | Notes |
|---|---|---|---|
| `record_date` | date | no | Defaults to today. |
| `status` | enum | no | `pending`, `completed`, `missed`. Omit to toggle. |
| `notes` | string\|null | no | Max 5000. |

```bash
curl -i -X POST "$BASE/habits/1/toggle" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "record_date": "2026-11-09",
    "status": "completed",
    "notes": "Felt good"
  }'
```

**Response `200`:**

```json
{
  "success": true,
  "data": {
    "record": {
      "id": 1,
      "uuid": "8a2c4d5e-6f70-4a81-9b23-7890abcdef12",
      "habit_id": 1,
      "record_date": "2026-11-09",
      "status": "completed",
      "notes": "Felt good",
      "created_at": "2026-11-09T05:30:00.000000Z",
      "updated_at": "2026-11-09T05:30:00.000000Z"
    },
    "completed_today": true,
    "streak": 4
  },
  "message": "Habit toggled."
}
```

### List habit records (`/habits/{id}/records`)

`GET /habits/{habit}/records` — Sanctum, paginated (30 per page).

```bash
curl -i "$BASE/habits/1/records" \
  -H "Accept: application/json" \
  -H "Authorization: Bearer $TOKEN"
```

**Response `200`:**

```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "uuid": "8a2c4d5e-6f70-4a81-9b23-7890abcdef12",
      "habit_id": 1,
      "record_date": "2026-11-09",
      "status": "completed",
      "notes": "Felt good",
      "created_at": "2026-11-09T05:30:00.000000Z",
      "updated_at": "2026-11-09T05:30:00.000000Z"
    }
  ],
  "message": "Habit records retrieved.",
  "meta": {
    "current_page": 1,
    "per_page": 30,
    "total": 1,
    "last_page": 1
  }
}
```

### Create habit record (`/habits/{id}/records`)

`POST /habits/{habit}/records` — Sanctum. Creates or updates the record for the given date
(unique per habit + date).

| Field | Type | Required | Notes |
|---|---|---|---|
| `uuid` | uuid | no | |
| `record_date` | date | yes | |
| `status` | enum | no | `pending`, `completed`, `missed`. Defaults to `pending`. |
| `notes` | string\|null | no | Max 5000. |
| `client_created_at` | timestamp | no | |
| `client_updated_at` | timestamp | no | |

```bash
curl -i -X POST "$BASE/habits/1/records" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "record_date": "2026-11-09",
    "status": "completed",
    "notes": "Felt good"
  }'
```

**Response `201` (or `200` when updating):**

```json
{
  "success": true,
  "data": {
    "id": 1,
    "uuid": "8a2c4d5e-6f70-4a81-9b23-7890abcdef12",
    "habit_id": 1,
    "record_date": "2026-11-09",
    "status": "completed",
    "notes": "Felt good",
    "created_at": "2026-11-09T05:30:00.000000Z",
    "updated_at": "2026-11-09T05:30:00.000000Z"
  },
  "message": "Habit record saved."
}
```

### Get habit streak

`GET /habits/{habit}/streak` — Sanctum. Counts consecutive completed days ending today or
yesterday.

```bash
curl -i "$BASE/habits/1/streak" \
  -H "Accept: application/json" \
  -H "Authorization: Bearer $TOKEN"
```

**Response `200`:**

```json
{
  "success": true,
  "data": {
    "habit_id": 1,
    "streak": 4
  },
  "message": "OK"
}
```

---

## Habit records

Manage individual habit records across all habits. All endpoints require Sanctum and enforce
ownership.

### List habit records

`GET /habit-records` — Sanctum, paginated (30 per page).

| Query | Type | Notes |
|---|---|---|
| `habit_id` | integer | Filter by habit. |
| `from` | date | `record_date` >= `from`. |
| `to` | date | `record_date` <= `to`; must be after or equal to `from`. |
| `per_page` | integer | 1–100, default 30. |

```bash
curl -i "$BASE/habit-records?habit_id=1&from=2026-11-01&to=2026-11-30&per_page=50" \
  -H "Accept: application/json" \
  -H "Authorization: Bearer $TOKEN"
```

**Response `200`:**

```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "uuid": "8a2c4d5e-6f70-4a81-9b23-7890abcdef12",
      "habit_id": 1,
      "record_date": "2026-11-09",
      "status": "completed",
      "notes": "Felt good",
      "created_at": "2026-11-09T05:30:00.000000Z",
      "updated_at": "2026-11-09T05:30:00.000000Z"
    }
  ],
  "message": "Habit records retrieved.",
  "meta": {
    "current_page": 1,
    "per_page": 50,
    "total": 1,
    "last_page": 1
  }
}
```

### Get habit record

`GET /habit-records/{habitRecord}` — Sanctum.

```bash
curl -i "$BASE/habit-records/1" \
  -H "Accept: application/json" \
  -H "Authorization: Bearer $TOKEN"
```

**Response `200`:**

```json
{
  "success": true,
  "data": {
    "id": 1,
    "uuid": "8a2c4d5e-6f70-4a81-9b23-7890abcdef12",
    "habit_id": 1,
    "record_date": "2026-11-09",
    "status": "completed",
    "notes": "Felt good",
    "created_at": "2026-11-09T05:30:00.000000Z",
    "updated_at": "2026-11-09T05:30:00.000000Z"
  },
  "message": "OK"
}
```

### Update habit record

`PUT|PATCH /habit-records/{habitRecord}` — Sanctum.

| Field | Type | Notes |
|---|---|---|
| `record_date` | date | |
| `status` | enum | `pending`, `completed`, `missed`. |
| `notes` | string\|null | Max 5000. |
| `client_updated_at` | timestamp | |

```bash
curl -i -X PATCH "$BASE/habit-records/1" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "status": "pending",
    "notes": "Updated"
  }'
```

**Response `200`:**

```json
{
  "success": true,
  "data": {
    "id": 1,
    "uuid": "8a2c4d5e-6f70-4a81-9b23-7890abcdef12",
    "habit_id": 1,
    "record_date": "2026-11-09",
    "status": "pending",
    "notes": "Updated",
    "created_at": "2026-11-09T05:30:00.000000Z",
    "updated_at": "2026-11-09T06:00:00.000000Z"
  },
  "message": "Habit record updated."
}
```

### Delete habit record

`DELETE /habit-records/{habitRecord}` — Sanctum. Soft-deletes the record.

```bash
curl -i -X DELETE "$BASE/habit-records/1" \
  -H "Accept: application/json" \
  -H "Authorization: Bearer $TOKEN"
```

**Response `200`:**

```json
{
  "success": true,
  "data": null,
  "message": "Habit record deleted."
}
```

---

## Goals

Goals are owned by the authenticated user. All endpoints require Sanctum.

Goal object shape:

```json
{
  "id": 1,
  "uuid": "9b3d5e6f-7a80-4b91-8c23-890abcdef123",
  "title": "Run a marathon",
  "description": "Train consistently for 16 weeks",
  "target_date": "2027-03-01",
  "progress": 10,
  "status": "in_progress",
  "achieved_at": null,
  "created_at": "2026-11-09T10:00:00.000000Z",
  "updated_at": "2026-11-09T10:00:00.000000Z"
}
```

### List goals

`GET /goals` — Sanctum, paginated.

| Query | Type | Notes |
|---|---|---|
| `status` | enum | See [Goal statuses](#goal-statuses). |
| `search` | string | Matches the title. |
| `from` | date | `target_date` >= `from`. |
| `to` | date | `target_date` <= `to`; must be after or equal to `from`. |
| `per_page` | integer | 1–100, default 20. |

```bash
curl -i "$BASE/goals?status=in_progress&search=marathon&from=2026-01-01&to=2027-12-31&per_page=20" \
  -H "Accept: application/json" \
  -H "Authorization: Bearer $TOKEN"
```

**Response `200`:**

```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "uuid": "9b3d5e6f-7a80-4b91-8c23-890abcdef123",
      "title": "Run a marathon",
      "description": "Train consistently for 16 weeks",
      "target_date": "2027-03-01",
      "progress": 10,
      "status": "in_progress",
      "achieved_at": null,
      "created_at": "2026-11-09T10:00:00.000000Z",
      "updated_at": "2026-11-09T10:00:00.000000Z"
    }
  ],
  "message": "Goals retrieved.",
  "meta": {
    "current_page": 1,
    "per_page": 20,
    "total": 1,
    "last_page": 1
  }
}
```

### Create goal

`POST /goals` — Sanctum.

| Field | Type | Required | Notes |
|---|---|---|---|
| `uuid` | uuid | no | |
| `title` | string | yes | Max 255. |
| `description` | string\|null | no | Max 5000. |
| `target_date` | date\|null | no | |
| `progress` | number | no | 0–100. Defaults to 0. |
| `status` | enum | no | Defaults to `not_started`. |
| `client_created_at` | timestamp | no | |
| `client_updated_at` | timestamp | no | |

```bash
curl -i -X POST "$BASE/goals" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "title": "Run a marathon",
    "description": "Train consistently for 16 weeks",
    "target_date": "2027-03-01",
    "progress": 10,
    "status": "in_progress"
  }'
```

**Response `201`:**

```json
{
  "success": true,
  "data": {
    "id": 1,
    "uuid": "9b3d5e6f-7a80-4b91-8c23-890abcdef123",
    "title": "Run a marathon",
    "description": "Train consistently for 16 weeks",
    "target_date": "2027-03-01",
    "progress": 10,
    "status": "in_progress",
    "achieved_at": null,
    "created_at": "2026-11-09T10:00:00.000000Z",
    "updated_at": "2026-11-09T10:00:00.000000Z"
  },
  "message": "Goal created."
}
```

If `progress` is `100` or more, the goal is automatically marked `completed` and `achieved_at` is set.

### Get goal

`GET /goals/{goal}` — Sanctum.

```bash
curl -i "$BASE/goals/1" \
  -H "Accept: application/json" \
  -H "Authorization: Bearer $TOKEN"
```

**Response `200`:**

```json
{
  "success": true,
  "data": {
    "id": 1,
    "uuid": "9b3d5e6f-7a80-4b91-8c23-890abcdef123",
    "title": "Run a marathon",
    "description": "Train consistently for 16 weeks",
    "target_date": "2027-03-01",
    "progress": 42,
    "status": "in_progress",
    "achieved_at": null,
    "created_at": "2026-11-09T10:00:00.000000Z",
    "updated_at": "2026-11-09T10:00:00.000000Z"
  },
  "message": "OK"
}
```

### Update goal

`PUT|PATCH /goals/{goal}` — Sanctum.

| Field | Type | Notes |
|---|---|---|
| `title` | string | Max 255. |
| `description` | string\|null | Max 5000. |
| `target_date` | date\|null | |
| `progress` | number | 0–100. |
| `status` | enum | See [Goal statuses](#goal-statuses). |
| `client_updated_at` | timestamp | |

```bash
curl -i -X PATCH "$BASE/goals/1" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "title": "Run a marathon (updated)",
    "target_date": "2027-04-01"
  }'
```

**Response `200`:**

```json
{
  "success": true,
  "data": {
    "id": 1,
    "uuid": "9b3d5e6f-7a80-4b91-8c23-890abcdef123",
    "title": "Run a marathon (updated)",
    "description": "Train consistently for 16 weeks",
    "target_date": "2027-04-01",
    "progress": 42,
    "status": "in_progress",
    "achieved_at": null,
    "created_at": "2026-11-09T10:00:00.000000Z",
    "updated_at": "2026-11-09T10:05:00.000000Z"
  },
  "message": "Goal updated."
}
```

When a goal transitions to `completed`, a `goal_achieved` notification is created.

### Update goal progress

`PUT|PATCH /goals/{goal}/progress` — Sanctum.

| Field | Type | Required | Notes |
|---|---|---|---|
| `progress` | number | yes | 0–100. |
| `status` | enum | no | See [Goal statuses](#goal-statuses). |

```bash
curl -i -X PATCH "$BASE/goals/1/progress" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "progress": 42,
    "status": "in_progress"
  }'
```

**Response `200`:**

```json
{
  "success": true,
  "data": {
    "id": 1,
    "uuid": "9b3d5e6f-7a80-4b91-8c23-890abcdef123",
    "title": "Run a marathon",
    "description": "Train consistently for 16 weeks",
    "target_date": "2027-03-01",
    "progress": 42,
    "status": "in_progress",
    "achieved_at": null,
    "created_at": "2026-11-09T10:00:00.000000Z",
    "updated_at": "2026-11-09T10:05:00.000000Z"
  },
  "message": "Goal progress updated."
}
```

Progress `100` automatically sets status to `completed`.

### Delete goal

`DELETE /goals/{goal}` — Sanctum. Soft-deletes the goal.

```bash
curl -i -X DELETE "$BASE/goals/1" \
  -H "Accept: application/json" \
  -H "Authorization: Bearer $TOKEN"
```

**Response `200`:**

```json
{
  "success": true,
  "data": null,
  "message": "Goal deleted."
}
```

---

## Daily reports

Daily reports snapshot the user's personal and shared timetable activities for a date and compute a
score. All endpoints require Sanctum.

Report object shape:

```json
{
  "id": 1,
  "uuid": "a1c3e5f7-8b90-4c12-9d34-90abcdef1234",
  "user_id": 2,
  "report_date": "2026-11-09",
  "summary": "Felt great",
  "self_assessment": "Good focus and energy",
  "calculated_score": 80,
  "scheduled_count": 5,
  "completed_count": 4,
  "score": 80,
  "completed_activities_count": 4,
  "total_activities_count": 5,
  "submitted_at": "2026-11-09T20:00:00.000000Z",
  "status": "submitted",
  "reviewed_at": null,
  "activities": [],
  "comments": [],
  "created_at": "2026-11-09T20:00:00.000000Z",
  "updated_at": "2026-11-09T20:00:00.000000Z"
}
```

Scores are calculated as `completed / scheduled * 100`, capped at 100. A day with no scheduled
activities scores `0`.

### List daily reports

`GET /daily-reports` — Sanctum, paginated.

| Query | Type | Notes |
|---|---|---|
| `user_id` | integer | Admin only, and only when `all=1`. |
| `all` | boolean | Admin only. `1` lists every user's reports. |
| `from` | date | `report_date` >= `from`. |
| `to` | date | `report_date` <= `to`; must be after or equal to `from`. |
| `per_page` | integer | 1–100, default 20. |

Regular users always see only their own reports:

```bash
curl -i "$BASE/daily-reports?from=2026-11-01&to=2026-11-30&per_page=20" \
  -H "Accept: application/json" \
  -H "Authorization: Bearer $TOKEN"
```

Admins can list every user's reports:

```bash
curl -i "$BASE/daily-reports?all=1&user_id=2&from=2026-11-01&to=2026-11-30" \
  -H "Accept: application/json" \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

**Response `200`:**

```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "uuid": "a1c3e5f7-8b90-4c12-9d34-90abcdef1234",
      "user_id": 2,
      "report_date": "2026-11-09",
      "summary": "Felt great",
      "self_assessment": "Good focus and energy",
      "calculated_score": 80,
      "scheduled_count": 5,
      "completed_count": 4,
      "score": 80,
      "completed_activities_count": 4,
      "total_activities_count": 5,
      "submitted_at": "2026-11-09T20:00:00.000000Z",
      "status": "submitted",
      "reviewed_at": null,
      "created_at": "2026-11-09T20:00:00.000000Z",
      "updated_at": "2026-11-09T20:00:00.000000Z"
    }
  ],
  "message": "Daily reports retrieved.",
  "meta": {
    "current_page": 1,
    "per_page": 20,
    "total": 1,
    "last_page": 1
  }
}
```

### Create daily report

`POST /daily-reports` — Sanctum. Creates or refreshes the report for the given date.

| Field | Type | Required | Notes |
|---|---|---|---|
| `uuid` | uuid | no | |
| `report_date` | date | yes | Today or earlier. |
| `summary` | string\|null | no | Max 5000. |
| `self_assessment` | string\|null | no | Max 5000. |
| `client_created_at` | timestamp | no | |
| `client_updated_at` | timestamp | no | |

```bash
curl -i -X POST "$BASE/daily-reports" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "report_date": "2026-11-09",
    "summary": "Felt great",
    "self_assessment": "Good focus and energy"
  }'
```

**Response `201`:**

```json
{
  "success": true,
  "data": {
    "id": 1,
    "uuid": "a1c3e5f7-8b90-4c12-9d34-90abcdef1234",
    "user_id": 2,
    "report_date": "2026-11-09",
    "summary": "Felt great",
    "self_assessment": "Good focus and energy",
    "calculated_score": 80,
    "scheduled_count": 5,
    "completed_count": 4,
    "score": 80,
    "completed_activities_count": 4,
    "total_activities_count": 5,
    "submitted_at": "2026-11-09T20:00:00.000000Z",
    "status": "submitted",
    "reviewed_at": null,
    "activities": [],
    "comments": [],
    "created_at": "2026-11-09T20:00:00.000000Z",
    "updated_at": "2026-11-09T20:00:00.000000Z"
  },
  "message": "Daily report submitted."
}
```

The score snapshot is frozen on first submission. Re-submitting the same day updates only the
narrative fields (`summary`, `self_assessment`).

### Get daily report

`GET /daily-reports/{dailyReport}` — Sanctum. The owner or an admin can view it.

```bash
curl -i "$BASE/daily-reports/1" \
  -H "Accept: application/json" \
  -H "Authorization: Bearer $TOKEN"
```

**Response `200`:**

```json
{
  "success": true,
  "data": {
    "id": 1,
    "uuid": "a1c3e5f7-8b90-4c12-9d34-90abcdef1234",
    "user_id": 2,
    "report_date": "2026-11-09",
    "summary": "Felt great",
    "self_assessment": "Good focus and energy",
    "calculated_score": 80,
    "scheduled_count": 5,
    "completed_count": 4,
    "score": 80,
    "completed_activities_count": 4,
    "total_activities_count": 5,
    "submitted_at": "2026-11-09T20:00:00.000000Z",
    "status": "submitted",
    "reviewed_at": null,
    "activities": [
      {
        "id": 1,
        "activity_id": 1,
        "activity_uuid": "6f1c1e3a-2b4d-4c5e-8f90-123456789abc",
        "activity_title": "Morning run",
        "activity_type": "exercise",
        "activity_status": "completed",
        "scheduled_date": "2026-11-09",
        "start_time": "07:00",
        "end_time": "07:45",
        "completed_at": "2026-11-09T07:50:00+00:00",
        "sort_order": 0
      }
    ],
    "comments": [],
    "created_at": "2026-11-09T20:00:00.000000Z",
    "updated_at": "2026-11-09T20:00:00.000000Z"
  },
  "message": "OK"
}
```

### Update daily report

`PUT|PATCH /daily-reports/{dailyReport}` — Sanctum. Only the owner can update.

| Field | Type | Notes |
|---|---|---|
| `summary` | string\|null | Max 5000. |
| `self_assessment` | string\|null | Max 5000. |
| `client_updated_at` | timestamp | |

```bash
curl -i -X PATCH "$BASE/daily-reports/1" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "summary": "Updated summary",
    "self_assessment": "Better than yesterday"
  }'
```

**Response `200`:**

```json
{
  "success": true,
  "data": {
    "id": 1,
    "uuid": "a1c3e5f7-8b90-4c12-9d34-90abcdef1234",
    "user_id": 2,
    "report_date": "2026-11-09",
    "summary": "Updated summary",
    "self_assessment": "Better than yesterday",
    "calculated_score": 80,
    "scheduled_count": 5,
    "completed_count": 4,
    "score": 80,
    "completed_activities_count": 4,
    "total_activities_count": 5,
    "submitted_at": "2026-11-09T20:00:00.000000Z",
    "status": "submitted",
    "reviewed_at": null,
    "activities": [],
    "comments": [],
    "created_at": "2026-11-09T20:00:00.000000Z",
    "updated_at": "2026-11-09T21:00:00.000000Z"
  },
  "message": "Daily report updated."
}
```

Submitted reports for previous days are locked and return `422`:

```json
{
  "success": false,
  "data": null,
  "message": "Daily reports for previous days are locked.",
  "errors": {
    "report_date": ["Daily reports for previous days are locked."]
  }
}
```

### Delete daily report

`DELETE /daily-reports/{dailyReport}` — Sanctum. Only the owner can delete. Submitted reports for
previous days cannot be deleted.

```bash
curl -i -X DELETE "$BASE/daily-reports/1" \
  -H "Accept: application/json" \
  -H "Authorization: Bearer $TOKEN"
```

**Response `200`:**

```json
{
  "success": true,
  "data": null,
  "message": "Daily report deleted."
}
```

### List daily report comments

`GET /daily-reports/{dailyReport}/comments` — Sanctum. The owner or an admin can view comments.

```bash
curl -i "$BASE/daily-reports/1/comments" \
  -H "Accept: application/json" \
  -H "Authorization: Bearer $TOKEN"
```

**Response `200`:**

```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "uuid": "b2d4f6a8-9c01-4d23-8e45-01abcdef2345",
      "daily_report_id": 1,
      "author_id": 1,
      "author": {
        "id": 1,
        "uuid": "0f5d7b1e-8a5c-4b7a-9d2f-2f7a3c4b5d6e",
        "name": "Admin User",
        "email": "admin@example.com",
        "bio": null,
        "role": "admin",
        "roles": ["admin"],
        "is_active": true,
        "email_verified": true,
        "created_at": "2026-11-01T09:00:00.000000Z",
        "updated_at": "2026-11-09T10:00:00.000000Z"
      },
      "comment": "Nice work",
      "created_at": "2026-11-09T21:00:00.000000Z",
      "updated_at": "2026-11-09T21:00:00.000000Z"
    }
  ],
  "message": "Daily report comments retrieved."
}
```

### Add daily report comment (admin)

`POST /daily-reports/{dailyReport}/comments` — Admin.

| Field | Type | Required | Notes |
|---|---|---|---|
| `comment` | string | yes | Max 5000. |

```bash
curl -i -X POST "$BASE/daily-reports/1/comments" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d '{ "comment": "Nice work" }'
```

**Response `201`:**

```json
{
  "success": true,
  "data": {
    "id": 1,
    "uuid": "b2d4f6a8-9c01-4d23-8e45-01abcdef2345",
    "daily_report_id": 1,
    "author_id": 1,
    "author": {
      "id": 1,
      "uuid": "0f5d7b1e-8a5c-4b7a-9d2f-2f7a3c4b5d6e",
      "name": "Admin User",
      "email": "admin@example.com",
      "bio": null,
      "role": "admin",
      "roles": ["admin"],
      "is_active": true,
      "email_verified": true,
      "created_at": "2026-11-01T09:00:00.000000Z",
      "updated_at": "2026-11-09T10:00:00.000000Z"
    },
    "comment": "Nice work",
    "created_at": "2026-11-09T21:00:00.000000Z",
    "updated_at": "2026-11-09T21:00:00.000000Z"
  },
  "message": "Comment added."
}
```

The report owner receives a `daily_report_comment` notification.

### Delete daily report comment

`DELETE /daily-reports/{dailyReport}/comments/{comment}` — Sanctum. Admins or the comment author
can delete a comment.

```bash
curl -i -X DELETE "$BASE/daily-reports/1/comments/1" \
  -H "Accept: application/json" \
  -H "Authorization: Bearer $TOKEN"
```

**Response `200`:**

```json
{
  "success": true,
  "data": null,
  "message": "Comment deleted."
}
```

---

## User documents

Private files owned by the authenticated user. All endpoints require Sanctum and enforce ownership.

Document object shape:

```json
{
  "id": 1,
  "uuid": "c3e5a7b9-0d12-4e34-9f56-12abcdef3456",
  "title": "Monthly report",
  "description": "November report",
  "category": "reports",
  "file_name": "report.pdf",
  "mime_type": "application/pdf",
  "file_size": 245760,
  "is_private": true,
  "download_url": "http://localhost:8082/api/v1/documents/1/download",
  "created_at": "2026-11-09T10:00:00.000000Z",
  "updated_at": "2026-11-09T10:00:00.000000Z"
}
```

### List documents

`GET /documents` — Sanctum, paginated.

| Query | Type | Notes |
|---|---|---|
| `category` | string | Max 100. Exact match. |
| `search` | string | Matches the title. |
| `per_page` | integer | 1–100, default 20. |

```bash
curl -i "$BASE/documents?category=reports&search=monthly&per_page=20" \
  -H "Accept: application/json" \
  -H "Authorization: Bearer $TOKEN"
```

**Response `200`:**

```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "uuid": "c3e5a7b9-0d12-4e34-9f56-12abcdef3456",
      "title": "Monthly report",
      "description": "November report",
      "category": "reports",
      "file_name": "report.pdf",
      "mime_type": "application/pdf",
      "file_size": 245760,
      "is_private": true,
      "download_url": "http://localhost:8082/api/v1/documents/1/download",
      "created_at": "2026-11-09T10:00:00.000000Z",
      "updated_at": "2026-11-09T10:00:00.000000Z"
    }
  ],
  "message": "Documents retrieved.",
  "meta": {
    "current_page": 1,
    "per_page": 20,
    "total": 1,
    "last_page": 1
  }
}
```

### Upload document

`POST /documents` — Sanctum, `multipart/form-data`.

| Field | Type | Required | Notes |
|---|---|---|---|
| `title` | string | yes | Max 255. |
| `description` | string\|null | no | Max 5000. |
| `category` | string\|null | no | Max 100. |
| `file` | file | yes | Maximum 20 MB (`20480` KB). |
| `is_private` | boolean | no | Defaults to `true`. |

```bash
curl -i -X POST "$BASE/documents" \
  -H "Accept: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -F "title=Monthly report" \
  -F "description=November report" \
  -F "category=reports" \
  -F "is_private=1" \
  -F "file=@./report.pdf"
```

> Do not set `Content-Type` manually; curl sets the multipart boundary automatically.

**Response `201`:**

```json
{
  "success": true,
  "data": {
    "id": 1,
    "uuid": "c3e5a7b9-0d12-4e34-9f56-12abcdef3456",
    "title": "Monthly report",
    "description": "November report",
    "category": "reports",
    "file_name": "report.pdf",
    "mime_type": "application/pdf",
    "file_size": 245760,
    "is_private": true,
    "download_url": "http://localhost:8082/api/v1/documents/1/download",
    "created_at": "2026-11-09T10:00:00.000000Z",
    "updated_at": "2026-11-09T10:00:00.000000Z"
  },
  "message": "Document uploaded."
}
```

### Get document

`GET /documents/{document}` — Sanctum.

```bash
curl -i "$BASE/documents/1" \
  -H "Accept: application/json" \
  -H "Authorization: Bearer $TOKEN"
```

**Response `200`:**

```json
{
  "success": true,
  "data": {
    "id": 1,
    "uuid": "c3e5a7b9-0d12-4e34-9f56-12abcdef3456",
    "title": "Monthly report",
    "description": "November report",
    "category": "reports",
    "file_name": "report.pdf",
    "mime_type": "application/pdf",
    "file_size": 245760,
    "is_private": true,
    "download_url": "http://localhost:8082/api/v1/documents/1/download",
    "created_at": "2026-11-09T10:00:00.000000Z",
    "updated_at": "2026-11-09T10:00:00.000000Z"
  },
  "message": "OK"
}
```

### Download document

`GET /documents/{document}/download` — Sanctum. Returns the binary file with its original filename.

```bash
curl -L "$BASE/documents/1/download" \
  -H "Authorization: Bearer $TOKEN" \
  -o report.pdf
```

No JSON envelope is returned. A missing file on disk returns `404`.

### Update document

`PUT|PATCH /documents/{document}` — Sanctum.

| Field | Type | Notes |
|---|---|---|
| `title` | string | Max 255. |
| `description` | string\|null | Max 5000. |
| `category` | string\|null | Max 100. |
| `is_private` | boolean | |

```bash
curl -i -X PATCH "$BASE/documents/1" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "title": "report-v2.pdf",
    "category": "archive",
    "is_private": true
  }'
```

**Response `200`:**

```json
{
  "success": true,
  "data": {
    "id": 1,
    "uuid": "c3e5a7b9-0d12-4e34-9f56-12abcdef3456",
    "title": "report-v2.pdf",
    "description": "November report",
    "category": "archive",
    "file_name": "report.pdf",
    "mime_type": "application/pdf",
    "file_size": 245760,
    "is_private": true,
    "download_url": "http://localhost:8082/api/v1/documents/1/download",
    "created_at": "2026-11-09T10:00:00.000000Z",
    "updated_at": "2026-11-09T11:00:00.000000Z"
  },
  "message": "Document updated."
}
```

### Delete document

`DELETE /documents/{document}` — Sanctum. Deletes the stored file and soft-deletes the record.

```bash
curl -i -X DELETE "$BASE/documents/1" \
  -H "Accept: application/json" \
  -H "Authorization: Bearer $TOKEN"
```

**Response `200`:**

```json
{
  "success": true,
  "data": null,
  "message": "Document deleted."
}
```

---

## Library resources

Shared library files managed by admins and made visible to users via visibility and explicit
permissions. All endpoints require Sanctum.

Library object shape:

```json
{
  "id": 1,
  "uuid": "d4f6b8c0-1e23-4f45-8a67-23abcdef4567",
  "title": "Study guide",
  "description": "Beginner guide",
  "category": "guides",
  "file_name": "guide.pdf",
  "mime_type": "application/pdf",
  "file_size": 1048576,
  "visibility": "assigned",
  "status": "active",
  "uploaded_by": 1,
  "is_bookmarked": false,
  "download_url": "http://localhost:8082/api/v1/library/1/download",
  "created_at": "2026-11-01T09:00:00.000000Z",
  "updated_at": "2026-11-01T09:00:00.000000Z"
}
```

Visibility scopes:

- `public` — visible to every authenticated user.
- `assigned` — visible to users with an explicit permission, or users in a group with a permission.
- `private` — visible only to the uploader/admin management endpoints.

### List library resources

`GET /library` — Sanctum, paginated.

| Query | Type | Notes |
|---|---|---|
| `search` | string | Matches the title. |
| `status` | string | `active` or `archived`. |
| `per_page` | integer | 1–100, default 20. |

```bash
curl -i "$BASE/library?search=guide&status=active&per_page=20" \
  -H "Accept: application/json" \
  -H "Authorization: Bearer $TOKEN"
```

**Response `200`:**

```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "uuid": "d4f6b8c0-1e23-4f45-8a67-23abcdef4567",
      "title": "Study guide",
      "description": "Beginner guide",
      "category": "guides",
      "file_name": "guide.pdf",
      "mime_type": "application/pdf",
      "file_size": 1048576,
      "visibility": "assigned",
      "status": "active",
      "uploaded_by": 1,
      "is_bookmarked": false,
      "download_url": "http://localhost:8082/api/v1/library/1/download",
      "created_at": "2026-11-01T09:00:00.000000Z",
      "updated_at": "2026-11-01T09:00:00.000000Z"
    }
  ],
  "message": "Library resources retrieved.",
  "meta": {
    "current_page": 1,
    "per_page": 20,
    "total": 1,
    "last_page": 1
  }
}
```

### Get library resource

`GET /library/{libraryResource}` — Sanctum. Invisible resources return `404`.

```bash
curl -i "$BASE/library/1" \
  -H "Accept: application/json" \
  -H "Authorization: Bearer $TOKEN"
```

**Response `200`:**

```json
{
  "success": true,
  "data": {
    "id": 1,
    "uuid": "d4f6b8c0-1e23-4f45-8a67-23abcdef4567",
    "title": "Study guide",
    "description": "Beginner guide",
    "category": "guides",
    "file_name": "guide.pdf",
    "mime_type": "application/pdf",
    "file_size": 1048576,
    "visibility": "assigned",
    "status": "active",
    "uploaded_by": 1,
    "is_bookmarked": false,
    "download_url": "http://localhost:8082/api/v1/library/1/download",
    "created_at": "2026-11-01T09:00:00.000000Z",
    "updated_at": "2026-11-01T09:00:00.000000Z"
  },
  "message": "OK"
}
```

### Upload library resource (admin)

`POST /library` — Admin, `multipart/form-data`.

| Field | Type | Required | Notes |
|---|---|---|---|
| `title` | string | yes | Max 255. |
| `description` | string\|null | no | Max 5000. |
| `category` | string\|null | no | Max 60. |
| `file` | file | yes | Maximum 50 MB (`51200` KB). |
| `visibility` | enum | no | `private`, `assigned`, or `public`. Defaults to `private`. |
| `status` | string | no | `active` or `archived`. Defaults to `active`. |

```bash
curl -i -X POST "$BASE/library" \
  -H "Accept: application/json" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -F "title=Study guide" \
  -F "description=Beginner guide" \
  -F "category=guides" \
  -F "visibility=assigned" \
  -F "status=active" \
  -F "file=@./guide.pdf"
```

**Response `201`:**

```json
{
  "success": true,
  "data": {
    "id": 1,
    "uuid": "d4f6b8c0-1e23-4f45-8a67-23abcdef4567",
    "title": "Study guide",
    "description": "Beginner guide",
    "category": "guides",
    "file_name": "guide.pdf",
    "mime_type": "application/pdf",
    "file_size": 1048576,
    "visibility": "assigned",
    "status": "active",
    "uploaded_by": 1,
    "is_bookmarked": false,
    "download_url": "http://localhost:8082/api/v1/library/1/download",
    "created_at": "2026-11-01T09:00:00.000000Z",
    "updated_at": "2026-11-01T09:00:00.000000Z"
  },
  "message": "Library resource created."
}
```

### Update library resource (admin)

`PUT|PATCH /library/{libraryResource}` — Admin.

| Field | Type | Notes |
|---|---|---|
| `title` | string | Max 255. |
| `description` | string\|null | Max 5000. |
| `category` | string\|null | Max 60. |
| `visibility` | enum | `private`, `assigned`, `public`. |
| `status` | string | `active` or `archived`. |

```bash
curl -i -X PATCH "$BASE/library/1" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d '{
    "title": "Study guide (updated)",
    "visibility": "public",
    "status": "archived"
  }'
```

**Response `200`:**

```json
{
  "success": true,
  "data": {
    "id": 1,
    "uuid": "d4f6b8c0-1e23-4f45-8a67-23abcdef4567",
    "title": "Study guide (updated)",
    "description": "Beginner guide",
    "category": "guides",
    "file_name": "guide.pdf",
    "mime_type": "application/pdf",
    "file_size": 1048576,
    "visibility": "public",
    "status": "archived",
    "uploaded_by": 1,
    "is_bookmarked": false,
    "download_url": "http://localhost:8082/api/v1/library/1/download",
    "created_at": "2026-11-01T09:00:00.000000Z",
    "updated_at": "2026-11-02T09:00:00.000000Z"
  },
  "message": "Library resource updated."
}
```

### Delete library resource (admin)

`DELETE /library/{libraryResource}` — Admin. Deletes the stored file and soft-deletes the record.

```bash
curl -i -X DELETE "$BASE/library/1" \
  -H "Accept: application/json" \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

**Response `200`:**

```json
{
  "success": true,
  "data": null,
  "message": "Library resource deleted."
}
```

### Download library resource

`GET /library/{libraryResource}/download` — Sanctum. Visibility rules are enforced.

```bash
curl -L "$BASE/library/1/download" \
  -H "Authorization: Bearer $TOKEN" \
  -o guide.pdf
```

No JSON envelope is returned. A missing file on disk returns `404`.

### List library resource permissions (admin)

`GET /library/{libraryResource}/permissions` — Admin. Returns a non-paginated array.

```bash
curl -i "$BASE/library/1/permissions" \
  -H "Accept: application/json" \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

**Response `200`:**

```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "uuid": "e5a7c9d1-2f34-4a56-9b78-34abcdef5678",
      "library_resource_id": 1,
      "user_id": 2,
      "group_id": null,
      "created_at": "2026-11-01T09:05:00.000000Z",
      "updated_at": "2026-11-01T09:05:00.000000Z"
    }
  ],
  "message": "Library permissions retrieved."
}
```

### Grant library resource permission (admin)

`POST /library/{libraryResource}/permissions` — Admin. Grant to a user **or** a group. `user_id`
and `group_id` are mutually exclusive and one is required.

| Field | Type | Required | Notes |
|---|---|---|---|
| `user_id` | integer | one of | Must exist. Prohibits `group_id`. |
| `group_id` | integer | one of | Must exist. Prohibits `user_id`. |

Grant to a user:

```bash
curl -i -X POST "$BASE/library/1/permissions" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d '{ "user_id": 1 }'
```

Grant to a group:

```bash
curl -i -X POST "$BASE/library/1/permissions" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d '{ "group_id": 1 }'
```

**Response `201`:**

```json
{
  "success": true,
  "data": {
    "id": 1,
    "uuid": "e5a7c9d1-2f34-4a56-9b78-34abcdef5678",
    "library_resource_id": 1,
    "user_id": 1,
    "group_id": null,
    "created_at": "2026-11-01T09:05:00.000000Z",
    "updated_at": "2026-11-01T09:05:00.000000Z"
  },
  "message": "Library permission granted."
}
```

Repeating the same grant updates the existing permission instead of duplicating it.

### Revoke library resource permission (admin)

`DELETE /library/{libraryResource}/permissions/{permission}` — Admin.

```bash
curl -i -X DELETE "$BASE/library/1/permissions/1" \
  -H "Accept: application/json" \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

**Response `200`:**

```json
{
  "success": true,
  "data": null,
  "message": "Library permission revoked."
}
```

---

## Bookmarks

Bookmarks for visible library resources. All endpoints require Sanctum.

Bookmark object shape:

```json
{
  "id": 1,
  "uuid": "f6b8d0e2-3a45-4b67-8c89-45abcdef6789",
  "library_resource_id": 1,
  "library_resource": {},
  "created_at": "2026-11-09T10:00:00.000000Z"
}
```

### List bookmarks

`GET /bookmarks` — Sanctum, paginated. Default `per_page` is 20; max 100.

```bash
curl -i "$BASE/bookmarks?per_page=50" \
  -H "Accept: application/json" \
  -H "Authorization: Bearer $TOKEN"
```

**Response `200`:**

```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "uuid": "f6b8d0e2-3a45-4b67-8c89-45abcdef6789",
      "library_resource_id": 1,
      "library_resource": {
        "id": 1,
        "uuid": "d4f6b8c0-1e23-4f45-8a67-23abcdef4567",
        "title": "Study guide",
        "description": "Beginner guide",
        "category": "guides",
        "file_name": "guide.pdf",
        "mime_type": "application/pdf",
        "file_size": 1048576,
        "visibility": "assigned",
        "status": "active",
        "uploaded_by": 1,
        "is_bookmarked": true,
        "download_url": "http://localhost:8082/api/v1/library/1/download",
        "created_at": "2026-11-01T09:00:00.000000Z",
        "updated_at": "2026-11-01T09:00:00.000000Z"
      },
      "created_at": "2026-11-09T10:00:00.000000Z"
    }
  ],
  "message": "Bookmarks retrieved.",
  "meta": {
    "current_page": 1,
    "per_page": 50,
    "total": 1,
    "last_page": 1
  }
}
```

### Create bookmark

`POST /bookmarks` — Sanctum. The library resource must be visible to you.

| Field | Type | Required | Notes |
|---|---|---|---|
| `library_resource_id` | integer | yes | Must exist. |

```bash
curl -i -X POST "$BASE/bookmarks" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{ "library_resource_id": 1 }'
```

**Response `201` (or `200` if the bookmark already existed):**

```json
{
  "success": true,
  "data": {
    "id": 1,
    "uuid": "f6b8d0e2-3a45-4b67-8c89-45abcdef6789",
    "library_resource_id": 1,
    "library_resource": {
      "id": 1,
      "uuid": "d4f6b8c0-1e23-4f45-8a67-23abcdef4567",
      "title": "Study guide",
      "description": "Beginner guide",
      "category": "guides",
      "file_name": "guide.pdf",
      "mime_type": "application/pdf",
      "file_size": 1048576,
      "visibility": "assigned",
      "status": "active",
      "uploaded_by": 1,
      "is_bookmarked": true,
      "download_url": "http://localhost:8082/api/v1/library/1/download",
      "created_at": "2026-11-01T09:00:00.000000Z",
      "updated_at": "2026-11-01T09:00:00.000000Z"
    },
    "created_at": "2026-11-09T10:00:00.000000Z"
  },
  "message": "Bookmark saved."
}
```

A resource that is not visible returns `404`.

### Delete bookmark

`DELETE /bookmarks/{bookmark}` — Sanctum. Soft-deletes the bookmark.

```bash
curl -i -X DELETE "$BASE/bookmarks/1" \
  -H "Accept: application/json" \
  -H "Authorization: Bearer $TOKEN"
```

**Response `200`:**

```json
{
  "success": true,
  "data": null,
  "message": "Bookmark removed."
}
```

---

## Notifications

In-app notifications for the authenticated user. All endpoints require Sanctum.

Notification object shape:

```json
{
  "id": 1,
  "uuid": "a7c9e1f3-4b56-4c78-9d01-56abcdef7890",
  "type": "goal_achieved",
  "title": "Goal achieved",
  "body": "Congratulations! You completed \"Run a marathon\".",
  "data": { "goal_id": 1, "goal_uuid": "9b3d5e6f-7a80-4b91-8c23-890abcdef123" },
  "read_at": null,
  "is_read": false,
  "sent_at": "2026-11-09T10:00:00.000000Z",
  "created_at": "2026-11-09T10:00:00.000000Z"
}
```

### List notifications

`GET /notifications` — Sanctum, paginated.

| Query | Type | Notes |
|---|---|---|
| `unread` | boolean | `1`/`true` returns only unread notifications. |
| `type` | enum | See [Notification types](#notification-types). |
| `per_page` | integer | 1–100, default 20. |

```bash
curl -i "$BASE/notifications?unread=1&type=goal_achieved&per_page=50" \
  -H "Accept: application/json" \
  -H "Authorization: Bearer $TOKEN"
```

**Response `200`:**

```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "uuid": "a7c9e1f3-4b56-4c78-9d01-56abcdef7890",
      "type": "goal_achieved",
      "title": "Goal achieved",
      "body": "Congratulations! You completed \"Run a marathon\".",
      "data": {
        "goal_id": 1,
        "goal_uuid": "9b3d5e6f-7a80-4b91-8c23-890abcdef123"
      },
      "read_at": null,
      "is_read": false,
      "sent_at": "2026-11-09T10:00:00.000000Z",
      "created_at": "2026-11-09T10:00:00.000000Z"
    }
  ],
  "message": "Notifications retrieved.",
  "meta": {
    "current_page": 1,
    "per_page": 50,
    "total": 1,
    "last_page": 1
  }
}
```

### Get unread count

`GET /notifications/unread-count` — Sanctum.

```bash
curl -i "$BASE/notifications/unread-count" \
  -H "Accept: application/json" \
  -H "Authorization: Bearer $TOKEN"
```

**Response `200`:**

```json
{
  "success": true,
  "data": { "unread_count": 3 },
  "message": "OK"
}
```

### Mark all as read

`POST /notifications/read-all` — Sanctum.

```bash
curl -i -X POST "$BASE/notifications/read-all" \
  -H "Accept: application/json" \
  -H "Authorization: Bearer $TOKEN"
```

**Response `200`:**

```json
{
  "success": true,
  "data": { "updated_count": 3 },
  "message": "Notifications marked as read."
}
```

### Get notification

`GET /notifications/{notification}` — Sanctum.

```bash
curl -i "$BASE/notifications/1" \
  -H "Accept: application/json" \
  -H "Authorization: Bearer $TOKEN"
```

**Response `200`:**

```json
{
  "success": true,
  "data": {
    "id": 1,
    "uuid": "a7c9e1f3-4b56-4c78-9d01-56abcdef7890",
    "type": "goal_achieved",
    "title": "Goal achieved",
    "body": "Congratulations! You completed \"Run a marathon\".",
    "data": {
      "goal_id": 1,
      "goal_uuid": "9b3d5e6f-7a80-4b91-8c23-890abcdef123"
    },
    "read_at": null,
    "is_read": false,
    "sent_at": "2026-11-09T10:00:00.000000Z",
    "created_at": "2026-11-09T10:00:00.000000Z"
  },
  "message": "OK"
}
```

### Mark notification as read

`POST /notifications/{notification}/read` — Sanctum.

```bash
curl -i -X POST "$BASE/notifications/1/read" \
  -H "Accept: application/json" \
  -H "Authorization: Bearer $TOKEN"
```

**Response `200`:**

```json
{
  "success": true,
  "data": {
    "id": 1,
    "uuid": "a7c9e1f3-4b56-4c78-9d01-56abcdef7890",
    "type": "goal_achieved",
    "title": "Goal achieved",
    "body": "Congratulations! You completed \"Run a marathon\".",
    "data": {
      "goal_id": 1,
      "goal_uuid": "9b3d5e6f-7a80-4b91-8c23-890abcdef123"
    },
    "read_at": "2026-11-09T11:00:00.000000Z",
    "is_read": true,
    "sent_at": "2026-11-09T10:00:00.000000Z",
    "created_at": "2026-11-09T10:00:00.000000Z"
  },
  "message": "Notification read."
}
```

### Delete notification

`DELETE /notifications/{notification}` — Sanctum. Soft-deletes the notification.

```bash
curl -i -X DELETE "$BASE/notifications/1" \
  -H "Accept: application/json" \
  -H "Authorization: Bearer $TOKEN"
```

**Response `200`:**

```json
{
  "success": true,
  "data": null,
  "message": "Notification deleted."
}
```

---

## Device tokens

Push notification device registration. All endpoints require Sanctum.

Device token object shape:

```json
{
  "id": 1,
  "device_type": "ios",
  "device_identifier": "iphone-15-pro",
  "is_active": true,
  "last_used_at": "2026-11-09T10:00:00+00:00",
  "created_at": "2026-11-01T09:00:00+00:00"
}
```

### List device tokens

`GET /device-tokens` — Sanctum. Returns a non-paginated array.

| Query | Type | Notes |
|---|---|---|
| `active` | boolean | `1`/`true` or `0`/`false`. |

```bash
curl -i "$BASE/device-tokens?active=1" \
  -H "Accept: application/json" \
  -H "Authorization: Bearer $TOKEN"
```

**Response `200`:**

```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "device_type": "ios",
      "device_identifier": "iphone-15-pro",
      "is_active": true,
      "last_used_at": "2026-11-09T10:00:00+00:00",
      "created_at": "2026-11-01T09:00:00+00:00"
    }
  ],
  "message": "Device tokens retrieved."
}
```

### Register device token

`POST /device-tokens` — Sanctum. Re-registering the same token updates it and reactivates it.

| Field | Type | Required | Notes |
|---|---|---|---|
| `device_token` | string | yes | Max 512. FCM/APNs token or equivalent. |
| `device_type` | string | yes | `android`, `ios`, `web`, or `other`. |
| `device_identifier` | string\|null | no | Max 255. |

```bash
curl -i -X POST "$BASE/device-tokens" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "device_token": "fcm-or-apns-token",
    "device_type": "ios",
    "device_identifier": "iphone-15-pro"
  }'
```

**Response `201` (or `200` when updating):**

```json
{
  "success": true,
  "data": {
    "id": 1,
    "device_type": "ios",
    "device_identifier": "iphone-15-pro",
    "is_active": true,
    "last_used_at": "2026-11-09T10:00:00+00:00",
    "created_at": "2026-11-01T09:00:00+00:00"
  },
  "message": "Device token registered."
}
```

### Deactivate device token

`DELETE /device-tokens/{deviceToken}` — Sanctum. Deactivates rather than deletes the token.

```bash
curl -i -X DELETE "$BASE/device-tokens/1" \
  -H "Accept: application/json" \
  -H "Authorization: Bearer $TOKEN"
```

**Response `200`:**

```json
{
  "success": true,
  "data": {
    "id": 1,
    "device_type": "ios",
    "device_identifier": "iphone-15-pro",
    "is_active": false,
    "last_used_at": "2026-11-09T11:00:00+00:00",
    "created_at": "2026-11-01T09:00:00+00:00"
  },
  "message": "Device token deactivated."
}
```

---

## Health records

Daily health metrics for the authenticated user. All endpoints require Sanctum.

Health record object shape:

```json
{
  "id": 1,
  "uuid": "b8d0f2a4-5c67-4d89-8e01-67abcdef8901",
  "record_date": "2026-11-09",
  "weight_kg": 72.5,
  "water_ml": 2000,
  "sleep_hours": 7.5,
  "blood_pressure_systolic": 120,
  "blood_pressure_diastolic": 80,
  "blood_pressure": "120/80",
  "notes": "Feeling good",
  "created_at": "2026-11-09T10:00:00.000000Z",
  "updated_at": "2026-11-09T10:00:00.000000Z"
}
```

### List health records

`GET /health-records` — Sanctum, paginated (30 per page).

| Query | Type | Notes |
|---|---|---|
| `from` | date | `record_date` >= `from`. |
| `to` | date | `record_date` <= `to`; must be after or equal to `from`. |
| `per_page` | integer | 1–100, default 30. |

```bash
curl -i "$BASE/health-records?from=2026-11-01&to=2026-11-30&per_page=50" \
  -H "Accept: application/json" \
  -H "Authorization: Bearer $TOKEN"
```

**Response `200`:**

```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "uuid": "b8d0f2a4-5c67-4d89-8e01-67abcdef8901",
      "record_date": "2026-11-09",
      "weight_kg": 72.5,
      "water_ml": 2000,
      "sleep_hours": 7.5,
      "blood_pressure_systolic": 120,
      "blood_pressure_diastolic": 80,
      "blood_pressure": "120/80",
      "notes": "Feeling good",
      "created_at": "2026-11-09T10:00:00.000000Z",
      "updated_at": "2026-11-09T10:00:00.000000Z"
    }
  ],
  "message": "Health records retrieved.",
  "meta": {
    "current_page": 1,
    "per_page": 50,
    "total": 1,
    "last_page": 1
  }
}
```

### Create health record

`POST /health-records` — Sanctum. Creates or updates the record for the given date.

| Field | Type | Required | Notes |
|---|---|---|---|
| `uuid` | uuid | no | |
| `record_date` | date | yes | |
| `weight_kg` | number\|null | no | 0–999.99. |
| `water_ml` | integer\|null | no | Minimum 0. |
| `sleep_hours` | number\|null | no | 0–24. |
| `blood_pressure_systolic` | integer\|null | no | 0–300. Must be >= diastolic. |
| `blood_pressure_diastolic` | integer\|null | no | 0–300. |
| `notes` | string\|null | no | Max 5000. |
| `client_created_at` | timestamp | no | |
| `client_updated_at` | timestamp | no | |

```bash
curl -i -X POST "$BASE/health-records" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "record_date": "2026-11-09",
    "weight_kg": 72.5,
    "water_ml": 2000,
    "sleep_hours": 7.5,
    "blood_pressure_systolic": 120,
    "blood_pressure_diastolic": 80,
    "notes": "Feeling good"
  }'
```

**Response `201` (or `200` when updating):**

```json
{
  "success": true,
  "data": {
    "id": 1,
    "uuid": "b8d0f2a4-5c67-4d89-8e01-67abcdef8901",
    "record_date": "2026-11-09",
    "weight_kg": 72.5,
    "water_ml": 2000,
    "sleep_hours": 7.5,
    "blood_pressure_systolic": 120,
    "blood_pressure_diastolic": 80,
    "blood_pressure": "120/80",
    "notes": "Feeling good",
    "created_at": "2026-11-09T10:00:00.000000Z",
    "updated_at": "2026-11-09T10:00:00.000000Z"
  },
  "message": "Health record saved."
}
```

Invalid blood pressure returns `422`:

```json
{
  "success": false,
  "data": null,
  "message": "Systolic pressure must be greater than or equal to diastolic pressure.",
  "errors": {
    "blood_pressure_systolic": [
      "Systolic pressure must be greater than or equal to diastolic pressure."
    ]
  }
}
```

### Get health record summary

`GET /health-records/summary` — Sanctum. Returns aggregates and the latest record.

| Query | Type | Notes |
|---|---|---|
| `from` | date | `record_date` >= `from`. |
| `to` | date | `record_date` <= `to`. |

```bash
curl -i "$BASE/health-records/summary?from=2026-11-01&to=2026-11-30" \
  -H "Accept: application/json" \
  -H "Authorization: Bearer $TOKEN"
```

**Response `200`:**

```json
{
  "success": true,
  "data": {
    "record_count": 12,
    "average_weight_kg": 72.48,
    "average_water_ml": 2100.5,
    "average_sleep_hours": 7.35,
    "latest": {
      "id": 12,
      "uuid": "b8d0f2a4-5c67-4d89-8e01-67abcdef8901",
      "record_date": "2026-11-30",
      "weight_kg": 72.1,
      "water_ml": 2200,
      "sleep_hours": 7.8,
      "blood_pressure_systolic": 118,
      "blood_pressure_diastolic": 78,
      "blood_pressure": "118/78",
      "notes": "Good month",
      "created_at": "2026-11-30T10:00:00.000000Z",
      "updated_at": "2026-11-30T10:00:00.000000Z"
    }
  },
  "message": "OK"
}
```

`latest` is `null` when there are no matching records.

### Get health record

`GET /health-records/{healthRecord}` — Sanctum.

```bash
curl -i "$BASE/health-records/1" \
  -H "Accept: application/json" \
  -H "Authorization: Bearer $TOKEN"
```

**Response `200`:**

```json
{
  "success": true,
  "data": {
    "id": 1,
    "uuid": "b8d0f2a4-5c67-4d89-8e01-67abcdef8901",
    "record_date": "2026-11-09",
    "weight_kg": 72.5,
    "water_ml": 2000,
    "sleep_hours": 7.5,
    "blood_pressure_systolic": 120,
    "blood_pressure_diastolic": 80,
    "blood_pressure": "120/80",
    "notes": "Feeling good",
    "created_at": "2026-11-09T10:00:00.000000Z",
    "updated_at": "2026-11-09T10:00:00.000000Z"
  },
  "message": "OK"
}
```

### Update health record

`PUT|PATCH /health-records/{healthRecord}` — Sanctum.

Fields are the same as create, except `uuid` and `client_created_at` are not accepted.

```bash
curl -i -X PATCH "$BASE/health-records/1" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "water_ml": 2500,
    "notes": "Hydrated well"
  }'
```

**Response `200`:**

```json
{
  "success": true,
  "data": {
    "id": 1,
    "uuid": "b8d0f2a4-5c67-4d89-8e01-67abcdef8901",
    "record_date": "2026-11-09",
    "weight_kg": 72.5,
    "water_ml": 2500,
    "sleep_hours": 7.5,
    "blood_pressure_systolic": 120,
    "blood_pressure_diastolic": 80,
    "blood_pressure": "120/80",
    "notes": "Hydrated well",
    "created_at": "2026-11-09T10:00:00.000000Z",
    "updated_at": "2026-11-09T11:00:00.000000Z"
  },
  "message": "Health record updated."
}
```

### Delete health record

`DELETE /health-records/{healthRecord}` — Sanctum. Soft-deletes the record.

```bash
curl -i -X DELETE "$BASE/health-records/1" \
  -H "Accept: application/json" \
  -H "Authorization: Bearer $TOKEN"
```

**Response `200`:**

```json
{
  "success": true,
  "data": null,
  "message": "Health record deleted."
}
```

---

## Exercise records

Exercise logs for the authenticated user. All endpoints require Sanctum.

Exercise record object shape:

```json
{
  "id": 1,
  "uuid": "c9e1a3b5-6d78-4e90-8f12-78abcdef9012",
  "activity_id": 1,
  "exercise_type": "strength",
  "title": "Push ups",
  "duration_minutes": 15,
  "distance": null,
  "calories_burned": 90,
  "notes": "3 sets of 15",
  "recorded_at": "2026-11-09T10:00:00+00:00",
  "created_at": "2026-11-09T10:00:00.000000Z",
  "updated_at": "2026-11-09T10:00:00.000000Z"
}
```

### List exercise records

`GET /exercise-records` — Sanctum, paginated.

| Query | Type | Notes |
|---|---|---|
| `activity_id` | integer | Filter by linked activity. |
| `exercise_type` | string | Max 100. Exact match. |
| `from` | date | `recorded_at` date >= `from`. |
| `to` | date | `recorded_at` date <= `to`; must be after or equal to `from`. |
| `per_page` | integer | 1–100, default 20. |

```bash
curl -i "$BASE/exercise-records?activity_id=1&exercise_type=strength&from=2026-11-01&to=2026-11-30&per_page=50" \
  -H "Accept: application/json" \
  -H "Authorization: Bearer $TOKEN"
```

**Response `200`:**

```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "uuid": "c9e1a3b5-6d78-4e90-8f12-78abcdef9012",
      "activity_id": 1,
      "exercise_type": "strength",
      "title": "Push ups",
      "duration_minutes": 15,
      "distance": null,
      "calories_burned": 90,
      "notes": "3 sets of 15",
      "recorded_at": "2026-11-09T10:00:00+00:00",
      "created_at": "2026-11-09T10:00:00.000000Z",
      "updated_at": "2026-11-09T10:00:00.000000Z"
    }
  ],
  "message": "Exercise records retrieved.",
  "meta": {
    "current_page": 1,
    "per_page": 50,
    "total": 1,
    "last_page": 1
  }
}
```

### Create exercise record

`POST /exercise-records` — Sanctum.

| Field | Type | Required | Notes |
|---|---|---|---|
| `uuid` | uuid | no | |
| `activity_id` | integer\|null | no | Must exist and belong to you. |
| `exercise_type` | string | yes | Max 100. |
| `title` | string | yes | Max 255. |
| `duration_minutes` | integer\|null | no | Minimum 0. |
| `distance` | number\|null | no | Minimum 0. |
| `calories_burned` | integer\|null | no | Minimum 0. |
| `notes` | string\|null | no | Max 5000. |
| `recorded_at` | timestamp | yes | |
| `client_created_at` | timestamp | no | |
| `client_updated_at` | timestamp | no | |

```bash
curl -i -X POST "$BASE/exercise-records" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "exercise_type": "strength",
    "title": "Push ups",
    "duration_minutes": 15,
    "calories_burned": 90,
    "notes": "3 sets of 15",
    "recorded_at": "2026-11-09T10:00:00Z"
  }'
```

**Response `201`:**

```json
{
  "success": true,
  "data": {
    "id": 1,
    "uuid": "c9e1a3b5-6d78-4e90-8f12-78abcdef9012",
    "activity_id": null,
    "exercise_type": "strength",
    "title": "Push ups",
    "duration_minutes": 15,
    "distance": null,
    "calories_burned": 90,
    "notes": "3 sets of 15",
    "recorded_at": "2026-11-09T10:00:00+00:00",
    "created_at": "2026-11-09T10:00:00.000000Z",
    "updated_at": "2026-11-09T10:00:00.000000Z"
  },
  "message": "Exercise record created."
}
```

An `activity_id` that belongs to another user returns `422`:

```json
{
  "success": false,
  "data": null,
  "message": "The selected activity does not belong to you.",
  "errors": {
    "activity_id": ["The selected activity does not belong to you."]
  }
}
```

### Get exercise record

`GET /exercise-records/{exerciseRecord}` — Sanctum. Includes the linked activity when present.

```bash
curl -i "$BASE/exercise-records/1" \
  -H "Accept: application/json" \
  -H "Authorization: Bearer $TOKEN"
```

**Response `200`:**

```json
{
  "success": true,
  "data": {
    "id": 1,
    "uuid": "c9e1a3b5-6d78-4e90-8f12-78abcdef9012",
    "activity_id": 1,
    "exercise_type": "strength",
    "title": "Push ups",
    "duration_minutes": 15,
    "distance": null,
    "calories_burned": 90,
    "notes": "3 sets of 15",
    "recorded_at": "2026-11-09T10:00:00+00:00",
    "created_at": "2026-11-09T10:00:00.000000Z",
    "updated_at": "2026-11-09T10:00:00.000000Z"
  },
  "message": "OK"
}
```

### Update exercise record

`PUT|PATCH /exercise-records/{exerciseRecord}` — Sanctum.

Fields are the same as create, except `uuid` and `client_created_at` are not accepted.

```bash
curl -i -X PATCH "$BASE/exercise-records/1" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "duration_minutes": 20,
    "notes": "4 sets of 15"
  }'
```

**Response `200`:**

```json
{
  "success": true,
  "data": {
    "id": 1,
    "uuid": "c9e1a3b5-6d78-4e90-8f12-78abcdef9012",
    "activity_id": 1,
    "exercise_type": "strength",
    "title": "Push ups",
    "duration_minutes": 20,
    "distance": null,
    "calories_burned": 90,
    "notes": "4 sets of 15",
    "recorded_at": "2026-11-09T10:00:00+00:00",
    "created_at": "2026-11-09T10:00:00.000000Z",
    "updated_at": "2026-11-09T11:00:00.000000Z"
  },
  "message": "Exercise record updated."
}
```

### Delete exercise record

`DELETE /exercise-records/{exerciseRecord}` — Sanctum. Soft-deletes the record.

```bash
curl -i -X DELETE "$BASE/exercise-records/1" \
  -H "Accept: application/json" \
  -H "Authorization: Bearer $TOKEN"
```

**Response `200`:**

```json
{
  "success": true,
  "data": null,
  "message": "Exercise record deleted."
}
```

---

## Offline synchronization

Bidirectional sync for offline-first clients. All endpoints require Sanctum.

Supported entity types:

`habit`, `habit_record`, `goal`, `shared_activity_completion`, `journal_entries`,
`daily_reports`, `exercise_records`, `health_records`.

Conflict policies:

`client_wins`, `server_wins`, `latest_wins`, `manual`.

### Push operations

`POST /sync/push` — Sanctum.

| Field | Type | Required | Notes |
|---|---|---|---|
| `device_id` | integer\|null | no | Must be a `user_devices` row owned by you. |
| `conflict_policy` | enum | no | Defaults to `latest_wins`. |
| `operations` | array | yes | 1–200 items. |

Each operation:

| Field | Type | Required | Notes |
|---|---|---|---|
| `operation_uuid` | uuid | yes | Idempotency key. |
| `entity_type` | enum | yes | See supported entity types. |
| `entity_uuid` | uuid | yes | UUID of the client entity. |
| `operation_type` | string | yes | `create`, `update`, or `delete`. |
| `client_version` | integer\|null | no | Minimum 0. |
| `client_updated_at` | timestamp\|null | no | Used by conflict policies. |
| `payload` | object\|null | no | Entity fields. |

```bash
curl -i -X POST "$BASE/sync/push" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "conflict_policy": "latest_wins",
    "operations": [
      {
        "operation_uuid": "11111111-1111-4111-8111-111111111111",
        "entity_type": "habit",
        "entity_uuid": "22222222-2222-4222-8222-222222222222",
        "operation_type": "create",
        "client_version": 1,
        "client_updated_at": "2026-11-09T10:00:00Z",
        "payload": {
          "name": "Morning meditation",
          "is_active": true
        }
      }
    ]
  }'
```

**Response `200`:**

```json
{
  "success": true,
  "data": {
    "server_time": "2026-11-09T10:00:05+00:00",
    "results": [
      {
        "operation_uuid": "11111111-1111-4111-8111-111111111111",
        "entity_type": "habit",
        "entity_uuid": "22222222-2222-4222-8222-222222222222",
        "status": "applied",
        "server_version": 1,
        "data": {
          "id": 5,
          "uuid": "22222222-2222-4222-8222-222222222222",
          "name": "Morning meditation",
          "is_active": true
        }
      }
    ]
  },
  "message": "Synchronization completed."
}
```

Per-operation `status` values:

| Status | Meaning |
|---|---|
| `applied` | Operation applied. |
| `duplicate` | `operation_uuid` was already synced; skipped. |
| `conflict` | Stored as a pending conflict (`manual` policy). |
| `server_wins` | Server data returned; client change not applied. |
| `rejected` | Locked daily report rejected the change. |
| `failed` | Operation failed; `message` contains the error. |

A duplicate operation result has `server_version: null`.

### Pull operations

`GET /sync/pull` — Sanctum. Returns every syncable record for the user changed since `since`.

| Query | Type | Notes |
|---|---|---|
| `since` | timestamp | Defaults to the beginning of time. |

```bash
curl -i "$BASE/sync/pull?since=2026-11-01T00:00:00Z" \
  -H "Accept: application/json" \
  -H "Authorization: Bearer $TOKEN"
```

**Response `200`:**

```json
{
  "success": true,
  "data": {
    "server_time": "2026-11-09T10:00:05+00:00",
    "since": "2026-11-01T00:00:00+00:00",
    "entities": {
      "habit": [
        {
          "uuid": "22222222-2222-4222-8222-222222222222",
          "deleted": false,
          "server_version": 3,
          "updated_at": "2026-11-09T09:00:00+00:00",
          "data": {}
        }
      ],
      "habit_record": [],
      "goal": [],
      "shared_activity_completion": [],
      "journal_entries": [],
      "daily_reports": [],
      "exercise_records": [],
      "health_records": []
    }
  },
  "message": "Changes retrieved."
}
```

Soft-deleted records are included with `deleted: true` so clients can remove them locally.

### List sync conflicts

`GET /sync/conflicts` — Sanctum, paginated.

| Query | Type | Notes |
|---|---|---|
| `status` | string | `pending`, `resolved`, or `ignored`. Defaults to `pending`. |
| `per_page` | integer | 1–100, default 20. |

```bash
curl -i "$BASE/sync/conflicts?status=pending&per_page=20" \
  -H "Accept: application/json" \
  -H "Authorization: Bearer $TOKEN"
```

**Response `200`:**

```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "conflict_uuid": "33333333-3333-4333-8333-333333333333",
      "entity_type": "habit",
      "entity_uuid": "22222222-2222-4222-8222-222222222222",
      "client_version": 2,
      "server_version": 3,
      "client_payload": {},
      "server_payload": {},
      "resolution_status": "pending",
      "resolution_type": null,
      "resolved_at": null,
      "created_at": "2026-11-09T10:00:00+00:00"
    }
  ],
  "message": "Sync conflicts retrieved.",
  "meta": {
    "current_page": 1,
    "per_page": 20,
    "total": 1,
    "last_page": 1
  }
}
```

### Resolve sync conflict

`POST /sync/conflicts/{syncConflict}/resolve` — Sanctum. The conflict must belong to you.

| Field | Type | Required | Notes |
|---|---|---|---|
| `resolution_type` | enum | yes | `client_wins`, `server_wins`, `latest_wins`, or `manual`. |

```bash
curl -i -X POST "$BASE/sync/conflicts/1/resolve" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{ "resolution_type": "client_wins" }'
```

**Response `200`:**

```json
{
  "success": true,
  "data": {
    "id": 1,
    "conflict_uuid": "33333333-3333-4333-8333-333333333333",
    "entity_type": "habit",
    "entity_uuid": "22222222-2222-4222-8222-222222222222",
    "client_version": 2,
    "server_version": 4,
    "client_payload": {},
    "server_payload": {},
    "resolution_status": "resolved",
    "resolution_type": "client_wins",
    "resolved_at": "2026-11-09T10:05:00+00:00",
    "created_at": "2026-11-09T10:00:00+00:00"
  },
  "message": "Sync conflict resolved."
}
```

### List sync operations

`GET /sync/operations` — Sanctum, paginated.

| Query | Type | Notes |
|---|---|---|
| `per_page` | integer | 1–100, default 20. |

```bash
curl -i "$BASE/sync/operations?per_page=50" \
  -H "Accept: application/json" \
  -H "Authorization: Bearer $TOKEN"
```

**Response `200`:**

```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "operation_uuid": "11111111-1111-4111-8111-111111111111",
      "device_id": null,
      "entity_type": "habit",
      "entity_uuid": "22222222-2222-4222-8222-222222222222",
      "operation_type": "create",
      "status": "synced",
      "error_message": null,
      "processed_at": "2026-11-09T10:00:05+00:00",
      "created_at": "2026-11-09T10:00:05+00:00"
    }
  ],
  "message": "Sync operations retrieved.",
  "meta": {
    "current_page": 1,
    "per_page": 50,
    "total": 1,
    "last_page": 1
  }
}
```

---

## Demo endpoints

These endpoints exist to demonstrate protected resources, queues, and authorization. They return
plain JSON (no `success` envelope).

### Get demo tasks

`GET /tasks` — Sanctum.

```bash
curl -i "$BASE/tasks" \
  -H "Accept: application/json" \
  -H "Authorization: Bearer $TOKEN"
```

**Response `200`:**

```json
{
  "tasks": [
    {
      "id": 1,
      "title": "Review ThinkCode Architecture Guidelines",
      "status": "completed",
      "assigned_to": "Ada Lovelace"
    },
    {
      "id": 2,
      "title": "Configure Production Deployment in Coolify",
      "status": "in_progress",
      "assigned_to": "Ada Lovelace"
    },
    {
      "id": 3,
      "title": "Integrate Client Domain and SSL Certificate",
      "status": "pending",
      "assigned_to": "Ada Lovelace"
    }
  ]
}
```

### Queue background job (demo)

`POST /queue-test` — Sanctum. Dispatches `ProcessExampleJob` to the configured queue.

```bash
curl -i -X POST "$BASE/queue-test" \
  -H "Accept: application/json" \
  -H "Authorization: Bearer $TOKEN"
```

**Response `200`:**

```json
{
  "status": "queued",
  "message": "Job dispatched to Redis queue successfully.",
  "payload": {
    "triggered_by": "ada@example.com",
    "timestamp": "2026-11-09T10:00:00.000000Z",
    "message": "Queue connectivity verification job"
  }
}
```

### Admin-only check

`GET /admin-check` — Admin. Uses the `view-admin-dashboard` gate.

```bash
curl -i "$BASE/admin-check" \
  -H "Accept: application/json" \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

**Response `200`:**

```json
{
  "message": "Welcome to the authorized admin area.",
  "user": "admin@example.com"
}
```

Non-admin users receive `403`.

---

## Admin API

Every route in this section lives under `/admin` and requires:

1. `auth:sanctum` authentication, and
2. the `role:admin` middleware.

A valid non-admin token receives `403 Forbidden`. Admin routes are **not** scoped to the
caller — they read and mutate records owned by every member. Suspended administrators are
blocked by the global `not-suspended` middleware.

Admin list endpoints share a common shape:

```json
{
  "success": true,
  "data": {
    "items": [],
    "stats": {}
  },
  "message": "Users retrieved.",
  "meta": {
    "current_page": 1,
    "per_page": 10,
    "total": 0,
    "last_page": 1
  }
}
```

The exact `stats` keys differ per resource and are listed in each endpoint.

### Admin dashboard

`GET /admin/dashboard` — Admin. Returns the aggregate community snapshot. Takes no
parameters.

```bash
curl -i "$BASE/admin/dashboard" \
  -H "Accept: application/json" \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

**Response `200`:**

```json
{
  "success": true,
  "data": {
    "stats": [
      {
        "label": "Total Users",
        "value": 128,
        "change": 12.5,
        "trend": "up",
        "series": [42, 57, 71, 88, 104, 128]
      },
      {
        "label": "Total Groups",
        "value": 6,
        "change": 0.0,
        "trend": "up",
        "series": [2, 3, 3, 4, 5, 6]
      },
      {
        "label": "Total Reports",
        "value": 913,
        "change": 8.3,
        "trend": "up",
        "series": [320, 412, 529, 655, 781, 913]
      },
      {
        "label": "Active Timetables",
        "value": 3,
        "change": 100.0,
        "trend": "up",
        "series": [1, 1, 2, 2, 3, 3]
      }
    ],
    "progress_overview": {
      "user_growth": 24,
      "group_activity": 67,
      "report_generation": 81
    },
    "completion": {
      "rate": 74,
      "completed": 1842,
      "in_progress": 512,
      "missed": 131
    },
    "recent_users": [
      {
        "id": 128,
        "uuid": "8a4d2f60-1c3b-4e7a-9d21-abcdef123456",
        "name": "Amina Yusuf",
        "email": "amina@example.com",
        "role": "user",
        "roles": ["user"],
        "is_active": true,
        "is_suspended": false,
        "suspended_at": null,
        "status": "active",
        "email_verified": true,
        "email_verified_at": "2026-11-01T08:00:00.000000Z",
        "invited_at": "2026-10-31T09:00:00.000000Z",
        "invitation_accepted_at": "2026-11-01T08:00:00.000000Z",
        "group": "Hifz Circle",
        "groups": [
          { "id": 2, "name": "Hifz Circle", "color": "emerald" }
        ],
        "joined_at": "2026-10-31",
        "last_active": "2026-11-13T07:45:00.000000Z",
        "activities": 18,
        "reports": 12,
        "progress": 78,
        "phone": null,
        "location": null,
        "bio": null,
        "created_at": "2026-10-31T09:00:00.000000Z",
        "updated_at": "2026-11-13T07:45:00.000000Z"
      }
    ],
    "recent_reports": [
      {
        "id": 913,
        "uuid": "c1d2e3f4-5678-4abc-9def-0123456789ab",
        "user_id": 128,
        "user_name": "Amina Yusuf",
        "user_email": "amina@example.com",
        "report_date": "2026-11-12",
        "summary": "Completed all morning blocks.",
        "self_assessment": "Strong focus",
        "calculated_score": 82.5,
        "scheduled_count": 6,
        "completed_count": 5,
        "score": 82.5,
        "completed_activities_count": 5,
        "total_activities_count": 6,
        "submitted_at": "2026-11-12T20:15:00.000000Z",
        "status": "submitted",
        "reviewed_at": null,
        "comments_count": 0,
        "created_at": "2026-11-12T20:15:00.000000Z",
        "updated_at": "2026-11-12T20:15:00.000000Z"
      }
    ],
    "charts": {
      "weekly": [
        { "label": "Fri", "value": 41, "secondary": 3 },
        { "label": "Sat", "value": 55, "secondary": 1 },
        { "label": "Sun", "value": 48, "secondary": 4 },
        { "label": "Mon", "value": 62, "secondary": 2 },
        { "label": "Tue", "value": 57, "secondary": 5 },
        { "label": "Wed", "value": 66, "secondary": 0 },
        { "label": "Thu", "value": 70, "secondary": 2 }
      ],
      "monthly": [
        { "label": "Jun 12", "value": 280, "secondary": 18 },
        { "label": "Jun 17", "value": 305, "secondary": 22 },
        { "label": "Jun 22", "value": 298, "secondary": 15 },
        { "label": "Jun 27", "value": 331, "secondary": 20 },
        { "label": "Jul 2", "value": 352, "secondary": 12 },
        { "label": "Jul 7", "value": 366, "secondary": 9 }
      ]
    },
    "pending_reports": 14,
    "reports_processed": 899,
    "average_score": 76.4
  },
  "message": "Dashboard retrieved."
}
```

Notes:

- Each `stats[]` entry has `label`, `value`, `change` (absolute percentage), `trend`
  (`up` or `down`) and a six-point `series`.
- `recent_users` holds 5 users; `recent_reports` holds 5 reports.
- `completion.rate` is `completed / (completed + pending + missed)`, rounded.
- `charts.weekly` always has 7 daily buckets with completed and missed counts.
- `charts.monthly` has 6 buckets of 5 days each.

---

### Global search

`GET /admin/search` — Admin. Searches users, groups and reports in one request.

| Query | Type | Required | Notes |
|---|---|---|---|
| `q` | string | yes | Minimum 2 characters, maximum 255. `%` and `_` are escaped. |

```bash
curl -i "$BASE/admin/search?q=amina" \
  -H "Accept: application/json" \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

**Response `200`:**

```json
{
  "success": true,
  "data": {
    "query": "amina",
    "users": [
      {
        "id": 128,
        "uuid": "8a4d2f60-1c3b-4e7a-9d21-abcdef123456",
        "name": "Amina Yusuf",
        "email": "amina@example.com",
        "role": "user",
        "roles": ["user"],
        "is_active": true,
        "is_suspended": false,
        "suspended_at": null,
        "status": "active",
        "email_verified": true,
        "email_verified_at": "2026-11-01T08:00:00.000000Z",
        "invited_at": "2026-10-31T09:00:00.000000Z",
        "invitation_accepted_at": "2026-11-01T08:00:00.000000Z",
        "group": "Hifz Circle",
        "groups": [
          { "id": 2, "name": "Hifz Circle", "color": "emerald" }
        ],
        "joined_at": "2026-10-31",
        "last_active": "2026-11-13T07:45:00.000000Z",
        "activities": 18,
        "reports": 12,
        "progress": 78,
        "phone": null,
        "location": null,
        "bio": null,
        "created_at": "2026-10-31T09:00:00.000000Z",
        "updated_at": "2026-11-13T07:45:00.000000Z"
      }
    ],
    "groups": [
      {
        "id": 2,
        "uuid": "5b6c7d8e-9f01-4a2b-8c3d-1234567890ab",
        "name": "Hifz Circle",
        "description": "Evening memorisation circle",
        "leader": "Amina Yusuf",
        "color": "emerald",
        "members_count": 14,
        "activities_count": 96,
        "progress": 78,
        "created_at": "2026-09-01",
        "updated_at": "2026-11-10T12:00:00.000000Z"
      }
    ],
    "reports": [
      {
        "id": 913,
        "uuid": "c1d2e3f4-5678-4abc-9def-0123456789ab",
        "user_id": 128,
        "user_name": "Amina Yusuf",
        "user_email": "amina@example.com",
        "report_date": "2026-11-12",
        "summary": "Completed all morning blocks.",
        "self_assessment": "Strong focus",
        "calculated_score": 82.5,
        "scheduled_count": 6,
        "completed_count": 5,
        "score": 82.5,
        "completed_activities_count": 5,
        "total_activities_count": 6,
        "submitted_at": "2026-11-12T20:15:00.000000Z",
        "status": "submitted",
        "reviewed_at": null,
        "comments_count": 0,
        "created_at": "2026-11-12T20:15:00.000000Z",
        "updated_at": "2026-11-12T20:15:00.000000Z"
      }
    ]
  },
  "message": "Search results retrieved."
}
```

Each category returns at most **5** records. A missing or short `q` returns `422`.

---

### Analytics

`GET /admin/analytics` — Admin.

| Query | Type | Notes |
|---|---|---|
| `range` | integer | `7`, `30`, or `90`. Defaults to `30`. |

```bash
curl -i "$BASE/admin/analytics?range=90" \
  -H "Accept: application/json" \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

**Response `200`:**

```json
{
  "success": true,
  "data": {
    "range": 90,
    "stats": {
      "active_users": 121,
      "total_users": 128,
      "average_completion": 76,
      "activities_logged": 2841,
      "reports_submitted": 913,
      "activities_change": 12.4,
      "reports_change": -3.1
    },
    "type_breakdown": [
      { "type": "prayer", "value": 812 },
      { "type": "quran", "value": 604 },
      { "type": "tafseer", "value": 231 },
      { "type": "reading", "value": 188 },
      { "type": "habit", "value": 402 },
      { "type": "goal", "value": 96 },
      { "type": "exercise", "value": 274 },
      { "type": "personal", "value": 154 },
      { "type": "other", "value": 80 }
    ],
    "completion_trend": [
      { "label": "W1", "value": 71, "secondary": 0 },
      { "label": "W2", "value": 74, "secondary": 0 },
      { "label": "W3", "value": 69, "secondary": 0 },
      { "label": "W4", "value": 77, "secondary": 0 },
      { "label": "W5", "value": 80, "secondary": 0 },
      { "label": "W6", "value": 75, "secondary": 0 },
      { "label": "W7", "value": 78, "secondary": 0 },
      { "label": "W8", "value": 82, "secondary": 0 }
    ],
    "activity_volume": [
      { "label": "Fri", "value": 41, "secondary": 3 },
      { "label": "Sat", "value": 55, "secondary": 1 },
      { "label": "Sun", "value": 48, "secondary": 4 },
      { "label": "Mon", "value": 62, "secondary": 2 },
      { "label": "Tue", "value": 57, "secondary": 5 },
      { "label": "Wed", "value": 66, "secondary": 0 },
      { "label": "Thu", "value": 70, "secondary": 2 }
    ],
    "top_users": [
      {
        "id": 128,
        "uuid": "8a4d2f60-1c3b-4e7a-9d21-abcdef123456",
        "name": "Amina Yusuf",
        "email": "amina@example.com",
        "role": "user",
        "roles": ["user"],
        "is_active": true,
        "is_suspended": false,
        "suspended_at": null,
        "status": "active",
        "email_verified": true,
        "email_verified_at": "2026-11-01T08:00:00.000000Z",
        "invited_at": "2026-10-31T09:00:00.000000Z",
        "invitation_accepted_at": "2026-11-01T08:00:00.000000Z",
        "group": "Hifz Circle",
        "groups": [
          { "id": 2, "name": "Hifz Circle", "color": "emerald" }
        ],
        "joined_at": "2026-10-31",
        "last_active": "2026-11-13T07:45:00.000000Z",
        "activities": 18,
        "reports": 12,
        "progress": 78,
        "phone": null,
        "location": null,
        "bio": null,
        "created_at": "2026-10-31T09:00:00.000000Z",
        "updated_at": "2026-11-13T07:45:00.000000Z"
      }
    ],
    "groups": [
      {
        "id": 2,
        "uuid": "5b6c7d8e-9f01-4a2b-8c3d-1234567890ab",
        "name": "Hifz Circle",
        "description": "Evening memorisation circle",
        "leader": "Amina Yusuf",
        "color": "emerald",
        "members_count": 14,
        "activities_count": 96,
        "progress": 78,
        "created_at": "2026-09-01",
        "updated_at": "2026-11-10T12:00:00.000000Z"
      }
    ],
    "highlights": {
      "most_consistent_group": "Hifz Circle",
      "most_consistent_score": 78,
      "best_day": "2026-11-06",
      "best_day_count": 74,
      "reports_awaiting_review": 14
    }
  },
  "message": "Analytics retrieved."
}
```

Notes:

- `type_breakdown` always lists all nine activity types, including zero values.
- `top_users` is ordered by average daily-report score and limited to 5.
- `groups` is limited to 6.
- `completion_trend` always has 8 weekly buckets; `activity_volume` always has 7 daily
  buckets.
- `best_day` / `most_consistent_group` are `null` when there is no data.

#### Export analytics CSV

`GET /admin/analytics/export` — Admin. Streams a CSV of activity counts per type for the
selected window.

| Query | Type | Notes |
|---|---|---|
| `range` | integer | `7`, `30`, or `90`. Defaults to `30`. |

```bash
curl -i "$BASE/admin/analytics/export?range=30" \
  -H "Accept: application/json" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -o analytics-last-30-days.csv
```

**Response `200`:** `text/csv; charset=UTF-8` with a UTF-8 BOM.

```csv
Activity type,Activities logged
prayer,812
quran,604
tafseer,231
reading,188
habit,402
goal,96
exercise,274
personal,154
other,80
```

The download filename is `analytics-last-<range>-days-YYYY-MM-DD.csv`.

---

### Admin users

#### List users

`GET /admin/users` — Admin, paginated (`per_page` default `10`).

| Query | Type | Notes |
|---|---|---|
| `q` | string | Matches name, email, or group name (contains). Max 255. |
| `role` | enum | `admin` or `user`. |
| `status` | enum | `active`, `pending`, `inactive`, or `suspended`. |
| `group_id` | integer | Must exist in `groups`. |
| `per_page` | integer | 1–100, default 10. |

Status semantics:

- `active` — `is_active = true` and not suspended.
- `suspended` — `suspended_at` is set.
- `inactive` — not active, not suspended, and either never invited or invitation accepted.
- `pending` — invited but the invitation has not been accepted.

```bash
curl -i "$BASE/admin/users?q=amina&role=user&status=active&group_id=2&per_page=25" \
  -H "Accept: application/json" \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

**Response `200`:**

```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": 128,
        "uuid": "8a4d2f60-1c3b-4e7a-9d21-abcdef123456",
        "name": "Amina Yusuf",
        "email": "amina@example.com",
        "role": "user",
        "roles": ["user"],
        "is_active": true,
        "is_suspended": false,
        "suspended_at": null,
        "status": "active",
        "email_verified": true,
        "email_verified_at": "2026-11-01T08:00:00.000000Z",
        "invited_at": "2026-10-31T09:00:00.000000Z",
        "invitation_accepted_at": "2026-11-01T08:00:00.000000Z",
        "group": "Hifz Circle",
        "groups": [
          { "id": 2, "name": "Hifz Circle", "color": "emerald" }
        ],
        "joined_at": "2026-10-31",
        "last_active": "2026-11-13T07:45:00.000000Z",
        "activities": 18,
        "reports": 12,
        "progress": 78,
        "phone": null,
        "location": null,
        "bio": null,
        "created_at": "2026-10-31T09:00:00.000000Z",
        "updated_at": "2026-11-13T07:45:00.000000Z"
      }
    ],
    "stats": {
      "total": 128,
      "active": 121,
      "pending": 4,
      "admins": 3
    }
  },
  "message": "Users retrieved.",
  "meta": {
    "current_page": 1,
    "per_page": 25,
    "total": 1,
    "last_page": 1
  }
}
```

`progress` is the rounded average `calculated_score` across all of the member's reports.
`activities` and `reports` are lifetime counts.

`stats.active` counts `is_active = true` and does not exclude suspended accounts.
`stats.pending` counts invited users who have not accepted, and `stats.admins` counts
users with the `admin` role.

#### Create user

`POST /admin/users` — Admin. Creates an account with a random password and, by default,
emails a one-time invitation code.

| Field | Type | Required | Notes |
|---|---|---|---|
| `name` | string | yes | Max 255. |
| `email` | string | yes | Valid email, unique. |
| `role` | enum | yes | `admin` or `user`. |
| `status` | enum | yes | `pending`, `active`, or `inactive`. |
| `group_id` | integer\|null | no | Must exist. Adds the user to this group. |
| `send_invitation` | boolean | no | Default `true`. Stores and emails a 6-digit code. |

```bash
curl -i -X POST "$BASE/admin/users" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d '{
    "name": "Amina Yusuf",
    "email": "amina@example.com",
    "role": "user",
    "status": "pending",
    "group_id": 2,
    "send_invitation": true
  }'
```

**Response `201`:**

```json
{
  "success": true,
  "data": {
    "user": {
      "id": 129,
      "uuid": "d4e5f6a7-8901-4bcd-8ef0-234567890abc",
      "name": "Amina Yusuf",
      "email": "amina@example.com",
      "role": "user",
      "roles": ["user"],
      "is_active": false,
      "is_suspended": false,
      "suspended_at": null,
      "status": "pending",
      "email_verified": false,
      "email_verified_at": null,
      "invited_at": "2026-11-13T08:30:00.000000Z",
      "invitation_accepted_at": null,
      "group": "Hifz Circle",
      "groups": [
        { "id": 2, "name": "Hifz Circle", "color": "emerald" }
      ],
      "joined_at": "2026-11-13",
      "last_active": "2026-11-13T08:30:00.000000Z",
      "activities": 0,
      "reports": 0,
      "progress": 0,
      "phone": null,
      "location": null,
      "bio": null,
      "created_at": "2026-11-13T08:30:00.000000Z",
      "updated_at": "2026-11-13T08:30:00.000000Z"
    },
    "invitation_sent": true
  },
  "message": "User created and invitation email sent."
}
```

If the mail transport fails, the account is still created. The response is still `201`
but `invitation_sent` is `false` and the message becomes
`"User created. The invitation email could not be delivered; check mail configuration."`.

Set `status` to `pending` to leave `invitation_accepted_at` empty. Any other status marks
the invitation as accepted immediately.

#### Show user

`GET /admin/users/{user}` — Admin. Returns the member plus their 25 most recent reports
and 25 most recent activities.

```bash
curl -i "$BASE/admin/users/128" \
  -H "Accept: application/json" \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

**Response `200`:**

```json
{
  "success": true,
  "data": {
    "user": {
      "id": 128,
      "uuid": "8a4d2f60-1c3b-4e7a-9d21-abcdef123456",
      "name": "Amina Yusuf",
      "email": "amina@example.com",
      "role": "user",
      "roles": ["user"],
      "is_active": true,
      "is_suspended": false,
      "suspended_at": null,
      "status": "active",
      "email_verified": true,
      "email_verified_at": "2026-11-01T08:00:00.000000Z",
      "invited_at": "2026-10-31T09:00:00.000000Z",
      "invitation_accepted_at": "2026-11-01T08:00:00.000000Z",
      "group": "Hifz Circle",
      "groups": [
        { "id": 2, "name": "Hifz Circle", "color": "emerald" }
      ],
      "joined_at": "2026-10-31",
      "last_active": "2026-11-13T07:45:00.000000Z",
      "activities": 18,
      "reports": 12,
      "progress": 78,
      "phone": null,
      "location": null,
      "bio": null,
      "created_at": "2026-10-31T09:00:00.000000Z",
      "updated_at": "2026-11-13T07:45:00.000000Z"
    },
    "reports": [
      {
        "id": 913,
        "uuid": "c1d2e3f4-5678-4abc-9def-0123456789ab",
        "user_id": 128,
        "report_date": "2026-11-12",
        "summary": "Completed all morning blocks.",
        "self_assessment": "Strong focus",
        "calculated_score": 82.5,
        "scheduled_count": 6,
        "completed_count": 5,
        "score": 82.5,
        "completed_activities_count": 5,
        "total_activities_count": 6,
        "submitted_at": "2026-11-12T20:15:00.000000Z",
        "status": "submitted",
        "reviewed_at": null,
        "comments_count": 0,
        "created_at": "2026-11-12T20:15:00.000000Z",
        "updated_at": "2026-11-12T20:15:00.000000Z"
      }
    ],
    "activities": [
      {
        "id": 4821,
        "uuid": "9e8d7c6b-5a49-4382-9170-abcdef123456",
        "user_id": 128,
        "title": "Morning run",
        "description": "5km easy run",
        "activity_type": "exercise",
        "scheduled_date": "2026-11-12",
        "start_time": "07:00",
        "end_time": "07:45",
        "status": "completed",
        "reminder_enabled": true,
        "created_at": "2026-11-11T21:00:00.000000Z",
        "updated_at": "2026-11-12T07:46:00.000000Z"
      }
    ]
  },
  "message": "User retrieved."
}
```

`reports` and `activities` are ordered newest first and capped at 25 each. `user.progress`
uses the lifetime average score.

#### Update user

`PUT /admin/users/{user}` or `PATCH /admin/users/{user}` — Admin. All fields are optional;
only supplied fields change.

| Field | Type | Notes |
|---|---|---|
| `name` | string | Max 255. |
| `email` | string | Valid email, unique except the user's own. |
| `role` | enum | `admin` or `user`. |
| `status` | enum | `pending`, `active`, or `inactive`. |
| `group_id` | integer\|null | `null` removes the user from all groups. Otherwise replaces memberships with this single group. |

```bash
curl -i -X PATCH "$BASE/admin/users/128" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d '{
    "name": "Amina Y. Yusuf",
    "role": "user",
    "status": "active",
    "group_id": 2
  }'
```

**Response `200`:**

```json
{
  "success": true,
  "data": {
    "user": {
      "id": 128,
      "uuid": "8a4d2f60-1c3b-4e7a-9d21-abcdef123456",
      "name": "Amina Y. Yusuf",
      "email": "amina@example.com",
      "role": "user",
      "roles": ["user"],
      "is_active": true,
      "is_suspended": false,
      "suspended_at": null,
      "status": "active",
      "email_verified": true,
      "email_verified_at": "2026-11-01T08:00:00.000000Z",
      "invited_at": "2026-10-31T09:00:00.000000Z",
      "invitation_accepted_at": "2026-11-01T08:00:00.000000Z",
      "group": "Hifz Circle",
      "groups": [
        { "id": 2, "name": "Hifz Circle", "color": "emerald" }
      ],
      "joined_at": "2026-10-31",
      "last_active": "2026-11-13T07:45:00.000000Z",
      "activities": 18,
      "reports": 12,
      "progress": 78,
      "phone": null,
      "location": null,
      "bio": null,
      "created_at": "2026-10-31T09:00:00.000000Z",
      "updated_at": "2026-11-13T08:40:00.000000Z"
    }
  },
  "message": "User updated."
}
```

#### Toggle user status

`POST /admin/users/{user}/toggle-status` — Admin. Flips `is_active` and returns the updated
member.

```bash
curl -i -X POST "$BASE/admin/users/128/toggle-status" \
  -H "Accept: application/json" \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

**Response `200`:**

```json
{
  "success": true,
  "data": {
    "user": {
      "id": 128,
      "uuid": "8a4d2f60-1c3b-4e7a-9d21-abcdef123456",
      "name": "Amina Yusuf",
      "email": "amina@example.com",
      "role": "user",
      "roles": ["user"],
      "is_active": false,
      "is_suspended": false,
      "suspended_at": null,
      "status": "inactive",
      "email_verified": true,
      "email_verified_at": "2026-11-01T08:00:00.000000Z",
      "invited_at": "2026-10-31T09:00:00.000000Z",
      "invitation_accepted_at": "2026-11-01T08:00:00.000000Z",
      "group": "Hifz Circle",
      "groups": [
        { "id": 2, "name": "Hifz Circle", "color": "emerald" }
      ],
      "joined_at": "2026-10-31",
      "last_active": "2026-11-13T07:45:00.000000Z",
      "activities": 18,
      "reports": 12,
      "progress": 78,
      "phone": null,
      "location": null,
      "bio": null,
      "created_at": "2026-10-31T09:00:00.000000Z",
      "updated_at": "2026-11-13T08:45:00.000000Z"
    }
  },
  "message": "User deactivated."
}
```

The message is `"User activated."` when the account was inactive. An administrator cannot
toggle their own account:

**Response `422`:**

```json
{
  "success": false,
  "data": null,
  "message": "You cannot change the status of your own account."
}
```

#### Toggle user suspension

`POST /admin/users/{user}/toggle-suspension` — Admin. Sets or clears `suspended_at`.
Suspending also revokes every personal access token belonging to that user. `is_active`
is left untouched.

```bash
curl -i -X POST "$BASE/admin/users/128/toggle-suspension" \
  -H "Accept: application/json" \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

**Response `200`:**

```json
{
  "success": true,
  "data": {
    "user": {
      "id": 128,
      "uuid": "8a4d2f60-1c3b-4e7a-9d21-abcdef123456",
      "name": "Amina Yusuf",
      "email": "amina@example.com",
      "role": "user",
      "roles": ["user"],
      "is_active": true,
      "is_suspended": true,
      "suspended_at": "2026-11-13T08:50:00.000000Z",
      "status": "suspended",
      "email_verified": true,
      "email_verified_at": "2026-11-01T08:00:00.000000Z",
      "invited_at": "2026-10-31T09:00:00.000000Z",
      "invitation_accepted_at": "2026-11-01T08:00:00.000000Z",
      "group": "Hifz Circle",
      "groups": [
        { "id": 2, "name": "Hifz Circle", "color": "emerald" }
      ],
      "joined_at": "2026-10-31",
      "last_active": "2026-11-13T07:45:00.000000Z",
      "activities": 18,
      "reports": 12,
      "progress": 78,
      "phone": null,
      "location": null,
      "bio": null,
      "created_at": "2026-10-31T09:00:00.000000Z",
      "updated_at": "2026-11-13T08:50:00.000000Z"
    }
  },
  "message": "User suspended."
}
```

Calling it again lifts the suspension with `"User suspension lifted."`. Suspending your own
account returns `422` with `"You cannot suspend your own account."`.

#### Export users CSV

`GET /admin/users/export` — Admin. Accepts the same filters as the list endpoint except
`per_page`.

| Query | Type | Notes |
|---|---|---|
| `q` | string | Matches name, email, or group name. |
| `role` | enum | `admin` or `user`. |
| `status` | enum | `active`, `pending`, `inactive`, or `suspended`. |
| `group_id` | integer | Must exist. |

```bash
curl -i "$BASE/admin/users/export?role=user&status=active" \
  -H "Accept: application/json" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -o users.csv
```

**Response `200`:** `text/csv; charset=UTF-8`.

```csv
ID,Name,Email,Role,Status,Group,Activities,Reports,Joined
128,Amina Yusuf,amina@example.com,user,active,Hifz Circle,18,12,2026-10-31
```

The export is streamed in chunks of 500 rows. The filename is `users-YYYY-MM-DD.csv`.

---

### Admin groups

#### List groups

`GET /admin/groups` — Admin, paginated (`per_page` default `9`).

| Query | Type | Notes |
|---|---|---|
| `q` | string | Matches name, description, or leader name (contains). Max 255. |
| `per_page` | integer | 1–100, default 9. |

```bash
curl -i "$BASE/admin/groups?q=hifz&per_page=20" \
  -H "Accept: application/json" \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

**Response `200`:**

```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": 2,
        "uuid": "5b6c7d8e-9f01-4a2b-8c3d-1234567890ab",
        "name": "Hifz Circle",
        "description": "Evening memorisation circle",
        "leader": "Amina Yusuf",
        "color": "emerald",
        "members_count": 14,
        "activities_count": 96,
        "progress": 78,
        "created_at": "2026-09-01",
        "updated_at": "2026-11-10T12:00:00.000000Z"
      }
    ],
    "stats": {
      "total": 6,
      "members": 47,
      "average_completion": 72
    }
  },
  "message": "Groups retrieved.",
  "meta": {
    "current_page": 1,
    "per_page": 20,
    "total": 1,
    "last_page": 1
  }
}
```

`progress` is the average daily-report score of the group's members over the last 30 days,
rounded. `activities_count` counts all member activities. `stats.total` counts every group,
`stats.members` counts distinct users across all group assignments, and
`stats.average_completion` is the mean `progress` across the groups on the current page.

#### Create group

`POST /admin/groups` — Admin.

| Field | Type | Required | Notes |
|---|---|---|---|
| `name` | string | yes | 2–255 characters, unique. |
| `description` | string\|null | no | Max 2000. |
| `leader` | string\|null | no | Max 255. Stored as `leader_name`. |
| `color` | enum | no | `brand`, `sky`, `emerald`, `amber`, `rose`, or `violet`. Auto-assigned when omitted. |
| `member_ids` | integer[] | no | Each id must exist in `users`. |

```bash
curl -i -X POST "$BASE/admin/groups" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d '{
    "name": "Tafseer Circle",
    "description": "Weekly tafseer study",
    "leader": "Amina Yusuf",
    "color": "violet",
    "member_ids": [128, 129]
  }'
```

**Response `201`:**

```json
{
  "success": true,
  "data": {
    "group": {
      "id": 7,
      "uuid": "a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d",
      "name": "Tafseer Circle",
      "description": "Weekly tafseer study",
      "leader": "Amina Yusuf",
      "color": "violet",
      "members_count": 2,
      "activities_count": 36,
      "progress": 78,
      "members": [
        {
          "id": 128,
          "uuid": "8a4d2f60-1c3b-4e7a-9d21-abcdef123456",
          "name": "Amina Yusuf",
          "email": "amina@example.com",
          "role": "user",
          "roles": ["user"],
          "is_active": true,
          "is_suspended": false,
          "suspended_at": null,
          "status": "active",
          "email_verified": true,
          "email_verified_at": "2026-11-01T08:00:00.000000Z",
          "invited_at": "2026-10-31T09:00:00.000000Z",
          "invitation_accepted_at": "2026-11-01T08:00:00.000000Z",
          "group": "Tafseer Circle",
          "groups": [
            { "id": 7, "name": "Tafseer Circle", "color": "violet" }
          ],
          "joined_at": "2026-10-31",
          "last_active": "2026-11-13T07:45:00.000000Z",
          "activities": 18,
          "reports": 12,
          "progress": 78,
          "phone": null,
          "location": null,
          "bio": null,
          "created_at": "2026-10-31T09:00:00.000000Z",
          "updated_at": "2026-11-13T07:45:00.000000Z"
        }
      ],
      "created_at": "2026-11-13",
      "updated_at": "2026-11-13T09:00:00.000000Z"
    }
  },
  "message": "Group created."
}
```

#### Show group

`GET /admin/groups/{group}` — Admin. Returns the group with every member expanded.

```bash
curl -i "$BASE/admin/groups/2" \
  -H "Accept: application/json" \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

**Response `200`:**

```json
{
  "success": true,
  "data": {
    "group": {
      "id": 2,
      "uuid": "5b6c7d8e-9f01-4a2b-8c3d-1234567890ab",
      "name": "Hifz Circle",
      "description": "Evening memorisation circle",
      "leader": "Amina Yusuf",
      "color": "emerald",
      "members_count": 14,
      "activities_count": 96,
      "progress": 78,
      "members": [
        {
          "id": 128,
          "uuid": "8a4d2f60-1c3b-4e7a-9d21-abcdef123456",
          "name": "Amina Yusuf",
          "email": "amina@example.com",
          "role": "user",
          "roles": ["user"],
          "is_active": true,
          "is_suspended": false,
          "suspended_at": null,
          "status": "active",
          "email_verified": true,
          "email_verified_at": "2026-11-01T08:00:00.000000Z",
          "invited_at": "2026-10-31T09:00:00.000000Z",
          "invitation_accepted_at": "2026-11-01T08:00:00.000000Z",
          "group": "Hifz Circle",
          "groups": [
            { "id": 2, "name": "Hifz Circle", "color": "emerald" }
          ],
          "joined_at": "2026-10-31",
          "last_active": "2026-11-13T07:45:00.000000Z",
          "activities": 18,
          "reports": 12,
          "progress": 78,
          "phone": null,
          "location": null,
          "bio": null,
          "created_at": "2026-10-31T09:00:00.000000Z",
          "updated_at": "2026-11-13T07:45:00.000000Z"
        }
      ],
      "created_at": "2026-09-01",
      "updated_at": "2026-11-10T12:00:00.000000Z"
    }
  },
  "message": "Group retrieved."
}
```

#### Update group

`PUT /admin/groups/{group}` or `PATCH /admin/groups/{group}` — Admin. All fields are
optional.

| Field | Type | Notes |
|---|---|---|
| `name` | string | 2–255 characters, unique except this group. |
| `description` | string\|null | Max 2000. |
| `leader` | string\|null | Max 255. |
| `color` | enum | `brand`, `sky`, `emerald`, `amber`, `rose`, or `violet`. |
| `member_ids` | integer[] | Replaces the full member list. Send `[]` to remove everyone. |

```bash
curl -i -X PATCH "$BASE/admin/groups/7" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d '{
    "description": "Weekly tafseer study, moved to Saturdays",
    "color": "sky",
    "member_ids": []
  }'
```

**Response `200`:**

```json
{
  "success": true,
  "data": {
    "group": {
      "id": 7,
      "uuid": "a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d",
      "name": "Tafseer Circle",
      "description": "Weekly tafseer study, moved to Saturdays",
      "leader": "Amina Yusuf",
      "color": "sky",
      "members_count": 0,
      "activities_count": 0,
      "progress": 0,
      "members": [],
      "created_at": "2026-11-13",
      "updated_at": "2026-11-13T09:15:00.000000Z"
    }
  },
  "message": "Group updated."
}
```

`member_ids` is a full replacement, not a patch. Omitting it leaves memberships untouched.

#### Export groups CSV

`GET /admin/groups/export` — Admin.

| Query | Type | Notes |
|---|---|---|
| `q` | string | Matches name, description, or leader name. |

```bash
curl -i "$BASE/admin/groups/export" \
  -H "Accept: application/json" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -o groups.csv
```

**Response `200`:** `text/csv; charset=UTF-8`.

```csv
ID,Name,Leader,Description,Members,Activities,Completion,Created
2,Hifz Circle,Amina Yusuf,Evening memorisation circle,14,96,78%,2026-09-01
```

The filename is `groups-YYYY-MM-DD.csv`.

---

### Admin reports

#### List reports

`GET /admin/reports` — Admin, paginated (`per_page` default `15`). Ordered by report date
descending, then id descending.

| Query | Type | Notes |
|---|---|---|
| `q` | string | Matches summary, self assessment, member name, or member email. Max 255. |
| `status` | enum | `submitted`, `reviewed`, or `flagged`. |
| `date` | date | Exact `report_date`. |
| `user_id` | integer | Must exist in `users`. |
| `per_page` | integer | 1–100, default 15. |

```bash
curl -i "$BASE/admin/reports?status=submitted&date=2026-11-12&user_id=128&per_page=30" \
  -H "Accept: application/json" \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

**Response `200`:**

```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": 913,
        "uuid": "c1d2e3f4-5678-4abc-9def-0123456789ab",
        "user_id": 128,
        "user_name": "Amina Yusuf",
        "user_email": "amina@example.com",
        "report_date": "2026-11-12",
        "summary": "Completed all morning blocks.",
        "self_assessment": "Strong focus",
        "calculated_score": 82.5,
        "scheduled_count": 6,
        "completed_count": 5,
        "score": 82.5,
        "completed_activities_count": 5,
        "total_activities_count": 6,
        "submitted_at": "2026-11-12T20:15:00.000000Z",
        "status": "submitted",
        "reviewed_at": null,
        "comments_count": 0,
        "created_at": "2026-11-12T20:15:00.000000Z",
        "updated_at": "2026-11-12T20:15:00.000000Z"
      }
    ],
    "stats": {
      "average": 76.4,
      "submitted": 14,
      "reviewed": 891,
      "flagged": 8
    }
  },
  "message": "Daily reports retrieved.",
  "meta": {
    "current_page": 1,
    "per_page": 30,
    "total": 1,
    "last_page": 1
  }
}
```

`stats.average` is the mean `calculated_score` across all reports with
`scheduled_count > 0`.

#### Show report

`GET /admin/reports/{report}` — Admin. Returns the report, its author, and all comments in
chronological order.

```bash
curl -i "$BASE/admin/reports/913" \
  -H "Accept: application/json" \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

**Response `200`:**

```json
{
  "success": true,
  "data": {
    "report": {
      "id": 913,
      "uuid": "c1d2e3f4-5678-4abc-9def-0123456789ab",
      "user_id": 128,
      "user_name": "Amina Yusuf",
      "user_email": "amina@example.com",
      "report_date": "2026-11-12",
      "summary": "Completed all morning blocks.",
      "self_assessment": "Strong focus",
      "calculated_score": 82.5,
      "scheduled_count": 6,
      "completed_count": 5,
      "score": 82.5,
      "completed_activities_count": 5,
      "total_activities_count": 6,
      "submitted_at": "2026-11-12T20:15:00.000000Z",
      "status": "submitted",
      "reviewed_at": null,
      "comments_count": 1,
      "activities": [
        {
          "id": 77,
          "activity_id": 4821,
          "activity_uuid": "9e8d7c6b-5a49-4382-9170-abcdef123456",
          "activity_title": "Morning run",
          "activity_type": "exercise",
          "activity_status": "completed",
          "scheduled_date": "2026-11-12",
          "start_time": "07:00",
          "end_time": "07:45",
          "completed_at": "2026-11-12T07:46:00.000000Z",
          "sort_order": 1
        }
      ],
      "created_at": "2026-11-12T20:15:00.000000Z",
      "updated_at": "2026-11-12T20:15:00.000000Z"
    },
    "member": {
      "id": 128,
      "uuid": "8a4d2f60-1c3b-4e7a-9d21-abcdef123456",
      "name": "Amina Yusuf",
      "email": "amina@example.com",
      "role": "user",
      "roles": ["user"],
      "is_active": true,
      "is_suspended": false,
      "suspended_at": null,
      "status": "active",
      "email_verified": true,
      "email_verified_at": "2026-11-01T08:00:00.000000Z",
      "invited_at": "2026-10-31T09:00:00.000000Z",
      "invitation_accepted_at": "2026-11-01T08:00:00.000000Z",
      "group": "Hifz Circle",
      "groups": [
        { "id": 2, "name": "Hifz Circle", "color": "emerald" }
      ],
      "joined_at": "2026-10-31",
      "last_active": "2026-11-13T07:45:00.000000Z",
      "activities": 18,
      "reports": 12,
      "progress": 78,
      "phone": null,
      "location": null,
      "bio": null,
      "created_at": "2026-10-31T09:00:00.000000Z",
      "updated_at": "2026-11-13T07:45:00.000000Z"
    },
    "comments": [
      {
        "id": 31,
        "author": "Samira Khan",
        "role": "Administrator",
        "comment": "Excellent consistency this week.",
        "created_at": "2026-11-13T09:30:00.000000Z"
      }
    ]
  },
  "message": "Daily report retrieved."
}
```

#### Update report status

`PATCH /admin/reports/{report}/status` — Admin.

| Field | Type | Required | Notes |
|---|---|---|---|
| `status` | enum | yes | `submitted`, `reviewed`, or `flagged`. |

Setting `reviewed` stamps `reviewed_at` with the current time. Any other status clears it.

```bash
curl -i -X PATCH "$BASE/admin/reports/913/status" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d '{ "status": "reviewed" }'
```

**Response `200`:**

```json
{
  "success": true,
  "data": {
    "report": {
      "id": 913,
      "uuid": "c1d2e3f4-5678-4abc-9def-0123456789ab",
      "user_id": 128,
      "user_name": "Amina Yusuf",
      "user_email": "amina@example.com",
      "report_date": "2026-11-12",
      "summary": "Completed all morning blocks.",
      "self_assessment": "Strong focus",
      "calculated_score": 82.5,
      "scheduled_count": 6,
      "completed_count": 5,
      "score": 82.5,
      "completed_activities_count": 5,
      "total_activities_count": 6,
      "submitted_at": "2026-11-12T20:15:00.000000Z",
      "status": "reviewed",
      "reviewed_at": "2026-11-13T09:35:00.000000Z",
      "comments_count": 1,
      "created_at": "2026-11-12T20:15:00.000000Z",
      "updated_at": "2026-11-13T09:35:00.000000Z"
    }
  },
  "message": "Report status updated."
}
```

#### Add report comment

`POST /admin/reports/{report}/comments` — Admin.

| Field | Type | Required | Notes |
|---|---|---|---|
| `comment` | string | yes | Max 5000. |

The report author receives a `daily_report_comment` notification unless they are the
commenting administrator.

```bash
curl -i -X POST "$BASE/admin/reports/913/comments" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d '{ "comment": "Excellent consistency this week." }'
```

**Response `201`:**

```json
{
  "success": true,
  "data": {
    "id": 32,
    "author": "Samira Khan",
    "role": "Administrator",
    "comment": "Excellent consistency this week.",
    "created_at": "2026-11-13T09:40:00.000000Z"
  },
  "message": "Comment added."
}
```

#### Export reports CSV

`GET /admin/reports/export` — Admin. Accepts the same filters as the list endpoint except
`per_page`.

| Query | Type | Notes |
|---|---|---|
| `q` | string | Matches summary, self assessment, member name, or email. |
| `status` | enum | `submitted`, `reviewed`, or `flagged`. |
| `date` | date | Exact `report_date`. |
| `user_id` | integer | Must exist. |

```bash
curl -i "$BASE/admin/reports/export?status=flagged&date=2026-11-12" \
  -H "Accept: application/json" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -o daily-reports.csv
```

**Response `200`:** `text/csv; charset=UTF-8`.

```csv
ID,Report date,Member,Email,Completed,Scheduled,Score,Status,Comments,Summary
913,2026-11-12,Amina Yusuf,amina@example.com,5,6,82.50,flagged,1,Completed all morning blocks.
```

The filename is `daily-reports-YYYY-MM-DD.csv`.

---

### Admin activities

#### List activities

`GET /admin/activities` — Admin, paginated (`per_page` default `15`). Ordered by scheduled
date descending, then id descending.

| Query | Type | Notes |
|---|---|---|
| `q` | string | Matches title, description, member name, or member email. Max 255. |
| `type` | string | Any activity type value, e.g. `prayer`, `quran`, `exercise`. Max 50. |
| `status` | enum | `pending`, `completed`, or `missed`. |
| `user_id` | integer | Must exist in `users`. |
| `per_page` | integer | 1–100, default 15. |

```bash
curl -i "$BASE/admin/activities?type=prayer&status=missed&user_id=128&per_page=50" \
  -H "Accept: application/json" \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

**Response `200`:**

```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": 4821,
        "uuid": "9e8d7c6b-5a49-4382-9170-abcdef123456",
        "user_id": 128,
        "user_name": "Amina Yusuf",
        "user_email": "amina@example.com",
        "title": "Fajr prayer",
        "description": "Congregation at the masjid",
        "activity_type": "prayer",
        "scheduled_date": "2026-11-12",
        "start_time": "05:30",
        "end_time": "05:50",
        "status": "missed",
        "reminder_enabled": true,
        "created_at": "2026-11-11T21:00:00.000000Z",
        "updated_at": "2026-11-12T06:00:00.000000Z"
      }
    ],
    "stats": {
      "total": 2485,
      "completed": 1842,
      "pending": 512,
      "missed": 131
    }
  },
  "message": "Activities retrieved.",
  "meta": {
    "current_page": 1,
    "per_page": 50,
    "total": 1,
    "last_page": 1
  }
}
```

#### Complete activity on behalf of a member

`POST /admin/activities/{activity}/complete` — Admin. Sets the activity status to
`completed` regardless of its current status.

```bash
curl -i -X POST "$BASE/admin/activities/4821/complete" \
  -H "Accept: application/json" \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

**Response `200`:**

```json
{
  "success": true,
  "data": {
    "activity": {
      "id": 4821,
      "uuid": "9e8d7c6b-5a49-4382-9170-abcdef123456",
      "user_id": 128,
      "user_name": "Amina Yusuf",
      "user_email": "amina@example.com",
      "title": "Fajr prayer",
      "description": "Congregation at the masjid",
      "activity_type": "prayer",
      "scheduled_date": "2026-11-12",
      "start_time": "05:30",
      "end_time": "05:50",
      "status": "completed",
      "reminder_enabled": true,
      "created_at": "2026-11-11T21:00:00.000000Z",
      "updated_at": "2026-11-13T09:45:00.000000Z"
    }
  },
  "message": "Activity marked as completed."
}
```

#### Export activities CSV

`GET /admin/activities/export` — Admin. Accepts the same filters as the list endpoint
except `per_page`.

| Query | Type | Notes |
|---|---|---|
| `q` | string | Matches title, description, member name, or email. |
| `type` | string | Activity type value. |
| `status` | enum | `pending`, `completed`, or `missed`. |
| `user_id` | integer | Must exist. |

```bash
curl -i "$BASE/admin/activities/export?status=completed&type=exercise" \
  -H "Accept: application/json" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -o activities.csv
```

**Response `200`:** `text/csv; charset=UTF-8`.

```csv
ID,Activity,Type,Date,Start,End,Status,Member,Email
4821,Fajr prayer,prayer,2026-11-12,05:30,05:50,completed,Amina Yusuf,amina@example.com
```

The filename is `activities-YYYY-MM-DD.csv`.

---


## Legacy endpoints

### Current user (unversioned)

`GET /user` — Sanctum. Returns the raw user model without the `success` envelope.

```bash
curl -i http://localhost:8082/api/v1/user \
  -H "Accept: application/json" \
  -H "Authorization: Bearer $TOKEN"
```

Prefer `GET /auth/me` for new clients.

---

## Endpoint reference

Every route registered in `apps/backend/routes/api.php`. Paths are relative to
`$BASE` (`/api/v1`).

**Auth legend:** `Public` = no authentication, `Bearer` = Sanctum (cookie or personal
access token), `Admin` = Sanctum plus `role:admin`.

### System and authentication

| Method | Path | Auth | Notes |
|---|---|---|---|
| `GET` | `/health` | Public | Alias of `/health/ready`. |
| `GET` | `/health/live` | Public | Liveness probe. |
| `GET` | `/health/ready` | Public | Readiness probe; `503` when degraded. |
| `POST` | `/auth/login` | Public | Rate limited: 5/min per email + IP. |
| `POST` | `/auth/register` | Public | Creates a member account. |
| `POST` | `/auth/forgot-password` | Public | Emails a 6-digit OTP. 5/min per email + IP. |
| `POST` | `/auth/reset-password` | Public | Consumes the OTP. 5/min per email + IP. |
| `GET` | `/auth/email/verify/{id}/{hash}` | Public | Signed verification link. |
| `POST` | `/tokens` | Public | Issue a personal access token. 5/min per email + IP. |
| `GET` | `/auth/me` | Bearer | Current user. |
| `PATCH` | `/auth/profile` | Bearer | Update name, email, phone, location, bio. |
| `PATCH` | `/auth/password` | Bearer | Change password; revokes other tokens. |
| `POST` | `/auth/logout` | Bearer | Revoke the current token / session. |
| `POST` | `/auth/email/verification-notification` | Bearer | Resend verification email. 6/min. |
| `GET` | `/user` | Bearer | Legacy current user, no envelope. |

### Personal access tokens

| Method | Path | Auth | Notes |
|---|---|---|---|
| `GET` | `/tokens` | Bearer | List the caller's tokens. |
| `DELETE` | `/tokens/current` | Bearer | Revoke the token used for the request. |
| `DELETE` | `/tokens/{id}` | Bearer | Revoke one of the caller's tokens. |

### Demo

| Method | Path | Auth | Notes |
|---|---|---|---|
| `GET` | `/tasks` | Bearer | Static demo task list. |
| `POST` | `/queue-test` | Bearer | Dispatch a job to the Redis queue. |
| `GET` | `/admin-check` | Admin | Verifies the `view-admin-dashboard` gate. |

### Activities

| Method | Path | Auth | Notes |
|---|---|---|---|
| `GET` | `/activities` | Bearer | Filters: `date`, `from`, `to`, `status`, `activity_type`, `search`, `per_page`. |
| `POST` | `/activities` | Bearer | Create an activity. |
| `GET` | `/activities/{activity}` | Bearer | Owner only. |
| `PUT`, `PATCH` | `/activities/{activity}` | Bearer | Owner only. |
| `DELETE` | `/activities/{activity}` | Bearer | Owner only. |
| `POST` | `/activities/{activity}/complete` | Bearer | Mark completed. |
| `GET` | `/activities/{activity}/reminders` | Bearer | List reminders. |
| `POST` | `/activities/{activity}/reminders` | Bearer | Create a reminder. |
| `PUT`, `PATCH` | `/activities/{activity}/reminders/{reminder}` | Bearer | Update a reminder. |
| `DELETE` | `/activities/{activity}/reminders/{reminder}` | Bearer | Delete a reminder. |

### Shared timetables

| Method | Path | Auth | Notes |
|---|---|---|---|
| `GET` | `/shared-timetables` | Bearer | Filters: `status`, `search`, `per_page`. Published timetables plus the caller's assignments. |
| `GET` | `/shared-timetables/{sharedTimetable}` | Bearer | Detail with activities. |
| `POST` | `/shared-timetables` | Admin | Create a timetable. |
| `PUT`, `PATCH` | `/shared-timetables/{sharedTimetable}` | Admin | Update a timetable. |
| `DELETE` | `/shared-timetables/{sharedTimetable}` | Admin | Delete a timetable. |
| `POST` | `/shared-timetables/{sharedTimetable}/publish` | Admin | Publish. |
| `GET` | `/shared-timetables/{sharedTimetable}/activities` | Bearer | List timetable activities. |
| `POST` | `/shared-timetables/{sharedTimetable}/activities` | Admin | Add an activity. |
| `PUT`, `PATCH` | `/shared-timetables/{sharedTimetable}/activities/{activity}` | Admin | Update an activity. |
| `DELETE` | `/shared-timetables/{sharedTimetable}/activities/{activity}` | Admin | Delete an activity. |
| `GET` | `/shared-timetables/{sharedTimetable}/assignments` | Bearer | List assignments. |
| `POST` | `/shared-timetables/{sharedTimetable}/assignments` | Admin | Assign users or groups. |
| `DELETE` | `/shared-timetables/{sharedTimetable}/assignments/{assignment}` | Admin | Remove an assignment. |
| `POST` | `/shared-timetables/{sharedTimetable}/activities/{activity}/completions` | Bearer | Record a completion for the caller. |

### Shared activity completions

| Method | Path | Auth | Notes |
|---|---|---|---|
| `GET` | `/shared-activity-completions` | Bearer | Filters by date, timetable, status. |
| `PUT`, `PATCH` | `/shared-activity-completions/{sharedActivityCompletion}` | Bearer | Owner only. |
| `DELETE` | `/shared-activity-completions/{sharedActivityCompletion}` | Bearer | Owner only. |

### Habits

| Method | Path | Auth | Notes |
|---|---|---|---|
| `GET` | `/habits` | Bearer | Filters: `is_active`, `search`, `per_page`. |
| `POST` | `/habits` | Bearer | Create a habit. |
| `GET` | `/habits/{habit}` | Bearer | Owner only. |
| `PUT`, `PATCH` | `/habits/{habit}` | Bearer | Owner only. |
| `DELETE` | `/habits/{habit}` | Bearer | Owner only. |
| `POST` | `/habits/{habit}/toggle` | Bearer | Toggle today's completion. |
| `GET` | `/habits/{habit}/records` | Bearer | Habit records for this habit. |
| `POST` | `/habits/{habit}/records` | Bearer | Create a record. |
| `GET` | `/habits/{habit}/streak` | Bearer | Current and longest streak. |

### Habit records

| Method | Path | Auth | Notes |
|---|---|---|---|
| `GET` | `/habit-records` | Bearer | Filters: `habit_id`, `from`, `to`, `per_page`. |
| `GET` | `/habit-records/{habitRecord}` | Bearer | Owner only. |
| `PUT`, `PATCH` | `/habit-records/{habitRecord}` | Bearer | Owner only. |
| `DELETE` | `/habit-records/{habitRecord}` | Bearer | Owner only. |

### Goals

| Method | Path | Auth | Notes |
|---|---|---|---|
| `GET` | `/goals` | Bearer | Filters: `status`, `search`, `from`, `to`, `per_page`. |
| `POST` | `/goals` | Bearer | Create a goal. |
| `GET` | `/goals/{goal}` | Bearer | Owner only. |
| `PUT`, `PATCH` | `/goals/{goal}` | Bearer | Owner only. |
| `DELETE` | `/goals/{goal}` | Bearer | Owner only. |
| `PUT`, `PATCH` | `/goals/{goal}/progress` | Bearer | Update `current_value` / `status`. |

### Daily reports

| Method | Path | Auth | Notes |
|---|---|---|---|
| `GET` | `/daily-reports` | Bearer | Filters: `from`, `to`, `per_page`; admins may add `all=1` and `user_id`. |
| `POST` | `/daily-reports` | Bearer | One report per date. |
| `GET` | `/daily-reports/{dailyReport}` | Bearer | Owner or admin. |
| `PUT`, `PATCH` | `/daily-reports/{dailyReport}` | Bearer | Owner only. |
| `DELETE` | `/daily-reports/{dailyReport}` | Bearer | Owner only. |
| `GET` | `/daily-reports/{dailyReport}/comments` | Bearer | List comments. |
| `POST` | `/daily-reports/{dailyReport}/comments` | Admin | Add feedback. |
| `DELETE` | `/daily-reports/{dailyReport}/comments/{comment}` | Bearer | Admin or comment author. |

### User documents

| Method | Path | Auth | Notes |
|---|---|---|---|
| `GET` | `/documents` | Bearer | Filters: `search`, `category`, `per_page`. |
| `POST` | `/documents` | Bearer | `multipart/form-data` upload. |
| `GET` | `/documents/{document}` | Bearer | Owner only. |
| `PUT`, `PATCH` | `/documents/{document}` | Bearer | Owner only; optional replacement file. |
| `DELETE` | `/documents/{document}` | Bearer | Owner only. |
| `GET` | `/documents/{document}/download` | Bearer | Streams the file. |

### Library resources

| Method | Path | Auth | Notes |
|---|---|---|---|
| `GET` | `/library` | Bearer | Filters: `search`, `status`, `per_page`. Only resources the caller may see. |
| `GET` | `/library/{libraryResource}` | Bearer | Detail; permission enforced. |
| `GET` | `/library/{libraryResource}/download` | Bearer | Streams the file. |
| `POST` | `/library` | Admin | Upload a resource. |
| `PUT`, `PATCH` | `/library/{libraryResource}` | Admin | Update a resource. |
| `DELETE` | `/library/{libraryResource}` | Admin | Delete a resource. |
| `GET` | `/library/{libraryResource}/permissions` | Admin | List explicit permissions. |
| `POST` | `/library/{libraryResource}/permissions` | Admin | Grant a user permission. |
| `DELETE` | `/library/{libraryResource}/permissions/{permission}` | Admin | Revoke a permission. |

### Bookmarks

| Method | Path | Auth | Notes |
|---|---|---|---|
| `GET` | `/bookmarks` | Bearer | List bookmarks with target summaries. |
| `POST` | `/bookmarks` | Bearer | Bookmark a visible library resource. |
| `DELETE` | `/bookmarks/{bookmark}` | Bearer | Owner only. |

### Notifications

| Method | Path | Auth | Notes |
|---|---|---|---|
| `GET` | `/notifications` | Bearer | Filters: `unread`, `type`, `per_page`. |
| `GET` | `/notifications/unread-count` | Bearer | Unread badge count. |
| `POST` | `/notifications/read-all` | Bearer | Mark every notification read. |
| `GET` | `/notifications/{notification}` | Bearer | Owner only. |
| `POST` | `/notifications/{notification}/read` | Bearer | Mark one read. |
| `DELETE` | `/notifications/{notification}` | Bearer | Owner only. |

### Device tokens

| Method | Path | Auth | Notes |
|---|---|---|---|
| `GET` | `/device-tokens` | Bearer | List active tokens. |
| `POST` | `/device-tokens` | Bearer | Register or refresh a token. |
| `DELETE` | `/device-tokens/{deviceToken}` | Bearer | Deactivate a token. |

### Health records

| Method | Path | Auth | Notes |
|---|---|---|---|
| `GET` | `/health-records` | Bearer | Filters: `from`, `to`, `per_page`. |
| `POST` | `/health-records` | Bearer | Create a record. |
| `GET` | `/health-records/summary` | Bearer | Aggregated averages and trends. |
| `GET` | `/health-records/{healthRecord}` | Bearer | Owner only. |
| `PUT`, `PATCH` | `/health-records/{healthRecord}` | Bearer | Owner only. |
| `DELETE` | `/health-records/{healthRecord}` | Bearer | Owner only. |

### Exercise records

| Method | Path | Auth | Notes |
|---|---|---|---|
| `GET` | `/exercise-records` | Bearer | Filters: `activity_id`, `exercise_type`, `from`, `to`, `per_page`. |
| `POST` | `/exercise-records` | Bearer | Create a record. |
| `GET` | `/exercise-records/{exerciseRecord}` | Bearer | Owner only. |
| `PUT`, `PATCH` | `/exercise-records/{exerciseRecord}` | Bearer | Owner only. |
| `DELETE` | `/exercise-records/{exerciseRecord}` | Bearer | Owner only. |

### Offline synchronization

| Method | Path | Auth | Notes |
|---|---|---|---|
| `POST` | `/sync/push` | Bearer | Apply a batch of client operations. |
| `GET` | `/sync/pull` | Bearer | Pull changes since a cursor. |
| `GET` | `/sync/conflicts` | Bearer | List unresolved conflicts. |
| `POST` | `/sync/conflicts/{syncConflict}/resolve` | Bearer | Resolve with a policy. |
| `GET` | `/sync/operations` | Bearer | History of applied operations. |

### Admin

| Method | Path | Auth | Notes |
|---|---|---|---|
| `GET` | `/admin/dashboard` | Admin | Aggregate dashboard snapshot. |
| `GET` | `/admin/search` | Admin | Global search; `q` min 2 chars. |
| `GET` | `/admin/analytics` | Admin | `range=7\|30\|90`, default 30. |
| `GET` | `/admin/analytics/export` | Admin | CSV of activity counts per type. |
| `GET` | `/admin/users` | Admin | Filters: `q`, `role`, `status`, `group_id`, `per_page`. |
| `POST` | `/admin/users` | Admin | Create a member and send an invitation. |
| `GET` | `/admin/users/{user}` | Admin | User + 25 recent reports and activities. |
| `PUT`, `PATCH` | `/admin/users/{user}` | Admin | Update profile, role, status, group. |
| `POST` | `/admin/users/{user}/toggle-status` | Admin | Flip `is_active`. |
| `POST` | `/admin/users/{user}/toggle-suspension` | Admin | Suspend or reinstate. |
| `GET` | `/admin/users/export` | Admin | Users CSV. |
| `GET` | `/admin/groups` | Admin | Filters: `q`, `per_page` (default 9). |
| `POST` | `/admin/groups` | Admin | Create a group. |
| `GET` | `/admin/groups/{group}` | Admin | Group with expanded members. |
| `PUT`, `PATCH` | `/admin/groups/{group}` | Admin | Update group and member list. |
| `GET` | `/admin/groups/export` | Admin | Groups CSV. |
| `GET` | `/admin/reports` | Admin | Filters: `q`, `status`, `date`, `user_id`, `per_page`. |
| `GET` | `/admin/reports/{report}` | Admin | Report + member + comments. |
| `PATCH` | `/admin/reports/{report}/status` | Admin | Set `submitted`, `reviewed`, or `flagged`. |
| `POST` | `/admin/reports/{report}/comments` | Admin | Add feedback and notify the author. |
| `GET` | `/admin/reports/export` | Admin | Reports CSV. |
| `GET` | `/admin/activities` | Admin | Filters: `q`, `type`, `status`, `user_id`, `per_page`. |
| `POST` | `/admin/activities/{activity}/complete` | Admin | Complete on behalf of the owner. |
| `GET` | `/admin/activities/export` | Admin | Activities CSV. |

---

## Common error responses

All errors use the standard error envelope. `errors` is present only for validation
failures.

### `401 Unauthorized`

Missing, expired, or revoked credentials.

```json
{
  "success": false,
  "data": null,
  "message": "Unauthenticated."
}
```

### `403 Forbidden`

The caller is authenticated but lacks the required role, or the account is suspended.

```json
{
  "success": false,
  "data": null,
  "message": "This action is unauthorized."
}
```

Suspended members receive a specific message:

```json
{
  "success": false,
  "data": null,
  "message": "Your account has been suspended. Please contact an administrator."
}
```

### `404 Not Found`

The record does not exist, **or** it exists but is owned by another member. Ownership
violations are deliberately reported as `404` rather than `403`.

```json
{
  "success": false,
  "data": null,
  "message": "Resource not found."
}
```

### `422 Unprocessable Content`

Validation failed, or the request violates a business rule (for example, an administrator
changing their own status).

```json
{
  "success": false,
  "data": null,
  "message": "The given data was invalid.",
  "errors": {
    "email": ["The email has already been taken."],
    "scheduled_date": ["The scheduled date field is required."]
  }
}
```

Business-rule errors from admin actions omit `errors`:

```json
{
  "success": false,
  "data": null,
  "message": "You cannot change the status of your own account."
}
```

### `429 Too Many Requests`

Authentication and token issuance are limited to **5 requests per minute** per lowercased
email plus client IP. Resending a verification email is limited to **6 per minute**.

```json
{
  "success": false,
  "data": null,
  "message": "Too many login attempts. Please try again later."
}
```

Token issuance uses `"Too many token generation attempts. Please try again later."`.
The `Retry-After` and `X-RateLimit-*` headers describe the window.

### `503 Service Unavailable`

Returned by `/health/ready` (and therefore `/health`) when a dependency is down.

```json
{
  "status": "degraded",
  "timestamp": "2026-11-13T10:00:00.000000+00:00",
  "environment": "production",
  "services": {
    "database": { "status": "down", "error": "Database service unavailable." },
    "redis": { "status": "up" }
  }
}
```

The readiness payload does **not** use the `success` envelope. In non-production
environments with `APP_DEBUG=true` it also includes a `version` object.

---

## Reference

### Activity statuses

| Value | Meaning |
|---|---|
| `pending` | Scheduled and not yet completed. |
| `completed` | Marked done by the member or an administrator. |
| `missed` | The scheduled window passed without completion. |

### Activity types

| Value | Meaning |
|---|---|
| `prayer` | Prayer block. |
| `quran` | Qur'an recitation or memorisation. |
| `tafseer` | Tafseer study. |
| `reading` | General reading. |
| `habit` | Habit-linked block. |
| `goal` | Goal-linked block. |
| `exercise` | Physical exercise. |
| `personal` | Personal task. |
| `other` | Anything else (database default). |

### Goal statuses

| Value |
|---|
| `not_started` |
| `in_progress` |
| `completed` |
| `paused` |

### Reminder channels

| Value | Meaning |
|---|---|
| `local` | On-device notification. |
| `push` | Push notification via a registered device token. |
| `email` | Email reminder. |

### Timetable statuses

| Value | Meaning |
|---|---|
| `draft` | Editable and hidden from members. |
| `published` | Visible to assigned members. |
| `archived` | Retained but no longer active. |

### Library visibility

| Value | Meaning |
|---|---|
| `private` | Administrators only. |
| `assigned` | Members with an explicit permission grant. |
| `public` | Every authenticated member. |

### Sync entity types

| Value |
|---|
| `habit` |
| `habit_record` |
| `goal` |
| `shared_activity_completion` |
| `journal_entries` |
| `daily_reports` |
| `exercise_records` |
| `health_records` |

### Sync statuses

| Value |
|---|
| `pending` |
| `synced` |
| `failed` |

### Conflict resolution policies

| Value | Meaning |
|---|---|
| `client_wins` | Keep the incoming client payload. |
| `server_wins` | Keep the stored server record. |
| `latest_wins` | Keep whichever `updated_at` is newer. |
| `manual` | Leave the conflict open for explicit resolution. |

### Prayer calculation methods

| Value |
|---|
| `muslim_world_league` |
| `egyptian` |
| `karachi` |
| `umm_al_qura` |
| `dubai` |
| `moonsighting_committee` |
| `north_america` |
| `kuwait` |
| `qatar` |
| `singapore` |
| `tehran` |
| `turkey` |
| `other` |

### Notification types

| Value | Trigger |
|---|---|
| `activity_reminder` | An activity reminder fires. |
| `shared_activity_assigned` | An administrator assigns a shared timetable activity. |
| `daily_report_comment` | A report receives administrator feedback. |
| `goal_achieved` | A goal reaches 100%. |
| `habit_reminder` | A habit reminder fires. |
| `system` | Platform-level notices. |

### User roles

| Value | Meaning |
|---|---|
| `user` | Standard member. |
| `admin` | Full administrative access. |

---

_End of API reference._
