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
        Schema::create('health_records', function (Blueprint $table) {
            $table->id();
            $table->uuid('uuid')->unique();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->date('record_date');
            $table->decimal('weight_kg', 5, 2)->nullable();
            $table->integer('water_ml')->nullable();
            $table->decimal('sleep_hours', 4, 2)->nullable();
            $table->smallInteger('blood_pressure_systolic')->nullable();
            $table->smallInteger('blood_pressure_diastolic')->nullable();
            $table->text('notes')->nullable();
            $table->timestamp('client_created_at')->nullable();
            $table->timestamp('client_updated_at')->nullable();
            $table->bigInteger('server_version')->default(1);
            $table->timestamp('synced_at')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->unique(['user_id', 'record_date']);
            $table->index(['user_id', 'record_date']);
        });

        if (DB::connection()->getDriverName() === 'pgsql') {
            DB::statement(
                'ALTER TABLE health_records ADD CONSTRAINT health_records_metrics_check '
                .'CHECK ((weight_kg IS NULL OR weight_kg >= 0) '
                .'AND (water_ml IS NULL OR water_ml >= 0) '
                .'AND (sleep_hours IS NULL OR (sleep_hours >= 0 AND sleep_hours <= 24)) '
                .'AND (blood_pressure_systolic IS NULL OR (blood_pressure_systolic >= 0 AND blood_pressure_systolic <= 300)) '
                .'AND (blood_pressure_diastolic IS NULL OR (blood_pressure_diastolic >= 0 AND blood_pressure_diastolic <= 300)) '
                .'AND (blood_pressure_systolic IS NULL OR blood_pressure_diastolic IS NULL '
                .'OR blood_pressure_systolic >= blood_pressure_diastolic))'
            );
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('health_records');
    }
};
