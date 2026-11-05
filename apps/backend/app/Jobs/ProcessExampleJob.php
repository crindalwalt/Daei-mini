<?php

namespace App\Jobs;

use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Facades\Log;

class ProcessExampleJob implements ShouldQueue
{
    use Queueable;

    public int $tries = 3;
    public int $timeout = 60;

    /**
     * Create a new job instance.
     *
     * @param array<string, mixed> $payload
     */
    public function __construct(
        public array $payload = []
    ) {}

    /**
     * Execute the job.
     */
    public function handle(): void
    {
        Log::info('ProcessExampleJob executed successfully', [
            'payload' => $this->payload,
            'processed_at' => now()->toISOString(),
        ]);
    }
}

