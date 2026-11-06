<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;

class UserDevice extends Model
{
    use SoftDeletes;

    /**
     * @var string
     */
    protected $table = 'user_devices';

    /**
     * @var list<string>
     */
    protected $fillable = [
        'uuid',
        'user_id',
        'device_name',
        'platform',
        'last_sync_at',
        'is_active',
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
        'last_sync_at' => 'datetime',
        'is_active' => 'boolean',
        'client_created_at' => 'datetime',
        'client_updated_at' => 'datetime',
        'server_version' => 'integer',
        'synced_at' => 'datetime',
        'deleted_at' => 'datetime',
    ];

    protected static function booted(): void
    {
        static::creating(function (self $device): void {
            if (blank($device->uuid)) {
                $device->uuid = (string) Str::uuid();
            }
        });
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function syncOperations(): HasMany
    {
        return $this->hasMany(SyncOperation::class, 'device_id');
    }
}
