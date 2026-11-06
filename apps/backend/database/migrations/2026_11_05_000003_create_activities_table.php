<?php

use App\Enums\ActivityStatus;
use App\Enums\ActivityType;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('activities', function (Blueprint $table) {
            $table->id();
            $table->uuid('uuid')->unique();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('title');
            $table->text('description')->nullable();
            $table->enum('activity_type', array_column(ActivityType::cases(), 'value'))
                ->default(ActivityType::Other->value);
            $table->date('scheduled_date');
            $table->time('start_time')->nullable();
            $table->time('end_time')->nullable();
            $table->enum('status', array_column(ActivityStatus::cases(), 'value'))
                ->default(ActivityStatus::Pending->value);
            $table->boolean('reminder_enabled')->default(false);
            $table->timestamp('client_created_at')->nullable();
            $table->timestamp('client_updated_at')->nullable();
            $table->bigInteger('server_version')->default(1);
            $table->timestamp('synced_at')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->index(['user_id', 'scheduled_date']);
            $table->index(['user_id', 'status']);
            $table->index(['user_id', 'activity_type']);
            $table->index('synced_at');
        });

        if (DB::connection()->getDriverName() === 'pgsql') {
            DB::statement(
                'ALTER TABLE activities ADD CONSTRAINT activities_time_range_check '
                .'CHECK (start_time IS NULL OR end_time IS NULL OR end_time > start_time)'
            );
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('activities');
    }
};
