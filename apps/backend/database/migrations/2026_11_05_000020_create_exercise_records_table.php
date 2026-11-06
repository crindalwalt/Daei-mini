<?php

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
        Schema::create('exercise_records', function (Blueprint $table) {
            $table->id();
            $table->uuid('uuid')->unique();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('exercise_type');
            $table->string('title');
            $table->integer('duration_minutes')->nullable();
            $table->decimal('distance', 8, 2)->nullable();
            $table->integer('calories_burned')->nullable();
            $table->text('notes')->nullable();
            $table->timestamp('recorded_at');
            $table->timestamp('client_created_at')->nullable();
            $table->timestamp('client_updated_at')->nullable();
            $table->bigInteger('server_version')->default(1);
            $table->timestamp('synced_at')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->index(['user_id', 'recorded_at']);
            $table->index(['user_id', 'exercise_type']);
        });

        if (DB::connection()->getDriverName() === 'pgsql') {
            DB::statement(
                'ALTER TABLE exercise_records ADD CONSTRAINT exercise_records_metrics_check '
                .'CHECK ((duration_minutes IS NULL OR duration_minutes >= 0) '
                .'AND (distance IS NULL OR distance >= 0) '
                .'AND (calories_burned IS NULL OR calories_burned >= 0))'
            );
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('exercise_records');
    }
};
