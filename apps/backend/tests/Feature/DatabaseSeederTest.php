<?php

namespace Tests\Feature;

use App\Models\User;
use Database\Seeders\DatabaseSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class DatabaseSeederTest extends TestCase
{
    use RefreshDatabase;

    public function test_seeder_creates_demo_admin_in_local_or_testing_environment(): void
    {
        $this->seed(DatabaseSeeder::class);

        $this->assertDatabaseHas('users', [
            'email' => 'admin@thinkcode.dev',
            'name' => 'ThinkCode Admin',
        ]);
    }

    public function test_seeder_skips_demo_admin_in_production_environment(): void
    {
        $this->app->detectEnvironment(fn () => 'production');

        $this->seed(DatabaseSeeder::class);

        $this->assertDatabaseMissing('users', [
            'email' => 'admin@thinkcode.dev',
        ]);
    }
}

