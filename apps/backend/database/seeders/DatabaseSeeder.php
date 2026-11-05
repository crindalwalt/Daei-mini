<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    /**
     * Seed the application's database with baseline development data.
     */
    public function run(): void
    {
        // Guard against seeding default demo credentials in production
        if (app()->isProduction()) {
            $this->command?->warn('Skipping default demo admin seeding in production environment.');
            return;
        }

        User::firstOrCreate(
            ['email' => 'admin@thinkcode.dev'],
            [
                'name' => 'ThinkCode Admin',
                'password' => Hash::make('password'),
                'email_verified_at' => now(),
            ]
        );
    }
}
