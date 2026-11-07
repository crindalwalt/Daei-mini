<?php

namespace App\Models;

use App\Enums\ActivityStatus;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;

class HabitRecord extends Model
{
    use SoftDeletes;

    /**
     * @var string
     */
    protected $table = 'habit_records';

    /**
     * @var list<string>
     */
    protected $fillable = [
        'uuid',
        'habit_id',
        'user_id',
        'record_date',
        'status',
        'notes',
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
        'record_date' => 'date',
        'status' => ActivityStatus::class,
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

    public function habit(): BelongsTo
    {
        return $this->belongsTo(Habit::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function scopeOwnedBy(Builder $query, User|int $user): Builder
    {
        return $query->where('user_id', $user instanceof User ? $user->id : $user);
    }

    public function scopeCompleted(Builder $query): Builder
    {
        return $query->where('status', ActivityStatus::Completed);
    }
}
