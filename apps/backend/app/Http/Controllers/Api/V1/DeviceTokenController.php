<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreDeviceTokenRequest;
use App\Http\Resources\DeviceTokenResource;
use App\Http\Responses\ApiResponse;
use App\Models\DeviceToken;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class DeviceTokenController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = DeviceToken::query()
            ->where('user_id', $request->user()->id)
            ->orderByDesc('last_used_at');

        if ($request->has('active')) {
            $query->where('is_active', $request->boolean('active'));
        }

        return ApiResponse::success(
            DeviceTokenResource::collection($query->get()),
            'Device tokens retrieved.',
        );
    }

    public function store(StoreDeviceTokenRequest $request): JsonResponse
    {
        $token = DeviceToken::query()
            ->where('device_token', $request->string('device_token')->toString())
            ->first();

        $wasRecentlyCreated = $token === null;
        $token ??= new DeviceToken(['device_token' => $request->string('device_token')->toString()]);

        $token->user_id = $request->user()->id;
        $token->device_type = $request->string('device_type')->toString();
        $token->device_identifier = $request->input('device_identifier');
        $token->is_active = true;
        $token->last_used_at = now();
        $token->save();

        return ApiResponse::success(
            new DeviceTokenResource($token),
            'Device token registered.',
            $wasRecentlyCreated ? 201 : 200,
        );
    }

    public function destroy(Request $request, DeviceToken $deviceToken): JsonResponse
    {
        abort_unless($deviceToken->user_id === $request->user()->id, 404);

        $deviceToken->is_active = false;
        $deviceToken->last_used_at = now();
        $deviceToken->save();

        return ApiResponse::success(new DeviceTokenResource($deviceToken->refresh()), 'Device token deactivated.');
    }
}
