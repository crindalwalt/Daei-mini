<?php

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
        Schema::create('sync_conflicts', function (Blueprint $table) {
            $table->id();
            $table->uuid('conflict_uuid')->unique();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('entity_type');
            $table->uuid('entity_uuid');
            $table->bigInteger('client_version')->default(0);
            $table->bigInteger('server_version')->default(0);
            $table->jsonb('client_payload');
            $table->jsonb('server_payload');
            $table->string('resolution_status')->default('pending');
            $table->string('resolution_type')->nullable();
            $table->timestamp('resolved_at')->nullable();
            $table->timestamps();

            $table->index(['user_id', 'resolution_status']);
            $table->index(['entity_type', 'entity_uuid']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('sync_conflicts');
    }
};
