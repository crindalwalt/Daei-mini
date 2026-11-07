<?php

namespace App\Http\Controllers\Api\V1;

use App\Enums\ConflictResolutionPolicy;
use App\Http\Controllers\Controller;
use App\Http\Requests\ResolveSyncConflictRequest;
use App\Http\Requests\SyncPushRequest;
use App\Http\Resources\SyncConflictResource;
use App\Http\Resources\SyncOperationResource;
use App\Http\Responses\ApiResponse;
use App\Models\SyncConflict;
use App\Models\SyncOperation;
use App\Services\SyncService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SyncController extends Controller
{
    public function __construct(private readonly SyncService $sync) {}

    public function push(SyncPushRequest $request): JsonResponse
    {
        return ApiResponse::success(
            $this->sync->push($request->user(), $request->validated()),
            'Synchronization completed.',
        );
    }

    public function pull(Request $request): JsonResponse
    {
        $request->validate([
            'since' => ['sometimes', 'date'],
        ]);

        return ApiResponse::success(
            $this->sync->pull($request->user(), $request->input('since')),
            'Changes retrieved.',
        );
    }

    public function conflicts(Request $request): JsonResponse
    {
        $request->validate([
            'status' => ['sometimes', 'string', 'in:pending,resolved,ignored'],
            'per_page' => ['sometimes', 'integer', 'between:1,100'],
        ]);

        $query = SyncConflict::query()
            ->where('user_id', $request->user()->id)
            ->orderByDesc('created_at');

        if ($request->filled('status')) {
            $query->where('resolution_status', $request->string('status')->toString());
        } else {
            $query->where('resolution_status', 'pending');
        }

        $paginator = $query->paginate((int) $request->integer('per_page', 20));

        return ApiResponse::paginated(
            $paginator,
            SyncConflictResource::collection($paginator->items()),
            'Sync conflicts retrieved.',
        );
    }

    public function resolve(
        ResolveSyncConflictRequest $request,
        SyncConflict $syncConflict,
    ): JsonResponse {
        $conflict = $this->sync->resolveConflict(
            $request->user(),
            $syncConflict,
            ConflictResolutionPolicy::from($request->string('resolution_type')->toString()),
        );

        return ApiResponse::success(new SyncConflictResource($conflict), 'Sync conflict resolved.');
    }

    public function operations(Request $request): JsonResponse
    {
        $paginator = SyncOperation::query()
            ->where('user_id', $request->user()->id)
            ->orderByDesc('created_at')
            ->paginate((int) $request->integer('per_page', 20));

        return ApiResponse::paginated(
            $paginator,
            SyncOperationResource::collection($paginator->items()),
            'Sync operations retrieved.',
        );
    }
}
