<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Pull-based offline synchronization filters every extended entity by
     * user and updated_at. journal_entries already ships with that composite
     * index; this migration fills the gap for the remaining offline tables.
     *
     * @var array<string, list<string>>
     */
    private const INDEXES = [
        'health_records' => ['user_id', 'updated_at'],
        'exercise_records' => ['user_id', 'updated_at'],
        'daily_reports' => ['user_id', 'updated_at'],
    ];

    /**
     * Run the migrations.
     */
    public function up(): void
    {
        foreach (self::INDEXES as $table => $columns) {
            $name = $table.'_'.implode('_', $columns).'_index';

            if ($this->hasIndex($table, $name)) {
                continue;
            }

            Schema::table($table, function (Blueprint $blueprint) use ($columns, $name): void {
                $blueprint->index($columns, $name);
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        foreach (self::INDEXES as $table => $columns) {
            $name = $table.'_'.implode('_', $columns).'_index';

            if (! $this->hasIndex($table, $name)) {
                continue;
            }

            Schema::table($table, function (Blueprint $blueprint) use ($name): void {
                $blueprint->dropIndex($name);
            });
        }
    }

    private function hasIndex(string $table, string $name): bool
    {
        return collect(Schema::getIndexes($table))
            ->contains(fn (array $index): bool => $index['name'] === $name);
    }
};
