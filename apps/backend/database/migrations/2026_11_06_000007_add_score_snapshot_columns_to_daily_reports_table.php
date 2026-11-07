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
        Schema::table('daily_reports', function (Blueprint $table) {
            $table->decimal('calculated_score', 5, 2)->default(0.00)->after('self_assessment');
            $table->integer('scheduled_count')->default(0)->after('calculated_score');
            $table->integer('completed_count')->default(0)->after('scheduled_count');
        });

        // Backfill the immutable snapshot columns from the legacy score fields.
        DB::table('daily_reports')->update([
            'calculated_score' => DB::raw('COALESCE(score, 0)'),
            'scheduled_count' => DB::raw('COALESCE(total_activities_count, 0)'),
            'completed_count' => DB::raw('COALESCE(completed_activities_count, 0)'),
        ]);

        if (DB::connection()->getDriverName() === 'pgsql') {
            DB::statement(
                'ALTER TABLE daily_reports ADD CONSTRAINT daily_reports_calculated_score_range_check '
                .'CHECK (calculated_score >= 0 AND calculated_score <= 100)'
            );

            DB::statement(
                'ALTER TABLE daily_reports ADD CONSTRAINT daily_reports_snapshot_counts_check '
                .'CHECK (scheduled_count >= 0 AND completed_count >= 0 AND completed_count <= scheduled_count)'
            );
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (DB::connection()->getDriverName() === 'pgsql') {
            DB::statement('ALTER TABLE daily_reports DROP CONSTRAINT IF EXISTS daily_reports_calculated_score_range_check');
            DB::statement('ALTER TABLE daily_reports DROP CONSTRAINT IF EXISTS daily_reports_snapshot_counts_check');
        }

        Schema::table('daily_reports', function (Blueprint $table) {
            $table->dropColumn(['calculated_score', 'scheduled_count', 'completed_count']);
        });
    }
};
