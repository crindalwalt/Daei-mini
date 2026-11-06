<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;

class DailyReport extends Model
{
    use SoftDeletes;

    /**
     * @var string
     */
    protected $table = 'daily_reports';

    /**
     * @var list<string>
     */
    protected $fillable = [
        'uuid',
        'user_id',
        'report_date',
        'summary',
        'self_assessment',
        'score',
        'completed_activities_count',
        'total_activities_count',
        'submitted_at',
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
        'report_date' => 'date',
        'score' => 'decimal:2',
        'completed_activities_count' => 'integer',
        'total_activities_count' => 'integer',
        'submitted_at' => 'datetime',
        'client_created_at' => 'datetime',
        'client_updated_at' => 'datetime',
        'server_version' => 'integer',
        'synced_at' => 'datetime',
        'deleted_at' => 'datetime',
    ];

    protected static function booted(): void
    {
        static::creating(function (self $report): void {
            if (blank($report->uuid)) {
                $report->uuid = (string) Str::uuid();
            }
        });
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function activities(): HasMany
    {
        return $this->hasMany(DailyReportActivity::class);
    }

    public function comments(): HasMany
    {
        return $this->hasMany(DailyReportComment::class);
    }
}
