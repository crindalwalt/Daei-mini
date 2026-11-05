<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Jobs\ProcessExampleJob;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;

class DemoController extends Controller
{
    /**
     * Return demo tasks for the authenticated user.
     */
    public function tasks(Request $request): JsonResponse
    {
        $user = $request->user();

        return response()->json([
            'tasks' => [
                [
                    'id' => 1,
                    'title' => 'Review ThinkCode Architecture Guidelines',
                    'status' => 'completed',
                    'assigned_to' => $user->name,
                ],
                [
                    'id' => 2,
                    'title' => 'Configure Production Deployment in Coolify',
                    'status' => 'in_progress',
                    'assigned_to' => $user->name,
                ],
                [
                    'id' => 3,
                    'title' => 'Integrate Client Domain and SSL Certificate',
                    'status' => 'pending',
                    'assigned_to' => $user->name,
                ],
            ],
        ]);
    }

    /**
     * Dispatch an example queue job to verify Redis queue operation.
     */
    public function dispatchJob(Request $request): JsonResponse
    {
        $payload = [
            'triggered_by' => $request->user()?->email ?: 'system',
            'timestamp' => now()->toISOString(),
            'message' => 'Queue connectivity verification job',
        ];

        ProcessExampleJob::dispatch($payload);

        return response()->json([
            'status' => 'queued',
            'message' => 'Job dispatched to Redis queue successfully.',
            'payload' => $payload,
        ]);
    }

    /**
     * Action guarded by native Laravel Gate to verify authorization behavior.
     */
    public function adminOnly(Request $request): JsonResponse
    {
        Gate::authorize('view-admin-dashboard');

        return response()->json([
            'message' => 'Welcome to the authorized admin area.',
            'user' => $request->user()->email,
        ]);
    }
}

