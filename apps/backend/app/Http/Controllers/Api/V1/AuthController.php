<?php

namespace App\Http\Controllers\Api\V1;

use App\Enums\PrayerCalculationMethod;
use App\Enums\UserRole;
use App\Http\Controllers\Controller;
use App\Http\Requests\ForgotPasswordRequest;
use App\Http\Requests\LoginRequest;
use App\Http\Requests\RegisterRequest;
use App\Http\Requests\ResetPasswordRequest;
use App\Http\Requests\UpdatePasswordRequest;
use App\Http\Requests\UpdateProfileRequest;
use App\Http\Resources\UserResource;
use App\Http\Responses\ApiResponse;
use App\Models\User;
use App\Models\UserPrayerPreference;
use Illuminate\Auth\Events\Verified;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
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

        if ($user->suspended_at !== null) {
            throw ValidationException::withMessages([
                'email' => ['This account has been suspended. Please contact an administrator.'],
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

        try {
            $user->sendEmailVerificationNotification();
        } catch (\Throwable $exception) {
            // Never fail registration because the verification email could not be sent.
            Log::error('Unable to send the email verification notification.', [
                'user_id' => $user->id,
                'exception' => $exception,
            ]);
        }

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
     * Verify the user's email address from a signed verification link.
     */
    public function verifyEmail(Request $request, string $id, string $hash): RedirectResponse
    {
        if (! $request->hasValidSignature()) {
            return redirect()->away($this->frontendUrl('/login?verified=0'));
        }

        $user = User::query()->find($id);

        if ($user === null
            || ! hash_equals((string) $user->getKey(), $id)
            || ! hash_equals(sha1($user->getEmailForVerification()), $hash)) {
            return redirect()->away($this->frontendUrl('/login?verified=0'));
        }

        if (! $user->hasVerifiedEmail()) {
            $user->markEmailAsVerified();

            event(new Verified($user));
        }

        return redirect()->away($this->frontendUrl('/login?verified=1'));
    }

    /**
     * Resend the email verification notification.
     */
    public function resendEmailVerification(Request $request): JsonResponse
    {
        $user = $request->user();

        if ($user->hasVerifiedEmail()) {
            return ApiResponse::success(null, 'Email address is already verified.');
        }

        $user->sendEmailVerificationNotification();

        return ApiResponse::success(null, 'Verification email sent.');
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
            }

            if ($request->has('email')) {
                $email = $request->string('email')->toString();

                if ($email !== $user->email) {
                    $user->email = $email;
                    $user->email_verified_at = null;
                }
            }

            if ($request->has('bio')) {
                $user->bio = $request->input('bio');
            }

            if ($user->isDirty()) {
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
     * Update the authenticated user's password.
     */
    public function updatePassword(UpdatePasswordRequest $request): JsonResponse
    {
        $user = $request->user();

        if (! Hash::check($request->string('current_password')->toString(), $user->password)) {
            throw ValidationException::withMessages([
                'current_password' => ['The current password is incorrect.'],
            ]);
        }

        $user->password = $request->string('password')->toString();
        $user->save();

        $currentToken = $user->currentAccessToken();

        if ($currentToken instanceof PersonalAccessToken) {
            $user->tokens()->where('id', '!=', $currentToken->getKey())->delete();
        }

        return ApiResponse::success(null, 'Password updated successfully.');
    }

    /**
     * Send a one-time password reset code for the supplied email address.
     */
    public function forgotPassword(ForgotPasswordRequest $request): JsonResponse
    {
        $email = $request->string('email')->toString();
        $user = User::query()->where('email', $email)->first();
        $data = ['email' => $email];
        $message = 'If the account exists, a one-time code has been sent.';

        if ($user === null) {
            // Never disclose whether an account exists.
            return ApiResponse::success($data, $message);
        }

        if (Password::broker()->getRepository()->recentlyCreatedToken($user)) {
            return ApiResponse::error('Please wait before requesting another code.', 429);
        }

        // Store a hashed six-digit code in the password reset repository so the
        // existing broker can validate it when the user resets their password.
        $code = str_pad((string) random_int(0, 999999), 6, '0', STR_PAD_LEFT);
        $table = (string) config('auth.passwords.users.table', 'password_reset_tokens');

        DB::table($table)->updateOrInsert(
            ['email' => $email],
            ['token' => Hash::make($code), 'created_at' => now()],
        );

        $user->sendPasswordResetNotification($code);

        return ApiResponse::success($data, $message);
    }

    /**
     * Reset the user's password using an emailed one-time code.
     */
    public function resetPassword(ResetPasswordRequest $request): JsonResponse
    {
        $status = Password::reset(
            $request->only('email', 'password', 'password_confirmation', 'token'),
            function (User $user, string $password): void {
                $user->forceFill([
                    'password' => Hash::make($password),
                    'invitation_accepted_at' => $user->invitation_accepted_at ?? now(),
                ]);

                if ($user->email_verified_at === null) {
                    $user->email_verified_at = now();
                }

                $user->save();

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
     * Build an absolute URL for the configured SPA.
     */
    private function frontendUrl(string $path): string
    {
        $baseUrl = rtrim((string) config('app.frontend_url', config('app.url')), '/');

        return $baseUrl.$path;
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
