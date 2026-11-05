<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
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
            ->assertJsonStructure([
                'user' => [
                    'id',
                    'name',
                    'email',
                ],
                'message',
            ]);

        $this->assertDatabaseHas('users', [
            'email' => 'alice@thinkcode.dev',
            'name' => 'Alice Engineer',
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
            ->assertJsonValidationErrors(['name', 'email', 'password']);
    }

    public function test_user_can_login_with_valid_credentials(): void
    {
        $user = User::factory()->create([
            'email' => 'bob@thinkcode.dev',
            'password' => Hash::make('SecretPass123!'),
        ]);

        $response = $this->postJson('/api/v1/auth/login', [
            'email' => 'bob@thinkcode.dev',
            'password' => 'SecretPass123!',
        ]);

        $response->assertStatus(200)
            ->assertJson([
                'user' => [
                    'id' => $user->id,
                    'email' => 'bob@thinkcode.dev',
                ],
                'message' => 'Authentication successful.',
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
            ->assertJsonValidationErrors(['email']);
    }

    public function test_authenticated_user_can_access_me_endpoint(): void
    {
        $user = User::factory()->create([
            'email' => 'dan@thinkcode.dev',
        ]);

        Sanctum::actingAs($user);

        $response = $this->getJson('/api/v1/auth/me');

        $response->assertStatus(200)
            ->assertJson([
                'user' => [
                    'id' => $user->id,
                    'email' => 'dan@thinkcode.dev',
                ],
            ]);
    }

    public function test_unauthenticated_request_returns_401(): void
    {
        $response = $this->getJson('/api/v1/auth/me');

        $response->assertStatus(401)
            ->assertJson([
                'message' => 'Unauthenticated.',
            ]);
    }

    public function test_user_can_logout(): void
    {
        $user = User::factory()->create();

        Sanctum::actingAs($user);

        $response = $this->postJson('/api/v1/auth/logout');

        $response->assertStatus(200)
            ->assertJson([
                'message' => 'Logged out successfully.',
            ]);
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
}

