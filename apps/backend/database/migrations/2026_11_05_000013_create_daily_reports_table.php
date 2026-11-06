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
        Schema::create('daily_reports', function (Blueprint $table) {
            $table->id();
            $table->uuid('uuid')->unique();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->date('report_date');
            $table->text('summary')->nullable();
            $table->text('self_assessment')->nullable();
            $table->decimal('score', 5, 2)->nullable();
            $table->integer('completed_activities_count')->default(0);
            $table->integer('total_activities_count')->default(0);
            $table->timestamp('submitted_at')->nullable();
            $table->timestamp('client_created_at')->nullable();
            $table->timestamp('client_updated_at')->nullable();
            $table->bigInteger('server_version')->default(1);
            $table->timestamp('synced_at')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->unique(['user_id', 'report_date']);
            $table->index(['user_id', 'submitted_at']);
        });

        if (DB::connection()->getDriverName() === 'pgsql') {
            DB::statement(
                'ALTER TABLE daily_reports ADD CONSTRAINT daily_reports_score_range_check '
                .'CHECK (score IS NULL OR (score >= 0 AND score <= 100))'
            );

            DB::statement(
                'ALTER TABLE daily_reports ADD CONSTRAINT daily_reports_counts_check '
                .'CHECK (completed_activities_count >= 0 AND total_activities_count >= 0 '
                .'AND completed_activities_count <= total_activities_count)'
            );
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('daily_reports');
    }
};
