<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Str;

class LibraryResourcePermission extends Model
{
    /**
     * @var string
     */
    protected $table = 'library_resource_permissions';

    /**
     * @var list<string>
     */
    protected $fillable = [
        'uuid',
        'library_resource_id',
        'user_id',
        'group_id',
    ];

    /**
     * @var list<string>
     */
    protected $hidden = [];

    /**
     * @var array<string, string>
     */
    protected $casts = [];

    protected static function booted(): void
    {
        static::creating(function (self $permission): void {
            if (blank($permission->uuid)) {
                $permission->uuid = (string) Str::uuid();
            }
        });
    }

    public function libraryResource(): BelongsTo
    {
        return $this->belongsTo(LibraryResource::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function group(): BelongsTo
    {
        return $this->belongsTo(Group::class);
    }
}
