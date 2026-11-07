<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;

class UserDocument extends Model
{
    use SoftDeletes;

    /**
     * @var string
     */
    protected $table = 'user_documents';

    /**
     * @var list<string>
     */
    protected $fillable = [
        'uuid',
        'user_id',
        'title',
        'description',
        'category',
        'file_name',
        'storage_disk',
        'storage_path',
        'mime_type',
        'file_size',
        'is_private',
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
        'file_size' => 'integer',
        'is_private' => 'boolean',
        'client_created_at' => 'datetime',
        'client_updated_at' => 'datetime',
        'server_version' => 'integer',
        'synced_at' => 'datetime',
        'deleted_at' => 'datetime',
    ];

    protected static function booted(): void
    {
        static::creating(function (self $document): void {
            if (blank($document->uuid)) {
                $document->uuid = (string) Str::uuid();
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
