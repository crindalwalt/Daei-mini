<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class HealthTest extends TestCase
{
    use RefreshDatabase;

    public function test_health_liveness_endpoint_returns_ok(): void
    {
        $response = $this->getJson('/api/v1/health/live');

        $response->assertStatus(200)
            ->assertJson([
                'status' => 'ok',
            ])
            ->assertJsonStructure([
                'status',
                'timestamp',
            ]);
    }

    public function test_health_readiness_endpoint_returns_healthy(): void
    {
        $response = $this->getJson('/api/v1/health/ready');

        $response->assertStatus(200)
            ->assertJson([
                'status' => 'healthy',
            ])
            ->assertJsonStructure([
                'status',
                'timestamp',
                'environment',
                'services' => [
                    'database' => [
                        'status',
                    ],
                ],
            ]);
    }

    public function test_legacy_health_endpoint_routes_to_readiness(): void
    {
        $response = $this->getJson('/api/v1/health');

        $response->assertStatus(200)
            ->assertJson([
                'status' => 'healthy',
            ]);
    }

    public function test_production_health_check_protects_internal_version_disclosure(): void
    {
        config(['app.env' => 'production', 'app.debug' => false]);

        $response = $this->getJson('/api/v1/health/ready');

        $response->assertStatus(200)
            ->assertJsonMissingPath('version')
            ->assertJsonMissingPath('services.database.driver');
    }
}
