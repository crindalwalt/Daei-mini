<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

// Scheduled maintenance tasks configured with concurrency locks for multi-container clusters
Schedule::command('model:prune')
    ->daily()
    ->withoutOverlapping()
    ->onOneServer();

// Prune expired Sanctum personal access tokens daily
Schedule::command('sanctum:prune-expired --hours=24')
    ->daily()
    ->withoutOverlapping()
    ->onOneServer();
