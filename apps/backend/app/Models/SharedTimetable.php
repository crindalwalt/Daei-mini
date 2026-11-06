<?php

namespace App\Models;

use App\Enums\TimetableStatus;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;

class SharedTimetable extends Model
{
    use SoftDeletes;

    /**
     * @var string
     */
    protected $table = 'shared_timetables';

    /**
     * @var list<string>
     */
    protected $fillable = [
        'uuid',
        'title',
        'description',
        'created_by',
        'start_date',
        'end_date',
        'status',
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
        'start_date' => 'date',
        'end_date' => 'date',
        'status' => TimetableStatus::class,
        'client_created_at' => 'datetime',
        'client_updated_at' => 'datetime',
        'server_version' => 'integer',
        'synced_at' => 'datetime',
        'deleted_at' => 'datetime',
    ];

    protected static function booted(): void
    {
        static::creating(function (self $timetable): void {
            if (blank($timetable->uuid)) {
                $timetable->uuid = (string) Str::uuid();
            }
        });
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function activities(): HasMany
    {
        return $this->hasMany(SharedTimetableActivity::class);
    }

    public function assignments(): HasMany
    {
        return $this->hasMany(SharedTimetableAssignment::class);
    }
}
