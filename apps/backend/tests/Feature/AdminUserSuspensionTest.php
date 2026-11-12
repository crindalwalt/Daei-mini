<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class AdminUserSuspensionTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_can_suspend_a_user_and_revoke_their_tokens(): void
    {
        $admin = User::factory()->admin()->create();
        $user = User::factory()->create();
        $user->createToken('existing-session');

        Sanctum::actingAs($admin);

        $response = $this->postJson("/api/v1/admin/users/{$user->id}/toggle-suspension");

        $response->assertOk()
            ->assertJsonPath('data.user.status', 'suspended')
            ->assertJsonPath('data.user.is_suspended', true)
            ->assertJsonPath('message', 'User suspended.');

        $this->assertNotNull($user->refresh()->suspended_at);
        $this->assertSame(0, $user->tokens()->count());
        $this->assertTrue($user->is_active, 'Suspension must not change the activation state.');
    }

    public function test_admin_can_lift_a_suspension(): void
    {
        $admin = User::factory()->admin()->create();
        $user = User::factory()->create(['suspended_at' => now()]);

        Sanctum::actingAs($admin);

        $response = $this->postJson("/api/v1/admin/users/{$user->id}/toggle-suspension");

        $response->assertOk()
            ->assertJsonPath('data.user.status', 'active')
            ->assertJsonPath('data.user.is_suspended', false)
            ->assertJsonPath('message', 'User suspension lifted.');

        $this->assertNull($user->refresh()->suspended_at);
    }

    public function test_suspended_user_cannot_log_in(): void
    {
        $user = User::factory()->create([
            'email' => 'suspended@thinkcode.dev',
            'suspended_at' => now(),
        ]);

        $response = $this->postJson('/api/v1/auth/login', [
            'email' => $user->email,
            'password' => 'password',
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['email']);

        $this->assertStringContainsString(
            'suspended',
            $response->json('errors.email.0'),
        );
    }

    public function test_suspended_user_cannot_use_an_authenticated_session(): void
    {
        $user = User::factory()->create(['suspended_at' => now()]);

        Sanctum::actingAs($user);

        $this->getJson('/api/v1/auth/me')
            ->assertStatus(403)
            ->assertJsonPath('message', 'Your account has been suspended. Please contact an administrator.');
    }

    public function test_suspended_user_cannot_request_a_personal_access_token(): void
    {
        $user = User::factory()->create([
            'email' => 'suspended-token@thinkcode.dev',
            'suspended_at' => now(),
        ]);

        $this->postJson('/api/v1/tokens', [
            'email' => $user->email,
            'password' => 'password',
            'token_name' => 'cli',
        ])->assertStatus(422)
            ->assertJsonValidationErrors(['email']);
    }

    public function test_admin_cannot_suspend_their_own_account(): void
    {
        $admin = User::factory()->admin()->create();

        Sanctum::actingAs($admin);

        $this->postJson("/api/v1/admin/users/{$admin->id}/toggle-suspension")
            ->assertStatus(422);

        $this->assertNull($admin->refresh()->suspended_at);
    }

    public function test_regular_users_cannot_suspend_accounts(): void
    {
        $user = User::factory()->create();
        $target = User::factory()->create();

        Sanctum::actingAs($user);

        $this->postJson("/api/v1/admin/users/{$target->id}/toggle-suspension")
            ->assertStatus(403);

        $this->assertNull($target->refresh()->suspended_at);
    }

    public function test_deactivation_still_works_independently_from_suspension(): void
    {
        $admin = User::factory()->admin()->create();
        $user = User::factory()->create();

        Sanctum::actingAs($admin);

        $this->postJson("/api/v1/admin/users/{$user->id}/toggle-status")
            ->assertOk()
            ->assertJsonPath('data.user.status', 'inactive');

        $this->assertFalse($user->refresh()->is_active);
        $this->assertNull($user->suspended_at);

        $this->postJson("/api/v1/admin/users/{$user->id}/toggle-status")
            ->assertOk()
            ->assertJsonPath('data.user.status', 'active');

        $this->assertTrue($user->refresh()->is_active);
        $this->assertNull($user->suspended_at);
    }
}
