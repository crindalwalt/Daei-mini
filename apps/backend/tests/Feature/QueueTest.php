<?php

namespace Tests\Feature;

use App\Jobs\ProcessExampleJob;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Queue;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class QueueTest extends TestCase
{
    use RefreshDatabase;

    public function test_queue_job_can_be_dispatched(): void
    {
        Queue::fake();

        $user = User::factory()->create([
            'email' => 'worker@thinkcode.dev',
        ]);

        Sanctum::actingAs($user);

        $response = $this->postJson('/api/v1/queue-test');

        $response->assertStatus(200)
            ->assertJson([
                'status' => 'queued',
                'message' => 'Job dispatched to Redis queue successfully.',
            ]);

        Queue::assertPushed(ProcessExampleJob::class);
    }
}

