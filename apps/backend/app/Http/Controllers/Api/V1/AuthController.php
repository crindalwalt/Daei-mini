<?php

namespace App\Http\Controllers\Api\V1;

use App\Enums\PrayerCalculationMethod;
use App\Enums\UserRole;
use App\Http\Controllers\Controller;
use App\Http\Requests\ForgotPasswordRequest;
use App\Http\Requests\LoginRequest;
use App\Http\Requests\RegisterRequest;
use App\Http\Requests\ResetPasswordRequest;
use App\Http\Requests\UpdateProfileRequest;
use App\Http\Resources\UserResource;
use App\Http\Responses\ApiResponse;
use App\Models\User;
use App\Models\UserPrayerPreference;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Password;
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

        $user = DB::transaction(function () use ($request): User {
            $user = User::create([
                'name' => $request->string('name'),
                'email' => $request->string('email'),
                'password' => Hash::make($request->string('password')),
                'role' => UserRole::User,
                'is_active' => true,
            ]);

            UserPrayerPreference::create([
                'user_id' => $user->id,
                'timezone' => config('app.timezone', 'UTC'),
                'calculation_method' => PrayerCalculationMethod::MuslimWorldLeague,
                'notifications_enabled' => true,
            ]);

            return $user;
        });

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
     * Dispatch a password reset link for the supplied email address.
     */
    public function forgotPassword(ForgotPasswordRequest $request): JsonResponse
    {
        $email = $request->string('email')->toString();
        $user = User::query()->where('email', $email)->first();
        $data = ['email' => $email];

        if ($user === null) {
            // Never disclose whether an account exists.
            return ApiResponse::success($data, 'If the account exists, a reset link has been sent.');
        }

        if (Password::broker()->getRepository()->recentlyCreatedToken($user)) {
            return ApiResponse::error('Please wait before requesting another reset link.', 429);
        }

        // Create a single reset token, persist it, and email the reset link with that
        // same token. Creating a second token after sending would overwrite the stored
        // token, leaving the emailed link pointing at a token that no longer matches.
        $token = Password::broker()->createToken($user);
        $user->sendPasswordResetNotification($token);

        $data['reset_token'] = $token;

        return ApiResponse::success($data, 'If the account exists, a reset link has been sent.');
    }

    /**
     * Reset the user's password using a broker-issued token.
     */
    public function resetPassword(ResetPasswordRequest $request): JsonResponse
    {
        $status = Password::reset(
            $request->only('email', 'password', 'password_confirmation', 'token'),
            function (User $user, string $password): void {
                $user->forceFill([
                    'password' => Hash::make($password),
                ])->save();

                // Revoke every previously issued token after a credential reset.
                $user->tokens()->delete();
            },
        );

        if ($status !== Password::PASSWORD_RESET) {
            throw ValidationException::withMessages([
                'email' => [trans($status)],
            ]);
        }

        return ApiResponse::success(null, 'Password reset successfully.');
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
