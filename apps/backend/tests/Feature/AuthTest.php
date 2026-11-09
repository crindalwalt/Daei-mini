<?php

namespace Tests\Feature;

use App\Enums\UserRole;
use App\Models\User;
use App\Notifications\ResetPasswordOtpNotification;
use Illuminate\Auth\Notifications\VerifyEmail;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\URL;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class AuthTest extends TestCase
{
    use RefreshDatabase;

    public function test_user_can_register_with_valid_data(): void
    {
        $payload = [
            'name' => 'Alice Engineer',
            'email' => 'alice@thinkcode.dev',
            'password' => 'SecurePass123!',
            'password_confirmation' => 'SecurePass123!',
        ];

        $response = $this->postJson('/api/v1/auth/register', $payload);

        $response->assertStatus(201)
            ->assertJson([
                'success' => true,
                'message' => 'Registration successful.',
                'data' => [
                    'user' => [
                        'name' => 'Alice Engineer',
                        'email' => 'alice@thinkcode.dev',
                        'role' => 'user',
                    ],
                ],
            ]);

        $this->assertDatabaseHas('users', [
            'email' => 'alice@thinkcode.dev',
            'name' => 'Alice Engineer',
            'role' => UserRole::User->value,
        ]);
    }

    public function test_registration_validation_fails_with_invalid_input(): void
    {
        $response = $this->postJson('/api/v1/auth/register', [
            'name' => '',
            'email' => 'not-an-email',
            'password' => 'short',
            'password_confirmation' => 'mismatch',
        ]);

        $response->assertStatus(422)
            ->assertJson(['success' => false])
            ->assertJsonValidationErrors(['name', 'email', 'password']);
    }

    public function test_registration_sends_an_email_verification_notification(): void
    {
        Notification::fake();

        $this->postJson('/api/v1/auth/register', [
            'name' => 'Unverified User',
            'email' => 'unverified@thinkcode.dev',
            'password' => 'SecurePass123!',
            'password_confirmation' => 'SecurePass123!',
        ])->assertStatus(201);

        $user = User::query()->where('email', 'unverified@thinkcode.dev')->firstOrFail();

        $this->assertNull($user->email_verified_at);
        Notification::assertSentTo($user, VerifyEmail::class);
    }

    public function test_user_can_verify_email_with_a_signed_link(): void
    {
        $user = User::factory()->unverified()->create([
            'email' => 'verify@thinkcode.dev',
        ]);

        $url = URL::temporarySignedRoute('verification.verify', now()->addMinutes(60), [
            'id' => $user->id,
            'hash' => sha1($user->getEmailForVerification()),
        ]);

        $this->get($url)->assertRedirect(
            rtrim((string) config('app.frontend_url'), '/').'/login?verified=1',
        );

        $this->assertNotNull($user->refresh()->email_verified_at);
    }

    public function test_email_verification_rejects_an_invalid_signature(): void
    {
        $user = User::factory()->unverified()->create([
            'email' => 'invalid-verify@thinkcode.dev',
        ]);

        $url = route('verification.verify', [
            'id' => $user->id,
            'hash' => sha1($user->getEmailForVerification()),
        ]);

        $this->get($url)->assertRedirect(
            rtrim((string) config('app.frontend_url'), '/').'/login?verified=0',
        );

        $this->assertNull($user->refresh()->email_verified_at);
    }

    public function test_unverified_user_can_request_another_verification_email(): void
    {
        Notification::fake();

        $user = User::factory()->unverified()->create();
        Sanctum::actingAs($user);

        $this->postJson('/api/v1/auth/email/verification-notification')
            ->assertStatus(200)
            ->assertJson([
                'success' => true,
                'message' => 'Verification email sent.',
            ]);

        Notification::assertSentTo($user, VerifyEmail::class);
    }

    public function test_seeded_admin_can_login_and_receives_admin_token(): void
    {
        $this->seed();

        $response = $this->postJson('/api/v1/auth/login', [
            'email' => 'admin@thinkcode.dev',
            'password' => 'password',
        ]);

        $response->assertStatus(200)
            ->assertJson([
                'success' => true,
                'message' => 'Authentication successful.',
                'data' => [
                    'token_type' => 'Bearer',
                    'abilities' => ['*'],
                    'user' => [
                        'email' => 'admin@thinkcode.dev',
                        'role' => 'admin',
                        'roles' => ['admin'],
                    ],
                ],
            ])
            ->assertJsonStructure([
                'success',
                'message',
                'data' => [
                    'user' => ['id', 'uuid', 'name', 'email', 'role', 'roles', 'is_active', 'email_verified'],
                    'token',
                    'token_type',
                    'abilities',
                ],
            ]);

        $this->assertNotEmpty($response->json('data.token'));
        $this->assertDatabaseCount('personal_access_tokens', 1);
    }

    public function test_seeded_standard_user_can_login_with_limited_abilities(): void
    {
        $this->seed();

        $response = $this->postJson('/api/v1/auth/login', [
            'email' => 'user@thinkcode.dev',
            'password' => 'password',
            'device_name' => 'iphone-15',
        ]);

        $response->assertStatus(200)
            ->assertJson([
                'success' => true,
                'data' => [
                    'abilities' => [
                        'profile:read',
                        'profile:update',
                        'activities:read',
                        'activities:write',
                    ],
                    'user' => [
                        'email' => 'user@thinkcode.dev',
                        'role' => 'user',
                    ],
                ],
            ]);

        $this->assertDatabaseHas('personal_access_tokens', [
            'name' => 'iphone-15',
        ]);
    }

    public function test_login_fails_with_invalid_credentials(): void
    {
        User::factory()->create([
            'email' => 'carol@thinkcode.dev',
            'password' => Hash::make('SecretPass123!'),
        ]);

        $response = $this->postJson('/api/v1/auth/login', [
            'email' => 'carol@thinkcode.dev',
            'password' => 'WrongPassword!',
        ]);

        $response->assertStatus(422)
            ->assertJson(['success' => false])
            ->assertJsonValidationErrors(['email']);
    }

    public function test_login_fails_for_deactivated_account(): void
    {
        User::factory()->create([
            'email' => 'inactive@thinkcode.dev',
            'password' => Hash::make('SecretPass123!'),
            'is_active' => false,
        ]);

        $response = $this->postJson('/api/v1/auth/login', [
            'email' => 'inactive@thinkcode.dev',
            'password' => 'SecretPass123!',
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['email']);
    }

    public function test_authenticated_user_can_access_me_endpoint(): void
    {
        $user = User::factory()->create([
            'email' => 'dan@thinkcode.dev',
        ]);

        $user->prayerPreference()->create([
            'timezone' => 'Asia/Riyadh',
            'calculation_method' => 'muslim_world_league',
            'latitude' => 24.7136,
            'longitude' => 46.6753,
            'notifications_enabled' => true,
        ]);

        Sanctum::actingAs($user);

        $response = $this->getJson('/api/v1/auth/me');

        $response->assertStatus(200)
            ->assertJson([
                'success' => true,
                'data' => [
                    'user' => [
                        'id' => $user->id,
                        'email' => 'dan@thinkcode.dev',
                        'role' => 'user',
                        'roles' => ['user'],
                        'prayer_preferences' => [
                            'timezone' => 'Asia/Riyadh',
                            'calculation_method' => 'muslim_world_league',
                            'notifications_enabled' => true,
                        ],
                    ],
                ],
            ])
            ->assertJsonMissingPath('data.user.password')
            ->assertJsonMissingPath('data.user.remember_token')
            ->assertJsonMissingPath('data.user.created_at')
            ->assertJsonMissingPath('data.user.updated_at');
    }

    public function test_unauthenticated_request_returns_401(): void
    {
        $response = $this->getJson('/api/v1/auth/me');

        $response->assertStatus(401)
            ->assertJson([
                'success' => false,
                'message' => 'Unauthenticated.',
            ]);
    }

    public function test_authenticated_user_can_update_profile(): void
    {
        $user = User::factory()->create(['name' => 'Old Name']);

        Sanctum::actingAs($user);

        $response = $this->patchJson('/api/v1/auth/profile', [
            'name' => 'New Name',
            'timezone' => 'Europe/London',
        ]);

        $response->assertStatus(200)
            ->assertJson([
                'success' => true,
                'message' => 'Profile updated successfully.',
                'data' => [
                    'user' => [
                        'name' => 'New Name',
                        'prayer_preferences' => [
                            'timezone' => 'Europe/London',
                        ],
                    ],
                ],
            ]);

        $this->assertDatabaseHas('users', [
            'id' => $user->id,
            'name' => 'New Name',
        ]);

        $this->assertDatabaseHas('user_prayer_preferences', [
            'user_id' => $user->id,
            'timezone' => 'Europe/London',
        ]);
    }

    public function test_profile_update_validates_timezone(): void
    {
        Sanctum::actingAs(User::factory()->create());

        $this->patchJson('/api/v1/auth/profile', [
            'timezone' => 'Mars/Olympus_Mons',
        ])->assertStatus(422)
            ->assertJsonValidationErrors(['timezone']);
    }

    public function test_logout_revokes_the_current_access_token(): void
    {
        $user = User::factory()->create([
            'password' => Hash::make('SecretPass123!'),
        ]);

        $token = $this->postJson('/api/v1/auth/login', [
            'email' => $user->email,
            'password' => 'SecretPass123!',
        ])->json('data.token');

        $this->assertDatabaseCount('personal_access_tokens', 1);

        $this->withHeader('Authorization', 'Bearer '.$token)
            ->postJson('/api/v1/auth/logout')
            ->assertStatus(200)
            ->assertJson([
                'success' => true,
                'message' => 'Logged out successfully.',
            ]);

        $this->assertDatabaseCount('personal_access_tokens', 0);

        // Clear the cached guard instance so the revoked token is re-evaluated.
        Auth::forgetGuards();

        $this->withHeader('Authorization', 'Bearer '.$token)
            ->getJson('/api/v1/auth/me')
            ->assertStatus(401);
    }

    public function test_login_rate_limiting_triggers_after_max_attempts(): void
    {
        $email = 'bruteforce@thinkcode.dev';

        // Perform 5 failed attempts (allowed threshold)
        for ($i = 0; $i < 5; $i++) {
            $this->postJson('/api/v1/auth/login', [
                'email' => $email,
                'password' => 'WrongPassword!',
            ])->assertStatus(422);
        }

        // 6th attempt must be throttled with 429 Too Many Requests
        $response = $this->postJson('/api/v1/auth/login', [
            'email' => $email,
            'password' => 'WrongPassword!',
        ]);

        $response->assertStatus(429)
            ->assertJson([
                'success' => false,
                'message' => 'Too many login attempts. Please try again later.',
            ]);
    }

    public function test_registration_can_be_disabled_via_configuration(): void
    {
        config(['auth.registration_enabled' => false]);

        $payload = [
            'name' => 'Eve Attacker',
            'email' => 'eve@thinkcode.dev',
            'password' => 'SecurePass123!',
            'password_confirmation' => 'SecurePass123!',
        ];

        $response = $this->postJson('/api/v1/auth/register', $payload);

        $response->assertStatus(403)
            ->assertJson([
                'success' => false,
                'message' => 'Registration is disabled.',
            ]);

        $this->assertDatabaseMissing('users', [
            'email' => 'eve@thinkcode.dev',
        ]);
    }

    public function test_login_failure_does_not_reveal_user_existence(): void
    {
        // Non-existent email
        $responseNonExistent = $this->postJson('/api/v1/auth/login', [
            'email' => 'doesnotexist@thinkcode.dev',
            'password' => 'RandomPassword123!',
        ]);

        // Existing email with wrong password
        User::factory()->create(['email' => 'exists@thinkcode.dev']);
        $responseExisting = $this->postJson('/api/v1/auth/login', [
            'email' => 'exists@thinkcode.dev',
            'password' => 'WrongPassword123!',
        ]);

        $responseNonExistent->assertStatus(422);
        $responseExisting->assertStatus(422);

        $this->assertEquals(
            $responseNonExistent->json('errors.email'),
            $responseExisting->json('errors.email')
        );
    }

    public function test_forgot_password_is_silent_for_unknown_email(): void
    {
        $response = $this->postJson('/api/v1/auth/forgot-password', [
            'email' => 'nobody@thinkcode.dev',
        ]);

        $response->assertStatus(200)
            ->assertJson([
                'success' => true,
                'message' => 'If the account exists, a one-time code has been sent.',
                'data' => ['email' => 'nobody@thinkcode.dev'],
            ])
            ->assertJsonMissingPath('data.reset_token');

        $this->assertDatabaseMissing('password_reset_tokens', [
            'email' => 'nobody@thinkcode.dev',
        ]);
    }

    public function test_forgot_password_emails_a_six_digit_one_time_code(): void
    {
        Notification::fake();

        $user = User::factory()->create([
            'email' => 'otp@thinkcode.dev',
        ]);

        $this->postJson('/api/v1/auth/forgot-password', [
            'email' => 'otp@thinkcode.dev',
        ])->assertStatus(200)
            ->assertJsonPath('success', true);

        Notification::assertSentTo(
            $user,
            ResetPasswordOtpNotification::class,
            function (ResetPasswordOtpNotification $notification): bool {
                $this->assertMatchesRegularExpression('/^\d{6}$/', $notification->code);

                return true;
            },
        );
    }

    public function test_user_can_reset_password_with_issued_one_time_code(): void
    {
        $user = User::factory()->create([
            'email' => 'reset@thinkcode.dev',
            'password' => Hash::make('OldPassword123!'),
        ]);

        // An existing token must be revoked by the credential reset.
        $user->createToken('existing-session');

        $this->assertDatabaseCount('personal_access_tokens', 1);

        $token = $this->postJson('/api/v1/auth/forgot-password', [
            'email' => 'reset@thinkcode.dev',
        ])->assertStatus(200)
            ->assertJsonPath('success', true)
            ->assertJsonPath('message', 'If the account exists, a one-time code has been sent.')
            ->json('data.reset_token');

        $this->assertMatchesRegularExpression('/^\d{6}$/', $token);

        $this->assertDatabaseHas('password_reset_tokens', [
            'email' => 'reset@thinkcode.dev',
        ]);

        $this->postJson('/api/v1/auth/reset-password', [
            'email' => 'reset@thinkcode.dev',
            'token' => $token,
            'password' => 'NewPassword123!',
            'password_confirmation' => 'NewPassword123!',
        ])->assertStatus(200)
            ->assertJson([
                'success' => true,
                'message' => 'Password reset successfully.',
            ]);

        $this->assertTrue(Hash::check('NewPassword123!', $user->refresh()->password));
        $this->assertDatabaseMissing('password_reset_tokens', [
            'email' => 'reset@thinkcode.dev',
        ]);
        $this->assertDatabaseCount('personal_access_tokens', 0);
    }

    public function test_reset_password_rejects_invalid_token(): void
    {
        $user = User::factory()->create([
            'email' => 'invalid-reset@thinkcode.dev',
            'password' => Hash::make('OldPassword123!'),
        ]);

        $this->postJson('/api/v1/auth/reset-password', [
            'email' => 'invalid-reset@thinkcode.dev',
            'token' => 'not-a-real-token',
            'password' => 'NewPassword123!',
            'password_confirmation' => 'NewPassword123!',
        ])->assertStatus(422)
            ->assertJson(['success' => false])
            ->assertJsonValidationErrors('email');

        $this->assertTrue(Hash::check('OldPassword123!', $user->refresh()->password));
    }
}
