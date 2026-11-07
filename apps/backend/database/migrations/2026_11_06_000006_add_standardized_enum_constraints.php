<?php

use App\Enums\ConflictResolutionPolicy;
use App\Enums\PrayerCalculationMethod;
use App\Enums\ReminderChannel;
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
        Schema::table('activity_reminders', function (Blueprint $table) {
            $table->string('channel')->default(ReminderChannel::Local->value)->after('is_enabled');
            $table->index('channel');
        });

        if (DB::connection()->getDriverName() !== 'pgsql') {
            return;
        }

        $prayerMethods = $this->quotedValues(array_column(PrayerCalculationMethod::cases(), 'value'));
        $reminderChannels = $this->quotedValues(array_column(ReminderChannel::cases(), 'value'));
        $conflictPolicies = $this->quotedValues(array_column(ConflictResolutionPolicy::cases(), 'value'));

        DB::statement(
            'ALTER TABLE user_prayer_preferences ADD CONSTRAINT user_prayer_preferences_calculation_method_check '
            ."CHECK (calculation_method IS NULL OR calculation_method IN ({$prayerMethods}))"
        );

        DB::statement(
            'ALTER TABLE activity_reminders ADD CONSTRAINT activity_reminders_channel_check '
            ."CHECK (channel IN ({$reminderChannels}))"
        );

        DB::statement(
            'ALTER TABLE sync_conflicts ADD CONSTRAINT sync_conflicts_resolution_type_check '
            ."CHECK (resolution_type IS NULL OR resolution_type IN ({$conflictPolicies}))"
        );

        DB::statement(
            'ALTER TABLE sync_conflicts ADD CONSTRAINT sync_conflicts_resolution_status_check '
            ."CHECK (resolution_status IN ('pending', 'resolved', 'ignored'))"
        );
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (DB::connection()->getDriverName() === 'pgsql') {
            DB::statement('ALTER TABLE user_prayer_preferences DROP CONSTRAINT IF EXISTS user_prayer_preferences_calculation_method_check');
            DB::statement('ALTER TABLE activity_reminders DROP CONSTRAINT IF EXISTS activity_reminders_channel_check');
            DB::statement('ALTER TABLE sync_conflicts DROP CONSTRAINT IF EXISTS sync_conflicts_resolution_type_check');
            DB::statement('ALTER TABLE sync_conflicts DROP CONSTRAINT IF EXISTS sync_conflicts_resolution_status_check');
        }

        Schema::table('activity_reminders', function (Blueprint $table) {
            $table->dropIndex(['channel']);
            $table->dropColumn('channel');
        });
    }

    /**
     * @param  array<int, string>  $values
     */
    private function quotedValues(array $values): string
    {
        return implode(', ', array_map(
            fn (string $value): string => "'".str_replace("'", "''", $value)."'",
            $values
        ));
    }
};
