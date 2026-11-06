<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Str;

class SyncConflict extends Model
{
    /**
     * @var string
     */
    protected $table = 'sync_conflicts';

    /**
     * @var list<string>
     */
    protected $fillable = [
        'conflict_uuid',
        'user_id',
        'entity_type',
        'entity_uuid',
        'client_version',
        'server_version',
        'client_payload',
        'server_payload',
        'resolution_status',
        'resolution_type',
        'resolved_at',
    ];

    /**
     * @var list<string>
     */
    protected $hidden = [];

    /**
     * @var array<string, string>
     */
    protected $casts = [
        'client_version' => 'integer',
        'server_version' => 'integer',
        'client_payload' => 'array',
        'server_payload' => 'array',
        'resolved_at' => 'datetime',
    ];

    protected static function booted(): void
    {
        static::creating(function (self $conflict): void {
            if (blank($conflict->conflict_uuid)) {
                $conflict->conflict_uuid = (string) Str::uuid();
            }
        });
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
