<?php

use App\Http\Controllers\Api\V1\AuthController;
use App\Http\Controllers\Api\V1\DemoController;
use App\Http\Controllers\Api\V1\HealthController;
use App\Http\Controllers\Api\V1\TokenController;
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
    });

    // ── Personal Access Token Issuance Contract ───────────────────────────
    Route::post('/tokens', [TokenController::class, 'store'])->middleware('throttle:tokens');

    // ── Authenticated Routes (Sanctum SPA cookie or Bearer Token) ─────────
    Route::middleware('auth:sanctum')->group(function () {
        Route::prefix('auth')->group(function () {
            Route::get('/me', [AuthController::class, 'me']);
            Route::post('/logout', [AuthController::class, 'logout']);
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
        Route::get('/admin-check', [DemoController::class, 'adminOnly']);
    });
});

// Legacy / unversioned fallback
Route::middleware('auth:sanctum')->get('/user', function (Request $request) {
    return $request->user();
});
