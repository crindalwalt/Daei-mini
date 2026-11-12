<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;

class Group extends Model
{
    use SoftDeletes;

    /**
     * @var string
     */
    protected $table = 'groups';

    /**
     * @var list<string>
     */
    protected $fillable = [
        'uuid',
        'name',
        'description',
        'leader_name',
        'color',
        'created_by',
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
        'client_created_at' => 'datetime',
        'client_updated_at' => 'datetime',
        'server_version' => 'integer',
        'synced_at' => 'datetime',
        'deleted_at' => 'datetime',
    ];

    protected static function booted(): void
    {
        static::creating(function (self $group): void {
            if (blank($group->uuid)) {
                $group->uuid = (string) Str::uuid();
            }
        });
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function users(): BelongsToMany
    {
        return $this->belongsToMany(User::class)
            ->withPivot(['assigned_by', 'assigned_at'])
            ->withTimestamps();
    }

    public function sharedTimetableAssignments(): HasMany
    {
        return $this->hasMany(SharedTimetableAssignment::class);
    }

    public function libraryResourcePermissions(): HasMany
    {
        return $this->hasMany(LibraryResourcePermission::class);
    }
}
