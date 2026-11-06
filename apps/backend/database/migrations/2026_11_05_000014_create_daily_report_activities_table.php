<?php

use App\Enums\ActivityStatus;
use App\Enums\ActivityType;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('daily_report_activities', function (Blueprint $table) {
            $table->id();
            $table->foreignId('daily_report_id')->constrained()->cascadeOnDelete();
            $table->foreignId('activity_id')->nullable()->constrained()->nullOnDelete();
            $table->uuid('activity_uuid')->nullable();
            $table->string('activity_title');
            $table->enum('activity_type', array_column(ActivityType::cases(), 'value'))
                ->default(ActivityType::Other->value);
            $table->enum('activity_status', array_column(ActivityStatus::cases(), 'value'))
                ->default(ActivityStatus::Pending->value);
            $table->date('scheduled_date')->nullable();
            $table->time('start_time')->nullable();
            $table->time('end_time')->nullable();
            $table->timestamp('completed_at')->nullable();
            $table->integer('sort_order')->default(0);
            $table->timestamps();

            $table->unique(['daily_report_id', 'activity_id']);
            $table->index('daily_report_id');
            $table->index(['activity_id', 'activity_status']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('daily_report_activities');
    }
};
