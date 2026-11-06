<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;

class ExerciseRecord extends Model
{
    use SoftDeletes;

    /**
     * @var string
     */
    protected $table = 'exercise_records';

    /**
     * @var list<string>
     */
    protected $fillable = [
        'uuid',
        'user_id',
        'exercise_type',
        'title',
        'duration_minutes',
        'distance',
        'calories_burned',
        'notes',
        'recorded_at',
        'client_created_at',
        'client_updated_at',
        'server_version',
        'synced_at',
    ];

    /**
     * @var list<string>
     */
    protected $hidden = [];

    /**
     * @var array<string, string>
     */
    protected $casts = [
        'duration_minutes' => 'integer',
        'distance' => 'decimal:2',
        'calories_burned' => 'integer',
        'recorded_at' => 'datetime',
        'client_created_at' => 'datetime',
        'client_updated_at' => 'datetime',
        'server_version' => 'integer',
        'synced_at' => 'datetime',
        'deleted_at' => 'datetime',
    ];

    protected static function booted(): void
    {
        static::creating(function (self $record): void {
            if (blank($record->uuid)) {
                $record->uuid = (string) Str::uuid();
            }
        });
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
