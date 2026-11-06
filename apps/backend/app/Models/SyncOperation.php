<?php

namespace App\Models;

use App\Enums\SyncStatus;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Str;

class SyncOperation extends Model
{
    /**
     * @var string
     */
    protected $table = 'sync_operations';

    /**
     * @var list<string>
     */
    protected $fillable = [
        'operation_uuid',
        'user_id',
        'device_id',
        'entity_type',
        'entity_uuid',
        'operation_type',
        'status',
        'error_message',
        'processed_at',
    ];

    /**
     * @var list<string>
     */
    protected $hidden = [];

    /**
     * @var array<string, string>
     */
    protected $casts = [
        'status' => SyncStatus::class,
        'processed_at' => 'datetime',
    ];

    protected static function booted(): void
    {
        static::creating(function (self $operation): void {
            if (blank($operation->operation_uuid)) {
                $operation->operation_uuid = (string) Str::uuid();
            }
        });
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function device(): BelongsTo
    {
        return $this->belongsTo(UserDevice::class, 'device_id');
    }
}
