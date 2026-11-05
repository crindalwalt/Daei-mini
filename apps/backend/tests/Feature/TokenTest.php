<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class TokenTest extends TestCase
{
    use RefreshDatabase;

    public function test_user_can_issue_personal_access_token_with_valid_credentials(): void
    {
        $user = User::factory()->create([
            'email' => 'tokenuser@thinkcode.dev',
            'password' => Hash::make('SecretPass123!'),
        ]);

        $response = $this->postJson('/api/v1/tokens', [
            'email' => 'tokenuser@thinkcode.dev',
            'password' => 'SecretPass123!',
            'token_name' => 'ci-pipeline',
            'abilities' => ['tasks:read'],
        ]);

        $response->assertStatus(201)
            ->assertJsonStructure([
                'token',
                'token_type',
                'abilities',
                'expires_at',
                'message',
            ])
            ->assertJson([
                'token_type' => 'Bearer',
                'abilities' => ['tasks:read'],
            ]);

        $this->assertNotEmpty($response->json('token'));
        $this->assertNotEmpty($response->json('expires_at'));
    }

    public function test_token_issuance_fails_with_invalid_credentials(): void
    {
        User::factory()->create([
            'email' => 'tokenuser@thinkcode.dev',
            'password' => Hash::make('SecretPass123!'),
        ]);

        $response = $this->postJson('/api/v1/tokens', [
            'email' => 'tokenuser@thinkcode.dev',
            'password' => 'WrongPassword!',
            'token_name' => 'ci-pipeline',
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['email']);
    }

    public function test_authenticated_user_can_list_active_tokens_without_raw_secrets(): void
    {
        $user = User::factory()->create();

        $user->createToken('token-one', ['*'], now()->addDays(7));
        $user->createToken('token-two', ['read'], now()->addDays(7));

        Sanctum::actingAs($user);

        $response = $this->getJson('/api/v1/tokens');

        $response->assertStatus(200)
            ->assertJsonStructure([
                'tokens' => [
                    '*' => [
                        'id',
                        'name',
                        'abilities',
                        'last_used_at',
                        'expires_at',
                        'created_at',
                    ],
                ],
            ]);

        $this->assertCount(2, $response->json('tokens'));
        // Verify raw token secret is never in the list
        $response->assertJsonMissingPath('tokens.0.token');
    }

    public function test_authenticated_user_can_revoke_specific_token(): void
    {
        $user = User::factory()->create();
        $token = $user->createToken('token-to-revoke');

        Sanctum::actingAs($user);

        $response = $this->deleteJson('/api/v1/tokens/'.$token->accessToken->id);

        $response->assertStatus(200)
            ->assertJson([
                'message' => 'Token revoked successfully.',
            ]);

        $this->assertDatabaseMissing('personal_access_tokens', [
            'id' => $token->accessToken->id,
        ]);
    }

    public function test_authenticated_user_cannot_revoke_token_belonging_to_another_user(): void
    {
        $userA = User::factory()->create();
        $userB = User::factory()->create();

        $tokenB = $userB->createToken('user-b-token');

        Sanctum::actingAs($userA);

        $response = $this->deleteJson('/api/v1/tokens/'.$tokenB->accessToken->id);

        $response->assertStatus(404);

        $this->assertDatabaseHas('personal_access_tokens', [
            'id' => $tokenB->accessToken->id,
        ]);
    }
}

