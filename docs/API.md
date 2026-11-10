# ThinkCode API

REST API for the ThinkCode full-stack template. All endpoints are prefixed with `/api/v1`.

## Base URLs

| Environment | Base URL |
|---|---|
| Docker (nginx gateway) | `http://localhost:8082/api/v1` |
| Backend (PHP-FPM / artisan serve) | `http://localhost:8000/api/v1` |

> After changing `FORWARD_HTTP_PORT`, update the URLs above accordingly (currently `8082`).
>
> Every example below uses `http://localhost:8082`. Replace `8082` with `8000` when calling
> `php artisan serve` directly.


## Conventions

- Requests/responses use `Content-Type: application/json` and `Accept: application/json`.
- File uploads use `multipart/form-data` (`-F` in curl) and must **not** set `Content-Type` manually.
- Success envelope: `{ "success": true, "data": ..., "message": "..." }`
- Error envelope: `{ "success": false, "data": null, "message": "...", "errors": { ... } }`
- Paginated endpoints return an array in `data` plus `meta`:

  ```json
  {
    "success": true,
    "data": [],
    "message": "Activities retrieved.",
    "meta": { "current_page": 1, "per_page": 20, "total": 0, "last_page": 1 }
  }
  ```

- Authenticated endpoints accept either:
  - **Bearer token**: `Authorization: Bearer <token>` (from `POST /api/v1/auth/login` or `POST /api/v1/tokens`), or
  - **SPA cookie session**: Sanctum cookie auth via the frontend origin.
- Rate limits (per minute, keyed by email + IP):
  - `POST /auth/login`, `/auth/forgot-password`, `/auth/reset-password`: **5/min**
  - `POST /auth/email/verification-notification`: **6/min**
  - `POST /tokens`: **5/min**
- Enum values are listed in [Reference](#reference) at the end of this document.

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

### SPA cookie authentication (Sanctum)

The frontend normally authenticates with the Sanctum cookie flow. When testing by hand:

```bash
# 1. Obtain the XSRF-TOKEN cookie
curl -i -c cookies.txt http://localhost:8082/sanctum/csrf-cookie

# 2. Read and URL-decode the token into a header variable
XSRF=$(grep XSRF-TOKEN cookies.txt | awk '{print $7}' | python3 -c 'import sys,urllib.parse; print(urllib.parse.unquote(sys.stdin.read().strip()))')

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

---

## Health

> Health endpoints return plain JSON (no `success` envelope).

### Check service health

```bash
curl -i http://localhost:8082/api/v1/health
```

### Liveness probe

```bash
curl -i http://localhost:8082/api/v1/health/live
```

### Readiness probe

```bash
curl -i http://localhost:8082/api/v1/health/ready
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

---

## Authentication

### Login

```bash
curl -i -X POST http://localhost:8082/api/v1/auth/login \
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
      "role": "user",
      "roles": ["user"],
      "is_active": true,
      "email_verified": true,
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
    "abilities": ["profile:read", "profile:update", "activities:read", "activities:write"]
  },
  "message": "Authentication successful."
}
```

### Register

```bash
curl -i -X POST http://localhost:8082/api/v1/auth/register \
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
      "role": "user",
      "roles": ["user"],
      "is_active": true,
      "email_verified": false,
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

> Registration also emails a signed verification link. Opening it verifies the address and
> redirects to `FRONTEND_URL/login?verified=1` (or `?verified=0` for an invalid/expired link).

### Verify email (signed link)

Open the link from the verification email in a browser:

```bash
curl -i -L "http://localhost:8082/api/v1/auth/email/verify/2/<sha1-hash>?expires=...&signature=..."
```

On success the endpoint redirects to `FRONTEND_URL/login?verified=1` and sets
`email_verified_at`. Invalid or expired links redirect to `?verified=0`.

### Resend email verification

```bash
curl -i -X POST http://localhost:8082/api/v1/auth/email/verification-notification \
  -H "Accept: application/json" \
  -H "Authorization: Bearer <token>"
```

**Response `200`:**

```json
{
  "success": true,
  "data": null,
  "message": "Verification email sent."
}
```

> Already-verified accounts receive `200` with `"Email address is already verified."`.

### Forgot password (email OTP)

```bash
curl -i -X POST http://localhost:8082/api/v1/auth/forgot-password \
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
  "data": { "email": "developer@thinkcode.dev", "reset_token": "123456" },
  "message": "If the account exists, a one-time code has been sent."
}
```

> A six-digit one-time code is emailed to the account. `reset_token` (the same code) is only
> returned outside production for local testing.

### Reset password

```bash
curl -i -X POST http://localhost:8082/api/v1/auth/reset-password \
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

### Current user

```bash
curl -i http://localhost:8082/api/v1/auth/me \
  -H "Accept: application/json" \
  -H "Authorization: Bearer <token>"
```

### Update profile

```bash
curl -i -X PATCH http://localhost:8082/api/v1/auth/profile \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{
    "name": "Ada Lovelace",
    "timezone": "Europe/London",
    "calculation_method": "muslim_world_league",
    "latitude": 51.5074,
    "longitude": -0.1278,
    "notifications_enabled": true
  }'
```

### Logout

```bash
curl -i -X POST http://localhost:8082/api/v1/auth/logout \
  -H "Accept: application/json" \
  -H "Authorization: Bearer <token>"
```

**Response `200`:**

```json
{
  "success": true,
  "data": null,
  "message": "Logged out successfully."
}
```

> Logout revokes the current personal access token and invalidates the SPA session when present.

---

## Personal access tokens

> Token endpoints return plain JSON (no `success` envelope).

### Issue token

```bash
curl -i -X POST http://localhost:8082/api/v1/tokens \
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

> Omit `abilities` to grant `["*"]`. Tokens expire after `SANCTUM_TOKEN_EXPIRATION`
> minutes (default `10080`, i.e. 7 days).

### List tokens

```bash
curl -i http://localhost:8082/api/v1/tokens \
  -H "Accept: application/json" \
  -H "Authorization: Bearer <token>"
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

```bash
curl -i -X DELETE http://localhost:8082/api/v1/tokens/current \
  -H "Accept: application/json" \
  -H "Authorization: Bearer <token>"
```

### Revoke token by id

```bash
curl -i -X DELETE http://localhost:8082/api/v1/tokens/<token-id> \
  -H "Accept: application/json" \
  -H "Authorization: Bearer <token>"
```

---

## Activities

### List activities

Supported filters: `date`, `from`, `to`, `status`, `activity_type`, `search`, `per_page`.

```bash
curl -i "http://localhost:8082/api/v1/activities?from=2026-11-01&to=2026-11-30&status=pending&activity_type=prayer&per_page=50" \
  -H "Accept: application/json" \
  -H "Authorization: Bearer <token>"
```

### Create activity

```bash
curl -i -X POST http://localhost:8082/api/v1/activities \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -H "Authorization: Bearer <token>" \
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

### Get activity

```bash
curl -i http://localhost:8082/api/v1/activities/<activity-id> \
  -H "Accept: application/json" \
  -H "Authorization: Bearer <token>"
```

### Update activity

```bash
curl -i -X PATCH http://localhost:8082/api/v1/activities/<activity-id> \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{
    "title": "Morning run (updated)",
    "status": "completed"
  }'
```

### Delete activity

```bash
curl -i -X DELETE http://localhost:8082/api/v1/activities/<activity-id> \
  -H "Accept: application/json" \
  -H "Authorization: Bearer <token>"
```

### Complete activity

```bash
curl -i -X POST http://localhost:8082/api/v1/activities/<activity-id>/complete \
  -H "Accept: application/json" \
  -H "Authorization: Bearer <token>"
```

### List activity reminders

```bash
curl -i http://localhost:8082/api/v1/activities/<activity-id>/reminders \
  -H "Accept: application/json" \
  -H "Authorization: Bearer <token>"
```

### Create activity reminder

```bash
curl -i -X POST http://localhost:8082/api/v1/activities/<activity-id>/reminders \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{
    "reminder_at": "2026-11-10T07:00:00Z",
    "channel": "push",
    "is_enabled": true
  }'
```

### Update activity reminder

```bash
curl -i -X PUT http://localhost:8082/api/v1/activities/<activity-id>/reminders/<reminder-id> \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{
    "reminder_at": "2026-11-10T07:30:00Z",
    "is_enabled": false
  }'
```

### Delete activity reminder

```bash
curl -i -X DELETE http://localhost:8082/api/v1/activities/<activity-id>/reminders/<reminder-id> \
  -H "Accept: application/json" \
  -H "Authorization: Bearer <token>"
```

---

## Shared timetables

### List shared timetables

Supported filters: `status` (admin only), `search`, `per_page`.

```bash
curl -i "http://localhost:8082/api/v1/shared-timetables?status=published&search=team&per_page=20" \
  -H "Accept: application/json" \
  -H "Authorization: Bearer <token>"
```

### Get shared timetable

```bash
curl -i http://localhost:8082/api/v1/shared-timetables/<shared-timetable-id> \
  -H "Accept: application/json" \
  -H "Authorization: Bearer <token>"
```

### Create shared timetable (admin)

```bash
curl -i -X POST http://localhost:8082/api/v1/shared-timetables \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{
    "title": "Team schedule",
    "description": "November rotation",
    "start_date": "2026-11-01",
    "end_date": "2026-11-30",
    "status": "draft"
  }'
```

### Update shared timetable (admin)

```bash
curl -i -X PATCH http://localhost:8082/api/v1/shared-timetables/<shared-timetable-id> \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{
    "title": "Team schedule (updated)",
    "end_date": "2026-12-31"
  }'
```

### Delete shared timetable (admin)

```bash
curl -i -X DELETE http://localhost:8082/api/v1/shared-timetables/<shared-timetable-id> \
  -H "Accept: application/json" \
  -H "Authorization: Bearer <token>"
```

### Publish shared timetable (admin)

```bash
curl -i -X POST http://localhost:8082/api/v1/shared-timetables/<shared-timetable-id>/publish \
  -H "Accept: application/json" \
  -H "Authorization: Bearer <token>"
```

### List shared timetable activities

```bash
curl -i http://localhost:8082/api/v1/shared-timetables/<shared-timetable-id>/activities \
  -H "Accept: application/json" \
  -H "Authorization: Bearer <token>"
```

### Create shared timetable activity (admin)

```bash
curl -i -X POST http://localhost:8082/api/v1/shared-timetables/<shared-timetable-id>/activities \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -H "Authorization: Bearer <token>" \
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

> `activity_date` must fall between the timetable `start_date` and `end_date`.

### Update shared timetable activity (admin)

```bash
curl -i -X PUT http://localhost:8082/api/v1/shared-timetables/<shared-timetable-id>/activities/<activity-id> \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{
    "description": "Extra context",
    "sort_order": 2
  }'
```

### Delete shared timetable activity (admin)

```bash
curl -i -X DELETE http://localhost:8082/api/v1/shared-timetables/<shared-timetable-id>/activities/<activity-id> \
  -H "Accept: application/json" \
  -H "Authorization: Bearer <token>"
```

### List shared timetable assignments

```bash
curl -i http://localhost:8082/api/v1/shared-timetables/<shared-timetable-id>/assignments \
  -H "Accept: application/json" \
  -H "Authorization: Bearer <token>"
```

### Add assignment (admin)

Assign either a user **or** a group (`user_id` and `group_id` are mutually exclusive):

```bash
curl -i -X POST http://localhost:8082/api/v1/shared-timetables/<shared-timetable-id>/assignments \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{ "user_id": 1 }'
```

```bash
curl -i -X POST http://localhost:8082/api/v1/shared-timetables/<shared-timetable-id>/assignments \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{ "group_id": 1 }'
```

### Delete assignment (admin)

```bash
curl -i -X DELETE http://localhost:8082/api/v1/shared-timetables/<shared-timetable-id>/assignments/<assignment-id> \
  -H "Accept: application/json" \
  -H "Authorization: Bearer <token>"
```

### Record a shared activity completion

```bash
curl -i -X POST http://localhost:8082/api/v1/shared-timetables/<shared-timetable-id>/activities/<activity-id>/completions \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{
    "status": "completed",
    "completed_at": "2026-11-10T18:30:00Z",
    "notes": "Finished early"
  }'
```

### List shared activity completions

Supported filters: `from`, `to`, `status`, `per_page`.

```bash
curl -i "http://localhost:8082/api/v1/shared-activity-completions?from=2026-11-01&to=2026-11-30&status=completed" \
  -H "Accept: application/json" \
  -H "Authorization: Bearer <token>"
```

### Update completion

```bash
curl -i -X PUT http://localhost:8082/api/v1/shared-activity-completions/<completion-id> \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{
    "status": "completed",
    "completed_at": "2026-11-10T19:00:00Z",
    "notes": "Completed with the group"
  }'
```

### Delete completion

```bash
curl -i -X DELETE http://localhost:8082/api/v1/shared-activity-completions/<completion-id> \
  -H "Accept: application/json" \
  -H "Authorization: Bearer <token>"
```

---

## Habits

### List habits

Supported filters: `is_active`, `search`, `per_page`.

```bash
curl -i "http://localhost:8082/api/v1/habits?is_active=true&search=meditation" \
  -H "Accept: application/json" \
  -H "Authorization: Bearer <token>"
```

### Create habit

```bash
curl -i -X POST http://localhost:8082/api/v1/habits \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{
    "name": "Morning meditation",
    "description": "10 minutes after Fajr",
    "is_active": true
  }'
```

### Get habit

```bash
curl -i http://localhost:8082/api/v1/habits/<habit-id> \
  -H "Accept: application/json" \
  -H "Authorization: Bearer <token>"
```

### Update habit

```bash
curl -i -X PATCH http://localhost:8082/api/v1/habits/<habit-id> \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{
    "name": "Morning meditation (updated)",
    "is_active": false
  }'
```

### Delete habit

```bash
curl -i -X DELETE http://localhost:8082/api/v1/habits/<habit-id> \
  -H "Accept: application/json" \
  -H "Authorization: Bearer <token>"
```

### Toggle habit

Toggles today's status, or explicitly sets a status/date when supplied:

```bash
curl -i -X POST http://localhost:8082/api/v1/habits/<habit-id>/toggle \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{
    "record_date": "2026-11-09",
    "status": "completed",
    "notes": "Felt good"
  }'
```

### List habit records (`/habits/{id}/records`)

```bash
curl -i http://localhost:8082/api/v1/habits/<habit-id>/records \
  -H "Accept: application/json" \
  -H "Authorization: Bearer <token>"
```

### Create habit record (`/habits/{id}/records`)

```bash
curl -i -X POST http://localhost:8082/api/v1/habits/<habit-id>/records \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{
    "record_date": "2026-11-09",
    "status": "completed",
    "notes": "Felt good"
  }'
```

### Get habit streak

```bash
curl -i http://localhost:8082/api/v1/habits/<habit-id>/streak \
  -H "Accept: application/json" \
  -H "Authorization: Bearer <token>"
```

**Response `200`:**

```json
{
  "success": true,
  "data": { "habit_id": 1, "streak": 4 },
  "message": "OK"
}
```

---

## Habit records

### List habit records

```bash
curl -i "http://localhost:8082/api/v1/habit-records?per_page=50" \
  -H "Accept: application/json" \
  -H "Authorization: Bearer <token>"
```

### Get habit record

```bash
curl -i http://localhost:8082/api/v1/habit-records/<habit-record-id> \
  -H "Accept: application/json" \
  -H "Authorization: Bearer <token>"
```

### Update habit record

```bash
curl -i -X PATCH http://localhost:8082/api/v1/habit-records/<habit-record-id> \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{
    "status": "pending",
    "notes": "Updated"
  }'
```

### Delete habit record

```bash
curl -i -X DELETE http://localhost:8082/api/v1/habit-records/<habit-record-id> \
  -H "Accept: application/json" \
  -H "Authorization: Bearer <token>"
```

---

## Goals

### List goals

Supported filters: `status`, `search`, `from`, `to` (target date range), `per_page`.

```bash
curl -i "http://localhost:8082/api/v1/goals?status=in_progress&search=marathon" \
  -H "Accept: application/json" \
  -H "Authorization: Bearer <token>"
```

### Create goal

```bash
curl -i -X POST http://localhost:8082/api/v1/goals \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{
    "title": "Run a marathon",
    "description": "Train consistently for 16 weeks",
    "target_date": "2027-03-01",
    "progress": 10,
    "status": "in_progress"
  }'
```

### Get goal

```bash
curl -i http://localhost:8082/api/v1/goals/<goal-id> \
  -H "Accept: application/json" \
  -H "Authorization: Bearer <token>"
```

### Update goal

```bash
curl -i -X PATCH http://localhost:8082/api/v1/goals/<goal-id> \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{
    "title": "Run a marathon (updated)",
    "target_date": "2027-04-01"
  }'
```

### Update goal progress

```bash
curl -i -X PATCH http://localhost:8082/api/v1/goals/<goal-id>/progress \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{
    "progress": 42,
    "status": "in_progress"
  }'
```

### Delete goal

```bash
curl -i -X DELETE http://localhost:8082/api/v1/goals/<goal-id> \
  -H "Accept: application/json" \
  -H "Authorization: Bearer <token>"
```

---

## Daily reports

### List daily reports

Supported filters: `user_id` and `all` (admin only), `from`, `to`, `per_page`.

```bash
curl -i "http://localhost:8082/api/v1/daily-reports?from=2026-11-01&to=2026-11-30" \
  -H "Accept: application/json" \
  -H "Authorization: Bearer <token>"
```

Admins can list every user's reports:

```bash
curl -i "http://localhost:8082/api/v1/daily-reports?all=1&user_id=2" \
  -H "Accept: application/json" \
  -H "Authorization: Bearer <admin-token>"
```

### Create daily report

```bash
curl -i -X POST http://localhost:8082/api/v1/daily-reports \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{
    "report_date": "2026-11-09",
    "summary": "Felt great",
    "self_assessment": "Good focus and energy"
  }'
```

> `report_date` must be today or earlier.

### Get daily report

```bash
curl -i http://localhost:8082/api/v1/daily-reports/<daily-report-id> \
  -H "Accept: application/json" \
  -H "Authorization: Bearer <token>"
```

### Update daily report

```bash
curl -i -X PATCH http://localhost:8082/api/v1/daily-reports/<daily-report-id> \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{
    "summary": "Updated summary",
    "self_assessment": "Better than yesterday"
  }'
```

### Delete daily report

```bash
curl -i -X DELETE http://localhost:8082/api/v1/daily-reports/<daily-report-id> \
  -H "Accept: application/json" \
  -H "Authorization: Bearer <token>"
```

> Reports for previous days are locked after submission.

### List daily report comments

```bash
curl -i http://localhost:8082/api/v1/daily-reports/<daily-report-id>/comments \
  -H "Accept: application/json" \
  -H "Authorization: Bearer <token>"
```

### Add daily report comment (admin)

```bash
curl -i -X POST http://localhost:8082/api/v1/daily-reports/<daily-report-id>/comments \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -H "Authorization: Bearer <admin-token>" \
  -d '{ "comment": "Nice work" }'
```

### Delete daily report comment

```bash
curl -i -X DELETE http://localhost:8082/api/v1/daily-reports/<daily-report-id>/comments/<comment-id> \
  -H "Accept: application/json" \
  -H "Authorization: Bearer <token>"
```

---

## User documents

### List documents

Supported filters: `category`, `search`, `per_page`.

```bash
curl -i "http://localhost:8082/api/v1/documents?category=reports&search=monthly" \
  -H "Accept: application/json" \
  -H "Authorization: Bearer <token>"
```

### Upload document

```bash
curl -i -X POST http://localhost:8082/api/v1/documents \
  -H "Accept: application/json" \
  -H "Authorization: Bearer <token>" \
  -F "title=Monthly report" \
  -F "description=November report" \
  -F "category=reports" \
  -F "is_private=1" \
  -F "file=@./report.pdf"
```

> Do not set `Content-Type` manually; curl sets the multipart boundary automatically.
> Maximum file size is 20 MB.

### Get document

```bash
curl -i http://localhost:8082/api/v1/documents/<document-id> \
  -H "Accept: application/json" \
  -H "Authorization: Bearer <token>"
```

### Download document

```bash
curl -L http://localhost:8082/api/v1/documents/<document-id>/download \
  -H "Authorization: Bearer <token>" \
  -o report.pdf
```

### Update document

```bash
curl -i -X PATCH http://localhost:8082/api/v1/documents/<document-id> \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{
    "title": "report-v2.pdf",
    "category": "archive",
    "is_private": true
  }'
```

### Delete document

```bash
curl -i -X DELETE http://localhost:8082/api/v1/documents/<document-id> \
  -H "Accept: application/json" \
  -H "Authorization: Bearer <token>"
```

---

## Library resources

### List library resources

Supported filters: `search`, `status` (`active`/`archived`), `per_page`.

```bash
curl -i "http://localhost:8082/api/v1/library?search=guide&status=active" \
  -H "Accept: application/json" \
  -H "Authorization: Bearer <token>"
```

### Get library resource

```bash
curl -i http://localhost:8082/api/v1/library/<library-resource-id> \
  -H "Accept: application/json" \
  -H "Authorization: Bearer <token>"
```

### Upload library resource (admin)

```bash
curl -i -X POST http://localhost:8082/api/v1/library \
  -H "Accept: application/json" \
  -H "Authorization: Bearer <admin-token>" \
  -F "title=Study guide" \
  -F "description=Beginner guide" \
  -F "visibility=assigned" \
  -F "status=active" \
  -F "file=@./guide.pdf"
```

> Maximum file size is 50 MB. `visibility` accepts `private`, `assigned`, or `public`.

### Update library resource (admin)

```bash
curl -i -X PATCH http://localhost:8082/api/v1/library/<library-resource-id> \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -H "Authorization: Bearer <admin-token>" \
  -d '{
    "title": "Study guide (updated)",
    "visibility": "public",
    "status": "archived"
  }'
```

### Delete library resource (admin)

```bash
curl -i -X DELETE http://localhost:8082/api/v1/library/<library-resource-id> \
  -H "Accept: application/json" \
  -H "Authorization: Bearer <admin-token>"
```

### Download library resource

```bash
curl -L http://localhost:8082/api/v1/library/<library-resource-id>/download \
  -H "Authorization: Bearer <token>" \
  -o guide.pdf
```

### List library resource permissions (admin)

```bash
curl -i http://localhost:8082/api/v1/library/<library-resource-id>/permissions \
  -H "Accept: application/json" \
  -H "Authorization: Bearer <admin-token>"
```

### Grant library resource permission (admin)

Grant to a user **or** a group (`user_id` and `group_id` are mutually exclusive):

```bash
curl -i -X POST http://localhost:8082/api/v1/library/<library-resource-id>/permissions \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -H "Authorization: Bearer <admin-token>" \
  -d '{ "user_id": 1 }'
```

```bash
curl -i -X POST http://localhost:8082/api/v1/library/<library-resource-id>/permissions \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -H "Authorization: Bearer <admin-token>" \
  -d '{ "group_id": 1 }'
```

### Revoke library resource permission (admin)

```bash
curl -i -X DELETE http://localhost:8082/api/v1/library/<library-resource-id>/permissions/<permission-id> \
  -H "Accept: application/json" \
  -H "Authorization: Bearer <admin-token>"
```

---

## Bookmarks

### List bookmarks

```bash
curl -i "http://localhost:8082/api/v1/bookmarks?per_page=50" \
  -H "Accept: application/json" \
  -H "Authorization: Bearer <token>"
```

### Create bookmark

```bash
curl -i -X POST http://localhost:8082/api/v1/bookmarks \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{ "library_resource_id": 1 }'
```

### Delete bookmark

```bash
curl -i -X DELETE http://localhost:8082/api/v1/bookmarks/<bookmark-id> \
  -H "Accept: application/json" \
  -H "Authorization: Bearer <token>"
```

---

## Notifications

### List notifications

Supported filters: `unread`, `type`, `per_page`.

```bash
curl -i "http://localhost:8082/api/v1/notifications?unread=1&per_page=50" \
  -H "Accept: application/json" \
  -H "Authorization: Bearer <token>"
```

### Get unread count

```bash
curl -i http://localhost:8082/api/v1/notifications/unread-count \
  -H "Accept: application/json" \
  -H "Authorization: Bearer <token>"
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

```bash
curl -i -X POST http://localhost:8082/api/v1/notifications/read-all \
  -H "Accept: application/json" \
  -H "Authorization: Bearer <token>"
```

### Get notification

```bash
curl -i http://localhost:8082/api/v1/notifications/<notification-id> \
  -H "Accept: application/json" \
  -H "Authorization: Bearer <token>"
```

### Mark notification as read

```bash
curl -i -X POST http://localhost:8082/api/v1/notifications/<notification-id>/read \
  -H "Accept: application/json" \
  -H "Authorization: Bearer <token>"
```

### Delete notification

```bash
curl -i -X DELETE http://localhost:8082/api/v1/notifications/<notification-id> \
  -H "Accept: application/json" \
  -H "Authorization: Bearer <token>"
```

---

## Device tokens

### List device tokens

Filter by `active`:

```bash
curl -i "http://localhost:8082/api/v1/device-tokens?active=1" \
  -H "Accept: application/json" \
  -H "Authorization: Bearer <token>"
```

### Register device token

```bash
curl -i -X POST http://localhost:8082/api/v1/device-tokens \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{
    "device_token": "fcm-or-apns-token",
    "device_type": "ios",
    "device_identifier": "iphone-15-pro"
  }'
```

> `device_type` accepts `android`, `ios`, `web`, or `other`.

### Deactivate device token

```bash
curl -i -X DELETE http://localhost:8082/api/v1/device-tokens/<device-token-id> \
  -H "Accept: application/json" \
  -H "Authorization: Bearer <token>"
```

---

## Health records

### List health records

```bash
curl -i "http://localhost:8082/api/v1/health-records?per_page=50" \
  -H "Accept: application/json" \
  -H "Authorization: Bearer <token>"
```

### Create health record

```bash
curl -i -X POST http://localhost:8082/api/v1/health-records \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -H "Authorization: Bearer <token>" \
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

### Get health record summary

```bash
curl -i http://localhost:8082/api/v1/health-records/summary \
  -H "Accept: application/json" \
  -H "Authorization: Bearer <token>"
```

### Get health record

```bash
curl -i http://localhost:8082/api/v1/health-records/<health-record-id> \
  -H "Accept: application/json" \
  -H "Authorization: Bearer <token>"
```

### Update health record

```bash
curl -i -X PATCH http://localhost:8082/api/v1/health-records/<health-record-id> \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{
    "water_ml": 2500,
    "notes": "Hydrated well"
  }'
```

### Delete health record

```bash
curl -i -X DELETE http://localhost:8082/api/v1/health-records/<health-record-id> \
  -H "Accept: application/json" \
  -H "Authorization: Bearer <token>"
```

---

## Exercise records

### List exercise records

```bash
curl -i "http://localhost:8082/api/v1/exercise-records?per_page=50" \
  -H "Accept: application/json" \
  -H "Authorization: Bearer <token>"
```

### Create exercise record

```bash
curl -i -X POST http://localhost:8082/api/v1/exercise-records \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{
    "exercise_type": "strength",
    "title": "Push ups",
    "duration_minutes": 15,
    "calories_burned": 90,
    "notes": "3 sets of 15",
    "recorded_at": "2026-11-09T10:00:00Z"
  }'
```

### Get exercise record

```bash
curl -i http://localhost:8082/api/v1/exercise-records/<exercise-record-id> \
  -H "Accept: application/json" \
  -H "Authorization: Bearer <token>"
```

### Update exercise record

```bash
curl -i -X PATCH http://localhost:8082/api/v1/exercise-records/<exercise-record-id> \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{
    "duration_minutes": 20,
    "notes": "4 sets of 15"
  }'
```

### Delete exercise record

```bash
curl -i -X DELETE http://localhost:8082/api/v1/exercise-records/<exercise-record-id> \
  -H "Accept: application/json" \
  -H "Authorization: Bearer <token>"
```

---

## Offline synchronization

### Push operations

```bash
curl -i -X POST http://localhost:8082/api/v1/sync/push \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -H "Authorization: Bearer <token>" \
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

> `operations` must contain 1–200 items. `conflict_policy` accepts `client_wins`,
> `server_wins`, `latest_wins`, or `manual`.

### Pull operations

```bash
curl -i "http://localhost:8082/api/v1/sync/pull?since=2026-11-01T00:00:00Z" \
  -H "Accept: application/json" \
  -H "Authorization: Bearer <token>"
```

### List sync conflicts

Supported filters: `status` (`pending`/`resolved`/`ignored`), `per_page`.

```bash
curl -i "http://localhost:8082/api/v1/sync/conflicts?status=pending" \
  -H "Accept: application/json" \
  -H "Authorization: Bearer <token>"
```

### Resolve sync conflict

```bash
curl -i -X POST http://localhost:8082/api/v1/sync/conflicts/<sync-conflict-id>/resolve \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{ "resolution_type": "client_wins" }'
```

### List sync operations

```bash
curl -i "http://localhost:8082/api/v1/sync/operations?per_page=50" \
  -H "Accept: application/json" \
  -H "Authorization: Bearer <token>"
```

---

## Demo & admin

### Get demo tasks

```bash
curl -i http://localhost:8082/api/v1/tasks \
  -H "Accept: application/json" \
  -H "Authorization: Bearer <token>"
```

### Queue background job (demo)

```bash
curl -i -X POST http://localhost:8082/api/v1/queue-test \
  -H "Accept: application/json" \
  -H "Authorization: Bearer <token>"
```

### Admin-only check

```bash
curl -i http://localhost:8082/api/v1/admin-check \
  -H "Accept: application/json" \
  -H "Authorization: Bearer <admin-token>"
```

---

## Legacy

### Current user (unversioned)

```bash
curl -i http://localhost:8082/api/v1/user \
  -H "Accept: application/json" \
  -H "Authorization: Bearer <token>"
```

---

## Endpoint reference

| Endpoint | Method | Auth | Description |
|---|---|---|---|
| `/api/v1/health` | GET | Public | Service health |
| `/api/v1/health/live` | GET | Public | Liveness |
| `/api/v1/health/ready` | GET | Public | Readiness |
| `/api/v1/auth/login` | POST | Public | Login (throttled 5/min) |
| `/api/v1/auth/register` | POST | Public | Register and send verification email |
| `/api/v1/auth/email/verify/{id}/{hash}` | GET | Signed URL | Verify email address |
| `/api/v1/auth/email/verification-notification` | POST | Sanctum | Resend verification email (throttled 6/min) |
| `/api/v1/auth/forgot-password` | POST | Public | Send password reset OTP (throttled 5/min) |
| `/api/v1/auth/reset-password` | POST | Public | Reset password with OTP (throttled 5/min) |
| `/api/v1/auth/me` | GET | Sanctum | Current user |
| `/api/v1/auth/profile` | PATCH | Sanctum | Update profile |
| `/api/v1/auth/logout` | POST | Sanctum | Logout |
| `/api/v1/tokens` | POST | Public | Issue personal access token (throttled 5/min) |
| `/api/v1/tokens` | GET | Sanctum | List tokens |
| `/api/v1/tokens/current` | DELETE | Sanctum | Revoke current token |
| `/api/v1/tokens/{id}` | DELETE | Sanctum | Revoke token by id |
| `/api/v1/activities` | GET/POST | Sanctum | List/create activities |
| `/api/v1/activities/{id}` | GET/PUT/PATCH/DELETE | Sanctum | Activity detail/update/delete |
| `/api/v1/activities/{id}/complete` | POST | Sanctum | Complete activity |
| `/api/v1/activities/{id}/reminders` | GET/POST | Sanctum | List/create reminders |
| `/api/v1/activities/{id}/reminders/{reminder}` | PUT/PATCH/DELETE | Sanctum | Update/delete reminder |
| `/api/v1/shared-timetables` | GET | Sanctum | List timetables |
| `/api/v1/shared-timetables` | POST | Admin | Create timetable |
| `/api/v1/shared-timetables/{id}` | GET | Sanctum | Timetable detail |
| `/api/v1/shared-timetables/{id}` | PUT/PATCH/DELETE | Admin | Update/delete timetable |
| `/api/v1/shared-timetables/{id}/publish` | POST | Admin | Publish timetable |
| `/api/v1/shared-timetables/{id}/activities` | GET | Sanctum | List timetable activities |
| `/api/v1/shared-timetables/{id}/activities` | POST | Admin | Create timetable activity |
| `/api/v1/shared-timetables/{id}/activities/{activity}` | PUT/PATCH/DELETE | Admin | Update/delete timetable activity |
| `/api/v1/shared-timetables/{id}/assignments` | GET | Sanctum | List assignments |
| `/api/v1/shared-timetables/{id}/assignments` | POST | Admin | Assign user/group |
| `/api/v1/shared-timetables/{id}/assignments/{assignment}` | DELETE | Admin | Remove assignment |
| `/api/v1/shared-timetables/{id}/activities/{activity}/completions` | POST | Sanctum | Record completion |
| `/api/v1/shared-activity-completions` | GET | Sanctum | List completions |
| `/api/v1/shared-activity-completions/{id}` | PUT/PATCH/DELETE | Sanctum | Update/delete completion |
| `/api/v1/habits` | GET/POST | Sanctum | List/create habits |
| `/api/v1/habits/{id}` | GET/PUT/PATCH/DELETE | Sanctum | Habit detail/update/delete |
| `/api/v1/habits/{id}/toggle` | POST | Sanctum | Toggle habit |
| `/api/v1/habits/{id}/records` | GET/POST | Sanctum | List/create habit records |
| `/api/v1/habits/{id}/streak` | GET | Sanctum | Habit streak |
| `/api/v1/habit-records` | GET | Sanctum | List habit records |
| `/api/v1/habit-records/{id}` | GET/PUT/PATCH/DELETE | Sanctum | Habit record detail/update/delete |
| `/api/v1/goals` | GET/POST | Sanctum | List/create goals |
| `/api/v1/goals/{id}` | GET/PUT/PATCH/DELETE | Sanctum | Goal detail/update/delete |
| `/api/v1/goals/{id}/progress` | PUT/PATCH | Sanctum | Update goal progress |
| `/api/v1/daily-reports` | GET/POST | Sanctum | List/create reports |
| `/api/v1/daily-reports/{id}` | GET/PUT/PATCH/DELETE | Sanctum | Report detail/update/delete |
| `/api/v1/daily-reports/{id}/comments` | GET | Sanctum | List comments |
| `/api/v1/daily-reports/{id}/comments` | POST | Admin | Add comment |
| `/api/v1/daily-reports/{id}/comments/{comment}` | DELETE | Sanctum | Delete comment |
| `/api/v1/documents` | GET/POST | Sanctum | List/upload documents |
| `/api/v1/documents/{id}` | GET/PUT/PATCH/DELETE | Sanctum | Document detail/update/delete |
| `/api/v1/documents/{id}/download` | GET | Sanctum | Download document |
| `/api/v1/library` | GET | Sanctum | List library resources |
| `/api/v1/library` | POST | Admin | Upload library resource |
| `/api/v1/library/{id}` | GET | Sanctum | Library resource detail |
| `/api/v1/library/{id}` | PUT/PATCH/DELETE | Admin | Update/delete library resource |
| `/api/v1/library/{id}/download` | GET | Sanctum | Download library resource |
| `/api/v1/library/{id}/permissions` | GET/POST | Admin | List/grant permissions |
| `/api/v1/library/{id}/permissions/{permission}` | DELETE | Admin | Revoke permission |
| `/api/v1/bookmarks` | GET/POST | Sanctum | List/create bookmarks |
| `/api/v1/bookmarks/{id}` | DELETE | Sanctum | Delete bookmark |
| `/api/v1/notifications` | GET | Sanctum | List notifications |
| `/api/v1/notifications/unread-count` | GET | Sanctum | Unread count |
| `/api/v1/notifications/read-all` | POST | Sanctum | Mark all as read |
| `/api/v1/notifications/{id}` | GET/DELETE | Sanctum | Notification detail/delete |
| `/api/v1/notifications/{id}/read` | POST | Sanctum | Mark as read |
| `/api/v1/device-tokens` | GET/POST | Sanctum | List/register device tokens |
| `/api/v1/device-tokens/{id}` | DELETE | Sanctum | Deactivate device token |
| `/api/v1/health-records` | GET/POST | Sanctum | List/create health records |
| `/api/v1/health-records/summary` | GET | Sanctum | Health record summary |
| `/api/v1/health-records/{id}` | GET/PUT/PATCH/DELETE | Sanctum | Health record detail/update/delete |
| `/api/v1/exercise-records` | GET/POST | Sanctum | List/create exercise records |
| `/api/v1/exercise-records/{id}` | GET/PUT/PATCH/DELETE | Sanctum | Exercise record detail/update/delete |
| `/api/v1/sync/push` | POST | Sanctum | Push offline operations |
| `/api/v1/sync/pull` | GET | Sanctum | Pull changes since timestamp |
| `/api/v1/sync/conflicts` | GET | Sanctum | List sync conflicts |
| `/api/v1/sync/conflicts/{id}/resolve` | POST | Sanctum | Resolve sync conflict |
| `/api/v1/sync/operations` | GET | Sanctum | List sync operations |
| `/api/v1/tasks` | GET | Sanctum | Demo tasks |
| `/api/v1/queue-test` | POST | Sanctum | Dispatch demo queue job |
| `/api/v1/admin-check` | GET | Admin | Admin-only check |
| `/api/v1/user` | GET | Sanctum | Legacy current-user endpoint |

---

## Common error responses

### Validation error `422`

```bash
curl -i -X POST http://localhost:8082/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -d '{ "email": "nobody@thinkcode.dev", "password": "wrong" }'
```

```json
{
  "success": false,
  "data": null,
  "message": "These credentials do not match our records.",
  "errors": { "email": ["These credentials do not match our records."] }
}
```

### Unauthenticated `401`

```json
{
  "success": false,
  "data": null,
  "message": "Unauthenticated."
}
```

### Forbidden `403`

```json
{
  "success": false,
  "data": null,
  "message": "This action is unauthorized."
}
```

### Not found `404`

```json
{
  "success": false,
  "data": null,
  "message": "Resource not found."
}
```

### Rate limited `429`

```json
{
  "success": false,
  "data": null,
  "message": "Too many login attempts. Please try again later."
}
```

> Token issuance returns `Too many token generation attempts. Please try again later.`

---

## Reference

### Activity types
`prayer`, `quran`, `tafseer`, `reading`, `habit`, `goal`, `exercise`, `personal`, `other`

### Activity statuses
`pending`, `completed`, `missed`

### Goal statuses
`not_started`, `in_progress`, `completed`, `paused`

### Reminder channels
`local`, `push`, `email`

### Timetable statuses
`draft`, `published`, `archived`

### Library visibility
`private`, `assigned`, `public`

### Sync entity types
`habit`, `habit_record`, `goal`, `shared_activity_completion`, `journal_entries`, `daily_reports`, `exercise_records`, `health_records`

### Sync conflict resolution policies
`client_wins`, `server_wins`, `latest_wins`, `manual`

### Prayer calculation methods
See `App\Enums\PrayerCalculationMethod` for the full list (for example `muslim_world_league`).
