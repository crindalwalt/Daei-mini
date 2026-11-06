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
        Schema::create('library_resource_permissions', function (Blueprint $table) {
            $table->id();
            $table->uuid('uuid')->unique();
            $table->foreignId('library_resource_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->nullable()->constrained()->cascadeOnDelete();
            $table->foreignId('group_id')->nullable()->constrained()->cascadeOnDelete();
            $table->timestamps();

            $table->index('library_resource_id');
            $table->index('user_id');
            $table->index('group_id');
        });

        if (DB::connection()->getDriverName() === 'pgsql') {
            DB::statement(
                'ALTER TABLE library_resource_permissions '
                .'ADD CONSTRAINT library_resource_permissions_owner_check '
                .'CHECK ((user_id IS NOT NULL) <> (group_id IS NOT NULL))'
            );

            DB::statement(
                'CREATE UNIQUE INDEX library_resource_permissions_resource_user_unique '
                .'ON library_resource_permissions (library_resource_id, user_id) '
                .'WHERE user_id IS NOT NULL'
            );

            DB::statement(
                'CREATE UNIQUE INDEX library_resource_permissions_resource_group_unique '
                .'ON library_resource_permissions (library_resource_id, group_id) '
                .'WHERE group_id IS NOT NULL'
            );
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('library_resource_permissions');
    }
};
