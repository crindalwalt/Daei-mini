<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Redis;
use Throwable;

class HealthController extends Controller
{
    /**
     * Default invokable handler — delegates to readiness probe for backward compatibility.
     */
    public function __invoke(): JsonResponse
    {
        return $this->ready();
    }

    /**
     * Public liveness probe — verifies the application process is running.
     * Does not trigger database queries or expose infrastructure details.
     */
    public function live(): JsonResponse
    {
        return response()->json([
            'status' => 'ok',
            'timestamp' => now()->toISOString(),
        ]);
    }

    /**
     * Readiness probe — verifies database and cache connectivity with sanitized reporting.
     * Connection strings, raw error traces, and exact software versions are protected in production.
     */
    public function ready(): JsonResponse
    {
        $status = 'healthy';
        $services = [];

        // Check Database
        try {
            DB::connection()->getPdo();
            $services['database'] = [
                'status' => 'up',
            ];
        } catch (Throwable $e) {
            $status = 'degraded';
            $services['database'] = [
                'status' => 'down',
                'error' => config('app.debug') ? $e->getMessage() : 'Database service unavailable.',
            ];
        }

        // Check Redis
        try {
            if (config('cache.default') === 'redis' || config('queue.default') === 'redis') {
                Redis::connection()->ping();
                $services['redis'] = [
                    'status' => 'up',
                ];
            } else {
                $services['redis'] = [
                    'status' => 'skipped',
                    'note' => 'Redis not configured as primary driver',
                ];
            }
        } catch (Throwable $e) {
            $status = 'degraded';
            $services['redis'] = [
                'status' => 'down',
                'error' => config('app.debug') ? $e->getMessage() : 'Redis service unavailable.',
            ];
        }

        $payload = [
            'status' => $status,
            'timestamp' => now()->toISOString(),
            'environment' => config('app.env'),
            'services' => $services,
        ];

        // Disclose internal runtime versions only in non-production environments when debug mode is enabled
        $isProduction = config('app.env') === 'production' || app()->isProduction();
        if (!$isProduction && config('app.debug')) {
            $payload['version'] = [
                'laravel' => app()->version(),
                'php' => PHP_VERSION,
            ];
        }

        return response()->json($payload, $status === 'healthy' ? 200 : 503);
    }
}
