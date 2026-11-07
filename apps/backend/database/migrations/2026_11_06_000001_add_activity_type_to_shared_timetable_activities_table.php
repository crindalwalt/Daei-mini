<?php

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
        Schema::table('shared_timetable_activities', function (Blueprint $table) {
            $table->enum('activity_type', array_column(ActivityType::cases(), 'value'))
                ->default(ActivityType::Other->value)
                ->after('description');

            $table->index(['shared_timetable_id', 'activity_type']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('shared_timetable_activities', function (Blueprint $table) {
            $table->dropIndex(['shared_timetable_id', 'activity_type']);
            $table->dropColumn('activity_type');
        });
    }
};
