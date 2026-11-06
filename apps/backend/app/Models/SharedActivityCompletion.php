<?php

namespace App\Models;

use App\Enums\ActivityStatus;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;

class SharedActivityCompletion extends Model
{
    use SoftDeletes;

    /**
     * @var string
     */
    protected $table = 'shared_activity_completions';

    /**
     * @var list<string>
     */
    protected $fillable = [
        'uuid',
        'shared_timetable_activity_id',
        'user_id',
        'status',
        'completed_at',
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
        'status' => ActivityStatus::class,
        'completed_at' => 'datetime',
        'client_created_at' => 'datetime',
        'client_updated_at' => 'datetime',
        'server_version' => 'integer',
        'synced_at' => 'datetime',
        'deleted_at' => 'datetime',
    ];

    protected static function booted(): void
    {
        static::creating(function (self $completion): void {
            if (blank($completion->uuid)) {
                $completion->uuid = (string) Str::uuid();
            }
        });
    }

    public function sharedTimetableActivity(): BelongsTo
    {
        return $this->belongsTo(SharedTimetableActivity::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
