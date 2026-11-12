<?php

namespace App\Models;

use App\Enums\LibraryVisibility;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;

class LibraryResource extends Model
{
    use SoftDeletes;

    /**
     * @var string
     */
    protected $table = 'library_resources';

    /**
     * @var list<string>
     */
    protected $fillable = [
        'uuid',
        'title',
        'description',
        'category',
        'file_name',
        'storage_disk',
        'storage_path',
        'mime_type',
        'file_size',
        'uploaded_by',
        'visibility',
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
        'file_size' => 'integer',
        'visibility' => LibraryVisibility::class,
        'client_created_at' => 'datetime',
        'client_updated_at' => 'datetime',
        'server_version' => 'integer',
        'synced_at' => 'datetime',
        'deleted_at' => 'datetime',
    ];

    protected static function booted(): void
    {
        static::creating(function (self $resource): void {
            if (blank($resource->uuid)) {
                $resource->uuid = (string) Str::uuid();
            }
        });
    }

    public function uploader(): BelongsTo
    {
        return $this->belongsTo(User::class, 'uploaded_by');
    }

    public function permissions(): HasMany
    {
        return $this->hasMany(LibraryResourcePermission::class);
    }

    public function bookmarks(): HasMany
    {
        return $this->hasMany(Bookmark::class);
    }
}
