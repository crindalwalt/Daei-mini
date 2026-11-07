<?php

namespace App\Models;

use App\Enums\PrayerCalculationMethod;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;

class UserPrayerPreference extends Model
{
    use SoftDeletes;

    /**
     * @var string
     */
    protected $table = 'user_prayer_preferences';

    /**
     * @var list<string>
     */
    protected $fillable = [
        'uuid',
        'user_id',
        'latitude',
        'longitude',
        'timezone',
        'calculation_method',
        'notifications_enabled',
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
        'latitude' => 'decimal:7',
        'longitude' => 'decimal:7',
        'calculation_method' => PrayerCalculationMethod::class,
        'notifications_enabled' => 'boolean',
        'client_created_at' => 'datetime',
        'client_updated_at' => 'datetime',
        'server_version' => 'integer',
        'synced_at' => 'datetime',
        'deleted_at' => 'datetime',
    ];

    protected static function booted(): void
    {
        static::creating(function (self $preference): void {
            if (blank($preference->uuid)) {
                $preference->uuid = (string) Str::uuid();
            }
        });
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
