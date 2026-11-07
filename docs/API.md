# ThinkCode API

REST API for the ThinkCode full-stack template. All endpoints are prefixed with `/api/v1`.

## Base URLs

| Environment | Base URL |
|---|---|
| Docker (nginx gateway) | `http://localhost:8082/api/v1` |
| Backend (PHP-FPM / artisan serve) | `http://localhost:8000/api/v1` |

> After changing `FORWARD_HTTP_PORT`, update the URLs above accordingly (currently `8082`).

## Conventions

- Requests/responses use `Content-Type: application/json` and `Accept: application/json`.
- Success envelope: `{ "success": true, "data": ..., "message": "..." }`
- Error envelope: `{ "success": false, "data": null, "message": "...", "errors": { ... } }`
- Authenticated endpoints accept either:
  - **Bearer token**: `Authorization: Bearer <token>` (from `POST /api/v1/tokens`), or
  - **SPA cookie session**: Sanctum cookie auth via the frontend origin.

---

## Health

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
    "user": { "id": 1, "name": "Ada Lovelace", "email": "developer@thinkcode.dev", "email_verified_at": null, "created_at": "...", "updated_at": "..." },
    "token": "1|...",
    "token_type": "Bearer",
    "abilities": ["*"]
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
  "data": { "user": { "id": 2, "name": "Ada Lovelace", "email": "ada@example.com", "email_verified_at": null, "created_at": "...", "updated_at": "..." } },
  "message": "Registration successful."
}
```

### Forgot password

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
  "data": { "email": "developer@thinkcode.dev", "reset_token": "abc123..." },
  "message": "If the account exists, a reset link has been sent."
}
```

> `reset_token` is only returned outside production.

### Reset password

```bash
curl -i -X POST http://localhost:8082/api/v1/auth/reset-password \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -d '{
    "token": "abc123...",
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

---

## Personal access tokens

### Issue token

```bash
curl -i -X POST http://localhost:8082/api/v1/tokens \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -H "Authorization: Bearer <access-token>" \
  -d '{
    "name": "my-api-client",
    "abilities": ["profile:read"]
  }'
```

### List tokens

```bash
curl -i http://localhost:8082/api/v1/tokens \
  -H "Accept: application/json" \
  -H "Authorization: Bearer <access-token>"
```

### Revoke current token

```bash
curl -i -X DELETE http://localhost:8082/api/v1/tokens/current \
  -H "Accept: application/json" \
  -H "Authorization: Bearer <access-token>"
```

### Revoke token by id

```bash
curl -i -X DELETE http://localhost:8082/api/v1/tokens/<token-id> \
  -H "Accept: application/json" \
  -H "Authorization: Bearer <access-token>"
```

---

## Activities

### List activities

```bash
curl -i http://localhost:8082/api/v1/activities \
  -H "Accept: application/json" \
  -H "Authorization: Bearer <access-token>"
```

### Create activity

```bash
curl -i -X POST http://localhost:8082/api/v1/activities \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -H "Authorization: Bearer <access-token>" \
  -d '{
    "title": "Morning run",
    "description": "5km easy run",
    "type": "running",
    "scheduled_date": "2026-11-08"
  }'
```

### Get activity

```bash
curl -i http://localhost:8082/api/v1/activities/<activity-id> \
  -H "Accept: application/json" \
  -H "Authorization: Bearer <access-token>"
```

### Update activity

```bash
curl -i -X PATCH http://localhost:8082/api/v1/activities/<activity-id> \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -H "Authorization: Bearer <access-token>" \
  -d '{ "title": "Morning run (updated)" }'
```

### Delete activity

```bash
curl -i -X DELETE http://localhost:8082/api/v1/activities/<activity-id> \
  -H "Accept: application/json" \
  -H "Authorization: Bearer <access-token>"
```

### Complete activity

```bash
curl -i -X POST http://localhost:8082/api/v1/activities/<activity-id>/complete \
  -H "Accept: application/json" \
  -H "Authorization: Bearer <access-token>" \
  -d '{}'
```

### List activity reminders

```bash
curl -i http://localhost:8082/api/v1/activities/<activity-id>/reminders \
  -H "Accept: application/json" \
  -H "Authorization: Bearer <access-token>"
```

### Create activity reminder

```bash
curl -i -X POST http://localhost:8082/api/v1/activities/<activity-id>/reminders \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -H "Authorization: Bearer <access-token>" \
  -d '{ "note": "Take water" }'
```

### Update activity reminder

```bash
curl -i -X PUT http://localhost:8082/api/v1/activities/<activity-id>/reminders/<reminder-id> \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -H "Authorization: Bearer <access-token>" \
  -d '{ "note": "Take water (updated)" }'
```

### Delete activity reminder

```bash
curl -i -X DELETE http://localhost:8082/api/v1/activities/<activity-id>/reminders/<reminder-id> \
  -H "Accept: application/json" \
  -H "Authorization: Bearer <access-token>"
```

---

## Shared timetables

### List shared timetables

```bash
curl -i http://localhost:8082/api/v1/shared-timetables \
  -H "Accept: application/json" \
  -H "Authorization: Bearer <access-token>"
```

### Get shared timetable

```bash
curl -i http://localhost:8082/api/v1/shared-timetables/<shared-timetable-id> \
  -H "Accept: application/json" \
  -H "Authorization: Bearer <access-token>"
```

### Create shared timetable (admin)

```bash
curl -i -X POST http://localhost:8082/api/v1/shared-timetables \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -H "Authorization: Bearer <access-token>" \
  -d '{ "title": "Team schedule" }'
```

### Update shared timetable (admin)

```bash
curl -i -X PATCH http://localhost:8082/api/v1/shared-timetables/<shared-timetable-id> \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -H "Authorization: Bearer <access-token>" \
  -d '{ "title": "Team schedule (updated)" }'
```

### Delete shared timetable (admin)

```bash
curl -i -X DELETE http://localhost:8082/api/v1/shared-timetables/<shared-timetable-id> \
  -H "Accept: application/json" \
  -H "Authorization: Bearer <access-token>"
```

### Publish shared timetable (admin)

```bash
curl -i -X POST http://localhost:8082/api/v1/shared-timetables/<shared-timetable-id>/publish \
  -H "Accept: application/json" \
  -H "Authorization: Bearer <access-token>" \
  -d '{}'
```

### Add activity to shared timetable (admin)

```bash
curl -i -X POST http://localhost:8082/api/v1/shared-timetables/<shared-timetable-id>/activities \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -H "Authorization: Bearer <access-token>" \
  -d '{ "activity_id": 1 }'
```

### Update shared timetable activity (admin)

```bash
curl -i -X PUT http://localhost:8082/api/v1/shared-timetables/<shared-timetable-id>/activities/<activity-id> \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -H "Authorization: Bearer <access-token>" \
  -d '{ "notes": "Extra context" }'
```

### Delete shared timetable activity (admin)

```bash
curl -i -X DELETE http://localhost:8082/api/v1/shared-timetables/<shared-timetable-id>/activities/<activity-id> \
  -H "Accept: application/json" \
  -H "Authorization: Bearer <access-token>"
```

### Add assignment (admin)

```bash
curl -i -X POST http://localhost:8082/api/v1/shared-timetables/<shared-timetable-id>/assignments \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -H "Authorization: Bearer <access-token>" \
  -d '{ "user_id": 1, "assigned_at": "2026-11-08" }'
```

### Delete assignment (admin)

```bash
curl -i -X DELETE http://localhost:8082/api/v1/shared-timetables/<shared-timetable-id>/assignments/<assignment-id> \
  -H "Accept: application/json" \
  -H "Authorization: Bearer <access-token>"
```

### List shared timetable activities

```bash
curl -i http://localhost:8082/api/v1/shared-timetables/<shared-timetable-id>/activities \
  -H "Accept: application/json" \
  -H "Authorization: Bearer <access-token>"
```

### List shared timetable assignments

```bash
curl -i http://localhost:8082/api/v1/shared-timetables/<shared-timetable-id>/assignments \
  -H "Accept: application/json" \
  -H "Authorization: Bearer <access-token>"
```

---

## Shared activity completions

### List completions

```bash
curl -i http://localhost:8082/api/v1/shared-activity-completions \
  -H "Accept: application/json" \
  -H "Authorization: Bearer <access-token>"
```

### Update completion

```bash
curl -i -X PUT http://localhost:8082/api/v1/shared-activity-completions/<completion-id> \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -H "Authorization: Bearer <access-token>" \
  -d '{ "completed_at": "2026-11-08T10:00:00Z" }'
```

### Delete completion

```bash
curl -i -X DELETE http://localhost:8082/api/v1/shared-activity-completions/<completion-id> \
  -H "Accept: application/json" \
  -H "Authorization: Bearer <access-token>"
```

---

## Habits

### List habits

```bash
curl -i http://localhost:8082/api/v1/habits \
  -H "Accept: application/json" \
  -H "Authorization: Bearer <access-token>"
```

### Create habit

```bash
curl -i -X POST http://localhost:8082/api/v1/habits \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -H "Authorization: Bearer <access-token>" \
  -d '{ "name": "Morning meditation", "frequency": "daily" }'
```

### Get habit

```bash
curl -i http://localhost:8082/api/v1/habits/<habit-id> \
  -H "Accept: application/json" \
  -H "Authorization: Bearer <access-token>"
```

### Update habit

```bash
curl -i -X PATCH http://localhost:8082/api/v1/habits/<habit-id> \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -H "Authorization: Bearer <access-token>" \
  -d '{ "name": "Morning meditation (updated)" }'
```

### Delete habit

```bash
curl -i -X DELETE http://localhost:8082/api/v1/habits/<habit-id> \
  -H "Accept: application/json" \
  -H "Authorization: Bearer <access-token>"
```

### Toggle habit

```bash
curl -i -X POST http://localhost:8082/api/v1/habits/<habit-id>/toggle \
  -H "Accept: application/json" \
  -H "Authorization: Bearer <access-token>" \
  -d '{}'
```

### List habit records

```bash
curl -i http://localhost:8082/api/v1/habits/<habit-id>/records \
  -H "Accept: application/json" \
  -H "Authorization: Bearer <access-token>"
```

### Create habit record

```bash
curl -i -X POST http://localhost:8082/api/v1/habits/<habit-id>/records \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -H "Authorization: Bearer <access-token>" \
  -d '{ "completed_date": "2026-11-08", "note": "Felt good" }'
```

### Get habit streak

```bash
curl -i http://localhost:8082/api/v1/habits/<habit-id>/streak \
  -H "Accept: application/json" \
  -H "Authorization: Bearer <access-token>"
```

---

## Habit records

### List habit records

```bash
curl -i http://localhost:8082/api/v1/habit-records \
  -H "Accept: application/json" \
  -H "Authorization: Bearer <access-token>"
```

### Get habit record

```bash
curl -i http://localhost:8082/api/v1/habit-records/<habit-record-id> \
  -H "Accept: application/json" \
  -H "Authorization: Bearer <access-token>"
```

### Update habit record

```bash
curl -i -X PATCH http://localhost:8082/api/v1/habit-records/<habit-record-id> \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -H "Authorization: Bearer <access-token>" \
  -d '{ "note": "Updated" }'
```

### Delete habit record

```bash
curl -i -X DELETE http://localhost:8082/api/v1/habit-records/<habit-record-id> \
  -H "Accept: application/json" \
  -H "Authorization: Bearer <access-token>"
```

---

## Goals

### List goals

```bash
curl -i http://localhost:8082/api/v1/goals \
  -H "Accept: application/json" \
  -H "Authorization: Bearer <access-token>"
```

### Create goal

```bash
curl -i -X POST http://localhost:8082/api/v1/goals \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -H "Authorization: Bearer <access-token>" \
  -d '{ "title": "Run a marathon", "target_value": 42.195 }'
```

### Get goal

```bash
curl -i http://localhost:8082/api/v1/goals/<goal-id> \
  -H "Accept: application/json" \
  -H "Authorization: Bearer <access-token>"
```

### Update goal

```bash
curl -i -X PATCH http://localhost:8082/api/v1/goals/<goal-id> \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -H "Authorization: Bearer <access-token>" \
  -d '{ "title": "Run a marathon (updated)" }'
```

### Update goal progress

```bash
curl -i -X PATCH http://localhost:8082/api/v1/goals/<goal-id>/progress \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -H "Authorization: Bearer <access-token>" \
  -d '{ "progress": 12 }'
```

### Delete goal

```bash
curl -i -X DELETE http://localhost:8082/api/v1/goals/<goal-id> \
  -H "Accept: application/json" \
  -H "Authorization: Bearer <access-token>"
```

---

## Daily reports

### List daily reports

```bash
curl -i http://localhost:8082/api/v1/daily-reports \
  -H "Accept: application/json" \
  -H "Authorization: Bearer <access-token>"
```

### Create daily report

```bash
curl -i -X POST http://localhost:8082/api/v1/daily-reports \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -H "Authorization: Bearer <access-token>" \
  -d '{ "report_date": "2026-11-08", "summary": "Felt great" }'
```

### Get daily report

```bash
curl -i http://localhost:8082/api/v1/daily-reports/<daily-report-id> \
  -H "Accept: application/json" \
  -H "Authorization: Bearer <access-token>"
```

### Update daily report

```bash
curl -i -X PATCH http://localhost:8082/api/v1/daily-reports/<daily-report-id> \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -H "Authorization: Bearer <access-token>" \
  -d '{ "summary": "Updated" }'
```

### Delete daily report

```bash
curl -i -X DELETE http://localhost:8082/api/v1/daily-reports/<daily-report-id> \
  -H "Accept: application/json" \
  -H "Authorization: Bearer <access-token>"
```

### List daily report comments

```bash
curl -i http://localhost:8082/api/v1/daily-reports/<daily-report-id>/comments \
  -H "Accept: application/json" \
  -H "Authorization: Bearer <access-token>"
```

### Add daily report comment (admin)

```bash
curl -i -X POST http://localhost:8082/api/v1/daily-reports/<daily-report-id>/comments \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -H "Authorization: Bearer <access-token>" \
  -d '{ "comment": "Nice work" }'
```

### Delete daily report comment

```bash
curl -i -X DELETE http://localhost:8082/api/v1/daily-reports/<daily-report-id>/comments/<comment-id> \
  -H "Accept: application/json" \
  -H "Authorization: Bearer <access-token>"
```

---

## User documents

### List documents

```bash
curl -i http://localhost:8082/api/v1/documents \
  -H "Accept: application/json" \
  -H "Authorization: Bearer <access-token>"
```

### Upload document

```bash
curl -i -X POST http://localhost:8082/api/v1/documents \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -H "Authorization: Bearer <access-token>" \
  -d '{ "name": "report.pdf", "description": "Monthly report" }'
```

### Download document

```bash
curl -i http://localhost:8082/api/v1/documents/<document-id>/download \
  -H "Accept: application/json" \
  -H "Authorization: Bearer <access-token>"
```

### Update document

```bash
curl -i -X PATCH http://localhost:8082/api/v1/documents/<document-id> \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -H "Authorization: Bearer <access-token>" \
  -d '{ "name": "report-v2.pdf" }'
```

### Delete document

```bash
curl -i -X DELETE http://localhost:8082/api/v1/documents/<document-id> \
  -H "Accept: application/json" \
  -H "Authorization: Bearer <access-token>"
```

---

## Library resources

### List library resources

```bash
curl -i http://localhost:8082/api/v1/library \
  -H "Accept: application/json" \
  -H "Authorization: Bearer <access-token>"
```

### Get library resource

```bash
curl -i http://localhost:8082/api/v1/library/<library-resource-id> \
  -H "Accept: application/json" \
  -H "Authorization: Bearer <access-token>"
```

### Upload library resource (admin)

```bash
curl -i -X POST http://localhost:8082/api/v1/library \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -H "Authorization: Bearer <access-token>" \
  -d '{ "title": "Guide", "file_name": "guide.pdf" }'
```

### Download library resource

```bash
curl -i http://localhost:8082/api/v1/library/<library-resource-id>/download \
  -H "Accept: application/json" \
  -H "Authorization: Bearer <access-token>"
```

### Grant library resource permission (admin)

```bash
curl -i -X POST http://localhost:8082/api/v1/library/<library-resource-id>/permissions \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -H "Authorization: Bearer <access-token>" \
  -d '{ "user_id": 1, "permission": "read" }'
```

### Revoke library resource permission (admin)

```bash
curl -i -X DELETE http://localhost:8082/api/v1/library/<library-resource-id>/permissions/<permission-id> \
  -H "Accept: application/json" \
  -H "Authorization: Bearer <access-token>"
```

---

## Bookmarks

### List bookmarks

```bash
curl -i http://localhost:8082/api/v1/bookmarks \
  -H "Accept: application/json" \
  -H "Authorization: Bearer <access-token>"
```

### Create bookmark

```bash
curl -i -X POST http://localhost:8082/api/v1/bookmarks \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -H "Authorization: Bearer <access-token>" \
  -d '{ "title": "Useful article", "url": "https://example.com/article" }'
```

### Delete bookmark

```bash
curl -i -X DELETE http://localhost:8082/api/v1/bookmarks/<bookmark-id> \
  -H "Accept: application/json" \
  -H "Authorization: Bearer <access-token>"
```

---

## Notifications

### List notifications

```bash
curl -i http://localhost:8082/api/v1/notifications \
  -H "Accept: application/json" \
  -H "Authorization: Bearer <access-token>"
```

### Get unread count

```bash
curl -i http://localhost:8082/api/v1/notifications/unread-count \
  -H "Accept: application/json" \
  -H "Authorization: Bearer <access-token>"
```

### Mark all as read

```bash
curl -i -X POST http://localhost:8082/api/v1/notifications/read-all \
  -H "Accept: application/json" \
  -H "Authorization: Bearer <access-token>"
```

### Get notification

```bash
curl -i http://localhost:8082/api/v1/notifications/<notification-id> \
  -H "Accept: application/json" \
  -H "Authorization: Bearer <access-token>"
```

### Mark notification as read

```bash
curl -i -X POST http://localhost:8082/api/v1/notifications/<notification-id>/read \
  -H "Accept: application/json" \
  -H "Authorization: Bearer <access-token>"
```

### Delete notification

```bash
curl -i -X DELETE http://localhost:8082/api/v1/notifications/<notification-id> \
  -H "Accept: application/json" \
  -H "Authorization: Bearer <access-token>"
```

---

## Device tokens

### List device tokens

```bash
curl -i http://localhost:8082/api/v1/device-tokens \
  -H "Accept: application/json" \
  -H "Authorization: Bearer <access-token>"
```

### Register device token

```bash
curl -i -X POST http://localhost:8082/api/v1/device-tokens \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -H "Authorization: Bearer <access-token>" \
  -d '{ "token": "fcm-or-apns-token", "platform": "ios" }'
```

### Delete device token

```bash
curl -i -X DELETE http://localhost:8082/api/v1/device-tokens/<device-token-id> \
  -H "Accept: application/json" \
  -H "Authorization: Bearer <access-token>"
```

---

## Health records

### List health records

```bash
curl -i http://localhost:8082/api/v1/health-records \
  -H "Accept: application/json" \
  -H "Authorization: Bearer <access-token>"
```

### Create health record

```bash
curl -i -X POST http://localhost:8082/api/v1/health-records \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -H "Authorization: Bearer <access-token>" \
  -d '{ "metric": "heart_rate", "value": 72, "recorded_at": "2026-11-08T10:00:00Z" }'
```

### Get health record summary

```bash
curl -i http://localhost:8082/api/v1/health-records/summary \
  -H "Accept: application/json" \
  -H "Authorization: Bearer <access-token>"
```

### Get health record

```bash
curl -i http://localhost:8082/api/v1/health-records/<health-record-id> \
  -H "Accept: application/json" \
  -H "Authorization: Bearer <access-token>"
```

### Update health record

```bash
curl -i -X PATCH http://localhost:8082/api/v1/health-records/<health-record-id> \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -H "Authorization: Bearer <access-token>" \
  -d '{ "value": 75 }'
```

### Delete health record

```bash
curl -i -X DELETE http://localhost:8082/api/v1/health-records/<health-record-id> \
  -H "Accept: application/json" \
  -H "Authorization: Bearer <access-token>"
```

---

## Exercise records

### List exercise records

```bash
curl -i http://localhost:8082/api/v1/exercise-records \
  -H "Accept: application/json" \
  -H "Authorization: Bearer <access-token>"
```

### Create exercise record

```bash
curl -i -X POST http://localhost:8082/api/v1/exercise-records \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -H "Authorization: Bearer <access-token>" \
  -d '{ "name": "Push ups", "sets": 3, "reps": 15 }'
```

### Get exercise record

```bash
curl -i http://localhost:8082/api/v1/exercise-records/<exercise-record-id> \
  -H "Accept: application/json" \
  -H "Authorization: Bearer <access-token>"
```

### Update exercise record

```bash
curl -i -X PATCH http://localhost:8082/api/v1/exercise-records/<exercise-record-id> \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -H "Authorization: Bearer <access-token>" \
  -d '{ "sets": 4 }'
```

### Delete exercise record

```bash
curl -i -X DELETE http://localhost:8082/api/v1/exercise-records/<exercise-record-id> \
  -H "Accept: application/json" \
  -H "Authorization: Bearer <access-token>"
```

---

## Offline synchronization

### Push operations

```bash
curl -i -X POST http://localhost:8082/api/v1/sync/push \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -H "Authorization: Bearer <access-token>" \
  -d '{ "operations": [] }'
```

### Pull operations

```bash
curl -i http://localhost:8082/api/v1/sync/pull \
  -H "Accept: application/json" \
  -H "Authorization: Bearer <access-token>"
```

### List sync conflicts

```bash
curl -i http://localhost:8082/api/v1/sync/conflicts \
  -H "Accept: application/json" \
  -H "Authorization: Bearer <access-token>"
```

### Resolve sync conflict

```bash
curl -i -X POST http://localhost:8082/api/v1/sync/conflicts/<sync-conflict-id>/resolve \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -H "Authorization: Bearer <access-token>" \
  -d '{ "resolution": "client_wins" }'
```

### List sync operations

```bash
curl -i http://localhost:8082/api/v1/sync/operations \
  -H "Accept: application/json" \
  -H "Authorization: Bearer <access-token>"
```

---

## Demo & admin

### Get demo tasks

```bash
curl -i http://localhost:8082/api/v1/tasks \
  -H "Accept: application/json" \
  -H "Authorization: Bearer <access-token>"
```

### Queue background job (demo)

```bash
curl -i -X POST http://localhost:8082/api/v1/queue-test \
  -H "Accept: application/json" \
  -H "Authorization: Bearer <access-token>" \
  -d '{}'
```

### Admin-only check

```bash
curl -i http://localhost:8082/api/v1/admin-check \
  -H "Accept: application/json" \
  -H "Authorization: Bearer <access-token>"
```

---

## Authentication & errors (summary)

| Endpoint | Method | Auth | Description |
|---|---|---|---|
| `/api/v1/health` | GET | Public | Service health |
| `/api/v1/health/live` | GET | Public | Liveness |
| `/api/v1/health/ready` | GET | Public | Readiness |
| `/api/v1/auth/login` | POST | Public | Login (throttled 5/min) |
| `/api/v1/auth/register` | POST | Public | Register |
| `/api/v1/auth/forgot-password` | POST | Public | Forgot password (throttled 5/min) |
| `/api/v1/auth/reset-password` | POST | Public | Reset password |
| `/api/v1/auth/me` | GET | Sanctum | Current user |
| `/api/v1/auth/profile` | PATCH | Sanctum | Update profile |
| `/api/v1/auth/logout` | POST | Sanctum | Logout |
| `/api/v1/tokens` | POST/GET | Auth | Token issue/list |
| `/api/v1/tokens/current` | DELETE | Auth | Revoke current |
| `/api/v1/tokens/{id}` | DELETE | Auth | Revoke by id |

## Common error responses

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

Rate limit (login / forgot-password): `429` with message `Too many login attempts. Please try again later.`
