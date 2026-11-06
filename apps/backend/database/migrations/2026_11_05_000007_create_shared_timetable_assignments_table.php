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
        Schema::create('shared_timetable_assignments', function (Blueprint $table) {
            $table->id();
            $table->uuid('uuid')->unique();
            $table->foreignId('shared_timetable_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->nullable()->constrained()->cascadeOnDelete();
            $table->foreignId('group_id')->nullable()->constrained()->cascadeOnDelete();
            $table->foreignId('assigned_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('assigned_at')->useCurrent();
            $table->timestamp('client_created_at')->nullable();
            $table->timestamp('client_updated_at')->nullable();
            $table->bigInteger('server_version')->default(1);
            $table->timestamp('synced_at')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->index('shared_timetable_id');
            $table->index('user_id');
            $table->index('group_id');
            $table->index('assigned_by');
        });

        if (DB::connection()->getDriverName() === 'pgsql') {
            DB::statement(
                'ALTER TABLE shared_timetable_assignments '
                .'ADD CONSTRAINT shared_timetable_assignments_owner_check '
                .'CHECK ((user_id IS NOT NULL) <> (group_id IS NOT NULL))'
            );

            DB::statement(
                'CREATE UNIQUE INDEX shared_timetable_assignments_timetable_user_unique '
                .'ON shared_timetable_assignments (shared_timetable_id, user_id) '
                .'WHERE user_id IS NOT NULL AND deleted_at IS NULL'
            );

            DB::statement(
                'CREATE UNIQUE INDEX shared_timetable_assignments_timetable_group_unique '
                .'ON shared_timetable_assignments (shared_timetable_id, group_id) '
                .'WHERE group_id IS NOT NULL AND deleted_at IS NULL'
            );
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('shared_timetable_assignments');
    }
};
