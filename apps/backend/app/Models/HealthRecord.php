<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;

class HealthRecord extends Model
{
    use SoftDeletes;

    /**
     * @var string
     */
    protected $table = 'health_records';

    /**
     * @var list<string>
     */
    protected $fillable = [
        'uuid',
        'user_id',
        'record_date',
        'weight_kg',
        'water_ml',
        'sleep_hours',
        'blood_pressure_systolic',
        'blood_pressure_diastolic',
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
        'weight_kg' => 'decimal:2',
        'water_ml' => 'integer',
        'sleep_hours' => 'decimal:2',
        'blood_pressure_systolic' => 'integer',
        'blood_pressure_diastolic' => 'integer',
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

    public function scopeOwnedBy(Builder $query, User|int $user): Builder
    {
        return $query->where('user_id', $user instanceof User ? $user->id : $user);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
