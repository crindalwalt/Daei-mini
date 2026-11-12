<?php

use App\Http\Controllers\Api\V1\ActivityController;
use App\Http\Controllers\Api\V1\Admin\ActivityController as AdminActivityController;
use App\Http\Controllers\Api\V1\Admin\AnalyticsController as AdminAnalyticsController;
use App\Http\Controllers\Api\V1\Admin\DashboardController as AdminDashboardController;
use App\Http\Controllers\Api\V1\Admin\GroupController as AdminGroupController;
use App\Http\Controllers\Api\V1\Admin\ReportController as AdminReportController;
use App\Http\Controllers\Api\V1\Admin\SearchController as AdminSearchController;
use App\Http\Controllers\Api\V1\Admin\UserController as AdminUserController;
use App\Http\Controllers\Api\V1\AuthController;
use App\Http\Controllers\Api\V1\BookmarkController;
use App\Http\Controllers\Api\V1\DailyReportController;
use App\Http\Controllers\Api\V1\DemoController;
use App\Http\Controllers\Api\V1\DeviceTokenController;
use App\Http\Controllers\Api\V1\ExerciseRecordController;
use App\Http\Controllers\Api\V1\GoalController;
use App\Http\Controllers\Api\V1\HabitController;
use App\Http\Controllers\Api\V1\HabitRecordController;
use App\Http\Controllers\Api\V1\HealthController;
use App\Http\Controllers\Api\V1\HealthRecordController;
use App\Http\Controllers\Api\V1\LibraryResourceController;
use App\Http\Controllers\Api\V1\NotificationController;
use App\Http\Controllers\Api\V1\SharedActivityCompletionController;
use App\Http\Controllers\Api\V1\SharedTimetableActivityController;
use App\Http\Controllers\Api\V1\SharedTimetableAssignmentController;
use App\Http\Controllers\Api\V1\SharedTimetableController;
use App\Http\Controllers\Api\V1\SyncController;
use App\Http\Controllers\Api\V1\TokenController;
use App\Http\Controllers\Api\V1\UserDocumentController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| API Routes — ThinkCode Full-Stack Template
|--------------------------------------------------------------------------
|
| Versioned under /api/v1. Sanctum handles both SPA cookie session authentication
| and Bearer personal access token authentication.
|
*/

Route::prefix('v1')->group(function () {
    // ── Public System Health ───────────────────────────────────────────────
    Route::get('/health', [HealthController::class, 'ready']);
    Route::get('/health/live', [HealthController::class, 'live']);
    Route::get('/health/ready', [HealthController::class, 'ready']);

    // ── Public Authentication (SPA Cookie Flow) ────────────────────────────
    Route::prefix('auth')->group(function () {
        Route::post('/login', [AuthController::class, 'login'])->middleware('throttle:login');
        Route::post('/register', [AuthController::class, 'register']);
        Route::post('/forgot-password', [AuthController::class, 'forgotPassword'])->middleware('throttle:login');
        Route::post('/reset-password', [AuthController::class, 'resetPassword'])->middleware('throttle:login');
        Route::get('/email/verify/{id}/{hash}', [AuthController::class, 'verifyEmail'])->name('verification.verify');
    });

    // ── Personal Access Token Issuance Contract ───────────────────────────
    Route::post('/tokens', [TokenController::class, 'store'])->middleware('throttle:tokens');

    // ── Authenticated Routes (Sanctum SPA cookie or Bearer Token) ─────────
    Route::middleware(['auth:sanctum', 'not-suspended'])->group(function () {
        Route::prefix('auth')->group(function () {
            Route::get('/me', [AuthController::class, 'me']);
            Route::patch('/profile', [AuthController::class, 'updateProfile']);
            Route::patch('/password', [AuthController::class, 'updatePassword']);
            Route::post('/logout', [AuthController::class, 'logout']);
            Route::post('/email/verification-notification', [AuthController::class, 'resendEmailVerification'])
                ->middleware('throttle:6,1');
        });

        // Personal Access Token Management
        Route::prefix('tokens')->group(function () {
            Route::get('/', [TokenController::class, 'index']);
            Route::delete('/current', [TokenController::class, 'destroyCurrent']);
            Route::delete('/{id}', [TokenController::class, 'destroy']);
        });

        // Demo protected resources
        Route::get('/tasks', [DemoController::class, 'tasks']);
        Route::post('/queue-test', [DemoController::class, 'dispatchJob']);
        Route::get('/admin-check', [DemoController::class, 'adminOnly'])->middleware('role:admin');

        // ── Personal Activities ────────────────────────────────────────────
        Route::get('/activities', [ActivityController::class, 'index']);
        Route::post('/activities', [ActivityController::class, 'store']);
        Route::get('/activities/{activity}', [ActivityController::class, 'show']);
        Route::match(['put', 'patch'], '/activities/{activity}', [ActivityController::class, 'update']);
        Route::delete('/activities/{activity}', [ActivityController::class, 'destroy']);
        Route::post('/activities/{activity}/complete', [ActivityController::class, 'complete']);
        Route::get('/activities/{activity}/reminders', [ActivityController::class, 'reminders']);
        Route::post('/activities/{activity}/reminders', [ActivityController::class, 'storeReminder']);
        Route::match(['put', 'patch'], '/activities/{activity}/reminders/{reminder}', [ActivityController::class, 'updateReminder']);
        Route::delete('/activities/{activity}/reminders/{reminder}', [ActivityController::class, 'destroyReminder']);

        // ── Shared Timetables ──────────────────────────────────────────────
        Route::get('/shared-timetables', [SharedTimetableController::class, 'index']);
        Route::get('/shared-timetables/{sharedTimetable}', [SharedTimetableController::class, 'show']);

        Route::middleware('role:admin')->group(function () {
            Route::post('/shared-timetables', [SharedTimetableController::class, 'store']);
            Route::match(['put', 'patch'], '/shared-timetables/{sharedTimetable}', [SharedTimetableController::class, 'update']);
            Route::delete('/shared-timetables/{sharedTimetable}', [SharedTimetableController::class, 'destroy']);
            Route::post('/shared-timetables/{sharedTimetable}/publish', [SharedTimetableController::class, 'publish']);

            Route::post('/shared-timetables/{sharedTimetable}/activities', [SharedTimetableActivityController::class, 'store']);
            Route::match(['put', 'patch'], '/shared-timetables/{sharedTimetable}/activities/{activity}', [SharedTimetableActivityController::class, 'update']);
            Route::delete('/shared-timetables/{sharedTimetable}/activities/{activity}', [SharedTimetableActivityController::class, 'destroy']);

            Route::post('/shared-timetables/{sharedTimetable}/assignments', [SharedTimetableAssignmentController::class, 'store']);
            Route::delete('/shared-timetables/{sharedTimetable}/assignments/{assignment}', [SharedTimetableAssignmentController::class, 'destroy']);
        });

        Route::get('/shared-timetables/{sharedTimetable}/activities', [SharedTimetableActivityController::class, 'index']);
        Route::get('/shared-timetables/{sharedTimetable}/assignments', [SharedTimetableAssignmentController::class, 'index']);
        Route::post('/shared-timetables/{sharedTimetable}/activities/{activity}/completions', [SharedActivityCompletionController::class, 'store']);

        // ── Shared Activity Completions ────────────────────────────────────
        Route::get('/shared-activity-completions', [SharedActivityCompletionController::class, 'index']);
        Route::match(['put', 'patch'], '/shared-activity-completions/{sharedActivityCompletion}', [SharedActivityCompletionController::class, 'update']);
        Route::delete('/shared-activity-completions/{sharedActivityCompletion}', [SharedActivityCompletionController::class, 'destroy']);

        // ── Habits ─────────────────────────────────────────────────────────
        Route::get('/habits', [HabitController::class, 'index']);
        Route::post('/habits', [HabitController::class, 'store']);
        Route::get('/habits/{habit}', [HabitController::class, 'show']);
        Route::match(['put', 'patch'], '/habits/{habit}', [HabitController::class, 'update']);
        Route::delete('/habits/{habit}', [HabitController::class, 'destroy']);
        Route::post('/habits/{habit}/toggle', [HabitController::class, 'toggle']);
        Route::get('/habits/{habit}/records', [HabitController::class, 'records']);
        Route::post('/habits/{habit}/records', [HabitController::class, 'storeRecord']);
        Route::get('/habits/{habit}/streak', [HabitController::class, 'streak']);

        Route::get('/habit-records', [HabitRecordController::class, 'index']);
        Route::get('/habit-records/{habitRecord}', [HabitRecordController::class, 'show']);
        Route::match(['put', 'patch'], '/habit-records/{habitRecord}', [HabitRecordController::class, 'update']);
        Route::delete('/habit-records/{habitRecord}', [HabitRecordController::class, 'destroy']);

        // ── Goals ──────────────────────────────────────────────────────────
        Route::get('/goals', [GoalController::class, 'index']);
        Route::post('/goals', [GoalController::class, 'store']);
        Route::get('/goals/{goal}', [GoalController::class, 'show']);
        Route::match(['put', 'patch'], '/goals/{goal}', [GoalController::class, 'update']);
        Route::delete('/goals/{goal}', [GoalController::class, 'destroy']);
        Route::match(['put', 'patch'], '/goals/{goal}/progress', [GoalController::class, 'progress']);

        // ── Daily Reports ──────────────────────────────────────────────────
        Route::get('/daily-reports', [DailyReportController::class, 'index']);
        Route::post('/daily-reports', [DailyReportController::class, 'store']);
        Route::get('/daily-reports/{dailyReport}', [DailyReportController::class, 'show']);
        Route::match(['put', 'patch'], '/daily-reports/{dailyReport}', [DailyReportController::class, 'update']);
        Route::delete('/daily-reports/{dailyReport}', [DailyReportController::class, 'destroy']);
        Route::get('/daily-reports/{dailyReport}/comments', [DailyReportController::class, 'comments']);
        Route::post('/daily-reports/{dailyReport}/comments', [DailyReportController::class, 'storeComment'])->middleware('role:admin');
        Route::delete('/daily-reports/{dailyReport}/comments/{comment}', [DailyReportController::class, 'destroyComment']);

        // ── User Documents ─────────────────────────────────────────────────
        Route::get('/documents', [UserDocumentController::class, 'index']);
        Route::post('/documents', [UserDocumentController::class, 'store']);
        Route::get('/documents/{document}', [UserDocumentController::class, 'show']);
        Route::match(['put', 'patch'], '/documents/{document}', [UserDocumentController::class, 'update']);
        Route::delete('/documents/{document}', [UserDocumentController::class, 'destroy']);
        Route::get('/documents/{document}/download', [UserDocumentController::class, 'download'])->name('documents.download');

        // ── Shared Library ─────────────────────────────────────────────────
        Route::get('/library', [LibraryResourceController::class, 'index']);
        Route::get('/library/{libraryResource}', [LibraryResourceController::class, 'show']);
        Route::get('/library/{libraryResource}/download', [LibraryResourceController::class, 'download'])->name('library.download');

        Route::middleware('role:admin')->group(function () {
            Route::post('/library', [LibraryResourceController::class, 'store']);
            Route::match(['put', 'patch'], '/library/{libraryResource}', [LibraryResourceController::class, 'update']);
            Route::delete('/library/{libraryResource}', [LibraryResourceController::class, 'destroy']);
            Route::get('/library/{libraryResource}/permissions', [LibraryResourceController::class, 'permissions']);
            Route::post('/library/{libraryResource}/permissions', [LibraryResourceController::class, 'storePermission']);
            Route::delete('/library/{libraryResource}/permissions/{permission}', [LibraryResourceController::class, 'destroyPermission']);
        });

        // ── Bookmarks ──────────────────────────────────────────────────────
        Route::get('/bookmarks', [BookmarkController::class, 'index']);
        Route::post('/bookmarks', [BookmarkController::class, 'store']);
        Route::delete('/bookmarks/{bookmark}', [BookmarkController::class, 'destroy']);

        // ── Notifications ──────────────────────────────────────────────────
        Route::get('/notifications', [NotificationController::class, 'index']);
        Route::get('/notifications/unread-count', [NotificationController::class, 'unreadCount']);
        Route::post('/notifications/read-all', [NotificationController::class, 'markAllAsRead']);
        Route::get('/notifications/{notification}', [NotificationController::class, 'show']);
        Route::post('/notifications/{notification}/read', [NotificationController::class, 'markAsRead']);
        Route::delete('/notifications/{notification}', [NotificationController::class, 'destroy']);

        // ── Device Tokens ──────────────────────────────────────────────────
        Route::get('/device-tokens', [DeviceTokenController::class, 'index']);
        Route::post('/device-tokens', [DeviceTokenController::class, 'store']);
        Route::delete('/device-tokens/{deviceToken}', [DeviceTokenController::class, 'destroy']);

        // ── Health Records ─────────────────────────────────────────────────
        Route::get('/health-records', [HealthRecordController::class, 'index']);
        Route::post('/health-records', [HealthRecordController::class, 'store']);
        Route::get('/health-records/summary', [HealthRecordController::class, 'summary']);
        Route::get('/health-records/{healthRecord}', [HealthRecordController::class, 'show']);
        Route::match(['put', 'patch'], '/health-records/{healthRecord}', [HealthRecordController::class, 'update']);
        Route::delete('/health-records/{healthRecord}', [HealthRecordController::class, 'destroy']);

        // ── Exercise Records ───────────────────────────────────────────────
        Route::get('/exercise-records', [ExerciseRecordController::class, 'index']);
        Route::post('/exercise-records', [ExerciseRecordController::class, 'store']);
        Route::get('/exercise-records/{exerciseRecord}', [ExerciseRecordController::class, 'show']);
        Route::match(['put', 'patch'], '/exercise-records/{exerciseRecord}', [ExerciseRecordController::class, 'update']);
        Route::delete('/exercise-records/{exerciseRecord}', [ExerciseRecordController::class, 'destroy']);

        // ── Offline Synchronization ────────────────────────────────────────
        Route::post('/sync/push', [SyncController::class, 'push']);
        Route::get('/sync/pull', [SyncController::class, 'pull']);
        Route::get('/sync/conflicts', [SyncController::class, 'conflicts']);
        Route::post('/sync/conflicts/{syncConflict}/resolve', [SyncController::class, 'resolve']);
        Route::get('/sync/operations', [SyncController::class, 'operations']);

        // ── Administrator Dashboard & Management ──────────────────────────
        Route::prefix('admin')->middleware('role:admin')->group(function () {
            Route::get('/dashboard', [AdminDashboardController::class, 'index']);
            Route::get('/search', [AdminSearchController::class, 'index']);
            Route::get('/analytics', [AdminAnalyticsController::class, 'index']);
            Route::get('/analytics/export', [AdminAnalyticsController::class, 'export']);

            Route::get('/users/export', [AdminUserController::class, 'export']);
            Route::get('/users', [AdminUserController::class, 'index']);
            Route::post('/users', [AdminUserController::class, 'store']);
            Route::get('/users/{user}', [AdminUserController::class, 'show']);
            Route::match(['put', 'patch'], '/users/{user}', [AdminUserController::class, 'update']);
            Route::post('/users/{user}/toggle-status', [AdminUserController::class, 'toggleStatus']);
            Route::post('/users/{user}/toggle-suspension', [AdminUserController::class, 'toggleSuspension']);

            Route::get('/groups/export', [AdminGroupController::class, 'export']);
            Route::get('/groups', [AdminGroupController::class, 'index']);
            Route::post('/groups', [AdminGroupController::class, 'store']);
            Route::get('/groups/{group}', [AdminGroupController::class, 'show']);
            Route::match(['put', 'patch'], '/groups/{group}', [AdminGroupController::class, 'update']);

            Route::get('/reports/export', [AdminReportController::class, 'export']);
            Route::get('/reports', [AdminReportController::class, 'index']);
            Route::get('/reports/{report}', [AdminReportController::class, 'show']);
            Route::patch('/reports/{report}/status', [AdminReportController::class, 'updateStatus']);
            Route::post('/reports/{report}/comments', [AdminReportController::class, 'storeComment']);

            Route::get('/activities/export', [AdminActivityController::class, 'export']);
            Route::get('/activities', [AdminActivityController::class, 'index']);
            Route::post('/activities/{activity}/complete', [AdminActivityController::class, 'complete']);
        });
    });
});

// Legacy / unversioned fallback
Route::middleware('auth:sanctum')->get('/user', function (Request $request) {
    return $request->user();
});
