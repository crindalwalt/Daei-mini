<?php

namespace App\Http\Controllers\Api\V1;

use App\Enums\UserRole;
use App\Http\Controllers\Controller;
use App\Http\Requests\LoginRequest;
use App\Http\Requests\RegisterRequest;
use App\Http\Requests\UpdateProfileRequest;
use App\Http\Resources\UserResource;
use App\Http\Responses\ApiResponse;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;
use Laravel\Sanctum\PersonalAccessToken;

class AuthController extends Controller
{
    /**
     * Authenticate a user and issue a Sanctum personal access token.
     */
    public function login(LoginRequest $request): JsonResponse
    {
        $user = User::where('email', $request->string('email'))->first();

        if (! $user || ! Hash::check($request->string('password'), $user->password)) {
            throw ValidationException::withMessages([
                'email' => [trans('auth.failed')],
            ]);
        }

        if (! $user->is_active) {
            throw ValidationException::withMessages([
                'email' => ['This account has been deactivated.'],
            ]);
        }

        // Keep the SPA session flow working when the request is stateful.
        if ($request->hasSession()) {
            Auth::login($user);
            $request->session()->regenerate();
        }

        $abilities = $this->abilitiesFor($user);
        $deviceName = $request->string('device_name')->toString() ?: 'api-token';

        $token = $user->createToken($deviceName, $abilities);

        $user->load('prayerPreference');

        return ApiResponse::success([
            'user' => new UserResource($user),
            'token' => $token->plainTextToken,
            'token_type' => 'Bearer',
            'abilities' => $abilities,
        ], 'Authentication successful.');
    }

    /**
     * Register a new standard user.
     */
    public function register(RegisterRequest $request): JsonResponse
    {
        if (! config('auth.registration_enabled', true)) {
            return ApiResponse::error('Registration is disabled.', 403);
        }

        $user = User::create([
            'name' => $request->string('name'),
            'email' => $request->string('email'),
            'password' => Hash::make($request->string('password')),
            'role' => UserRole::User,
            'is_active' => true,
        ]);

        Auth::login($user);

        if ($request->hasSession()) {
            $request->session()->regenerate();
        }

        $user->load('prayerPreference');

        return ApiResponse::success([
            'user' => new UserResource($user),
        ], 'Registration successful.', 201);
    }

    /**
     * Return the authenticated user's profile.
     */
    public function me(Request $request): JsonResponse
    {
        $user = $request->user();
        $user->load('prayerPreference');

        return ApiResponse::success([
            'user' => new UserResource($user),
        ]);
    }

    /**
     * Update the authenticated user's profile and prayer preferences.
     */
    public function updateProfile(UpdateProfileRequest $request): JsonResponse
    {
        $user = $request->user();

        DB::transaction(function () use ($request, $user): void {
            if ($request->has('name')) {
                $user->name = $request->string('name')->toString();
                $user->save();
            }

            $preferenceKeys = [
                'timezone',
                'calculation_method',
                'latitude',
                'longitude',
                'notifications_enabled',
            ];

            if ($request->hasAny($preferenceKeys)) {
                $preference = $user->prayerPreference()->firstOrNew();
                $preference->fill($request->only($preferenceKeys));
                $preference->user_id = $user->id;
                $preference->save();
            }
        });

        $user->refresh()->load('prayerPreference');

        return ApiResponse::success([
            'user' => new UserResource($user),
        ], 'Profile updated successfully.');
    }

    /**
     * Log out the authenticated user and revoke the current access token.
     */
    public function logout(Request $request): JsonResponse
    {
        $user = $request->user();
        $currentToken = $user?->currentAccessToken();

        if ($currentToken instanceof PersonalAccessToken) {
            $currentToken->delete();
        }

        // Always clear the resolved web guard user, then invalidate the SPA
        // session when cookie authentication is actually in use.
        Auth::guard('web')->logout();

        if ($request->hasSession()) {
            $request->session()->invalidate();
            $request->session()->regenerateToken();
        }

        return ApiResponse::success(null, 'Logged out successfully.');
    }

    /**
     * Resolve the token abilities granted to a user role.
     *
     * @return list<string>
     */
    private function abilitiesFor(User $user): array
    {
        return match ($user->role) {
            UserRole::Admin => ['*'],
            default => [
                'profile:read',
                'profile:update',
                'activities:read',
                'activities:write',
            ],
        };
    }
}
