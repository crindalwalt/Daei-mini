<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;

class DailyReportComment extends Model
{
    use SoftDeletes;

    /**
     * @var string
     */
    protected $table = 'daily_report_comments';

    /**
     * @var list<string>
     */
    protected $fillable = [
        'uuid',
        'daily_report_id',
        'author_id',
        'comment',
    ];

    /**
     * @var list<string>
     */
    protected $hidden = [];

    /**
     * @var array<string, string>
     */
    protected $casts = [
        'deleted_at' => 'datetime',
    ];

    protected static function booted(): void
    {
        static::creating(function (self $comment): void {
            if (blank($comment->uuid)) {
                $comment->uuid = (string) Str::uuid();
            }
        });
    }

    public function dailyReport(): BelongsTo
    {
        return $this->belongsTo(DailyReport::class);
    }

    public function author(): BelongsTo
    {
        return $this->belongsTo(User::class, 'author_id');
    }
}
