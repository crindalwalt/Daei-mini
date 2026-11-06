<?php

namespace Database\Seeders;

use App\Enums\UserRole;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class AdminUserSeeder extends Seeder
{
    /**
     * Seed the initial administrator account.
     */
    public function run(): void
    {
        $password = env('ADMIN_PASSWORD');

        if (app()->isProduction() && blank($password)) {
            $this->command?->warn(
                'Skipping administrator seeding: set ADMIN_PASSWORD to create the initial production administrator.'
            );

            return;
        }

        $email = (string) env('ADMIN_EMAIL', 'admin@thinkcode.dev');
        $name = (string) env('ADMIN_NAME', 'ThinkCode Admin');

        $admin = User::firstOrCreate(
            ['email' => $email],
            [
                'name' => $name,
                'password' => Hash::make($password ?? 'password'),
                'role' => UserRole::Admin,
                'is_active' => true,
            ]
        );

        if ($admin->email_verified_at === null) {
            $admin->forceFill(['email_verified_at' => now()])->save();
        }
    }
}
