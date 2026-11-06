<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class AuthorizationTest extends TestCase
{
    use RefreshDatabase;

    public function test_unauthenticated_access_returns_401(): void
    {
        $response = $this->getJson('/api/v1/admin-check');

        $response->assertStatus(401)
            ->assertJson([
                'message' => 'Unauthenticated.',
            ]);
    }

    public function test_unauthorized_user_receives_403(): void
    {
        $regularUser = User::factory()->create([
            'email' => 'regular@clientdomain.com',
        ]);

        Sanctum::actingAs($regularUser);

        $response = $this->getJson('/api/v1/admin-check');

        $response->assertStatus(403)
            ->assertJson([
                'message' => 'This action is unauthorized.',
            ]);
    }

    public function test_authorized_user_receives_200(): void
    {
        $adminUser = User::factory()->admin()->create([
            'email' => 'admin@thinkcode.dev',
        ]);

        Sanctum::actingAs($adminUser);

        $response = $this->getJson('/api/v1/admin-check');

        $response->assertStatus(200)
            ->assertJson([
                'message' => 'Welcome to the authorized admin area.',
                'user' => 'admin@thinkcode.dev',
            ]);
    }
}
