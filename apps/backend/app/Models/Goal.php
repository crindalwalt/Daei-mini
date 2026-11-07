<?php

namespace App\Models;

use App\Enums\GoalStatus;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;

class Goal extends Model
{
    use SoftDeletes;

    /**
     * @var string
     */
    protected $table = 'goals';

    /**
     * @var list<string>
     */
    protected $fillable = [
        'uuid',
        'user_id',
        'title',
        'description',
        'target_date',
        'progress',
        'status',
        'achieved_at',
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
        'target_date' => 'date',
        'progress' => 'decimal:2',
        'status' => GoalStatus::class,
        'achieved_at' => 'datetime',
        'client_created_at' => 'datetime',
        'client_updated_at' => 'datetime',
        'server_version' => 'integer',
        'synced_at' => 'datetime',
        'deleted_at' => 'datetime',
    ];

    protected static function booted(): void
    {
        static::creating(function (self $goal): void {
            if (blank($goal->uuid)) {
                $goal->uuid = (string) Str::uuid();
            }
        });
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function scopeOwnedBy(Builder $query, User|int $user): Builder
    {
        return $query->where('user_id', $user instanceof User ? $user->id : $user);
    }
}
