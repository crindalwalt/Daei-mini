<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;
use Laravel\Sanctum\PersonalAccessToken;

class TokenController extends Controller
{
    /**
     * Issue a personal access token with explicit abilities and expiration.
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'email' => ['required', 'string', 'email'],
            'password' => ['required', 'string'],
            'token_name' => ['required', 'string', 'max:255'],
            'abilities' => ['nullable', 'array'],
            'abilities.*' => ['string', 'max:50'],
        ]);

        $user = User::where('email', $validated['email'])->first();

        if (! $user || ! Hash::check($validated['password'], $user->password)) {
            throw ValidationException::withMessages([
                'email' => [trans('auth.failed')],
            ]);
        }

        if ($user->suspended_at !== null) {
            throw ValidationException::withMessages([
                'email' => ['This account has been suspended. Please contact an administrator.'],
            ]);
        }

        $abilities = $validated['abilities'] ?? ['*'];
        $expirationMinutes = (int) config('sanctum.expiration', 10080);
        $expiresAt = now()->addMinutes($expirationMinutes);

        $newAccessToken = $user->createToken(
            $validated['token_name'],
            $abilities,
            $expiresAt
        );

        return response()->json([
            'token' => $newAccessToken->plainTextToken,
            'token_type' => 'Bearer',
            'abilities' => $abilities,
            'expires_at' => $expiresAt->toISOString(),
            'message' => 'Personal access token issued successfully.',
        ], 201);
    }

    /**
     * List active personal access tokens for the authenticated user.
     * Raw token values are never exposed after initial issuance.
     */
    public function index(Request $request): JsonResponse
    {
        $tokens = $request->user()->tokens->map(function ($token) {
            return [
                'id' => $token->id,
                'name' => $token->name,
                'abilities' => $token->abilities,
                'last_used_at' => $token->last_used_at?->toISOString(),
                'expires_at' => $token->expires_at?->toISOString(),
                'created_at' => $token->created_at?->toISOString(),
            ];
        });

        return response()->json([
            'tokens' => $tokens,
        ]);
    }

    /**
     * Revoke the current access token used for this request.
     */
    public function destroyCurrent(Request $request): JsonResponse
    {
        $token = $request->user()->currentAccessToken();

        if ($token instanceof PersonalAccessToken) {
            $token->delete();

            return response()->json([
                'message' => 'Current token revoked successfully.',
            ]);
        }

        return response()->json([
            'message' => 'The current request did not use a personal access token.',
        ], 400);
    }

    /**
     * Revoke a specific personal access token by ID.
     */
    public function destroy(Request $request, int|string $id): JsonResponse
    {
        $deleted = $request->user()->tokens()->where('id', $id)->delete();

        if (! $deleted) {
            return response()->json([
                'message' => 'Token not found.',
            ], 404);
        }

        return response()->json([
            'message' => 'Token revoked successfully.',
        ]);
    }
}
