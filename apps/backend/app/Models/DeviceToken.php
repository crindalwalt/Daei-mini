<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class DeviceToken extends Model
{
    /**
     * @var string
     */
    protected $table = 'device_tokens';

    /**
     * @var list<string>
     */
    protected $fillable = [
        'user_id',
        'device_token',
        'device_type',
        'device_identifier',
        'is_active',
        'last_used_at',
    ];

    /**
     * @var list<string>
     */
    protected $hidden = [
        'device_token',
    ];

    /**
     * @var array<string, string>
     */
    protected $casts = [
        'is_active' => 'boolean',
        'last_used_at' => 'datetime',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
