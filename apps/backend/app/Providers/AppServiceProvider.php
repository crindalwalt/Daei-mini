<?php

namespace App\Providers;

use App\Models\User;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        // Rate limiter for authentication attempts (email + IP)
        RateLimiter::for('login', function (Request $request) {
            $throttleKey = strtolower((string) $request->input('email')).'|'.$request->ip();
            return Limit::perMinute(5)->by($throttleKey)->response(function () {
                return response()->json([
                    'message' => 'Too many login attempts. Please try again later.',
                ], 429);
            });
        });

        // Rate limiter for personal access token issuance
        RateLimiter::for('tokens', function (Request $request) {
            $throttleKey = strtolower((string) $request->input('email')).'|'.$request->ip();
            return Limit::perMinute(5)->by($throttleKey)->response(function () {
                return response()->json([
                    'message' => 'Too many token generation attempts. Please try again later.',
                ], 429);
            });
        });

        // Demonstration Gate for authorization foundation
        Gate::define('view-admin-dashboard', function (User $user) {
            return str_ends_with($user->email, '@thinkcode.dev')
                || $user->email === 'admin@thinkcode.dev';
        });
    }
}
