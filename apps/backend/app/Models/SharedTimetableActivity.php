<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;

class SharedTimetableActivity extends Model
{
    use SoftDeletes;

    /**
     * @var string
     */
    protected $table = 'shared_timetable_activities';

    /**
     * @var list<string>
     */
    protected $fillable = [
        'uuid',
        'shared_timetable_id',
        'title',
        'description',
        'activity_date',
        'start_time',
        'end_time',
        'sort_order',
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
        'activity_date' => 'date',
        'sort_order' => 'integer',
        'client_created_at' => 'datetime',
        'client_updated_at' => 'datetime',
        'server_version' => 'integer',
        'synced_at' => 'datetime',
        'deleted_at' => 'datetime',
    ];

    protected static function booted(): void
    {
        static::creating(function (self $activity): void {
            if (blank($activity->uuid)) {
                $activity->uuid = (string) Str::uuid();
            }
        });
    }

    public function sharedTimetable(): BelongsTo
    {
        return $this->belongsTo(SharedTimetable::class);
    }

    public function completions(): HasMany
    {
        return $this->hasMany(SharedActivityCompletion::class);
    }
}
