<?php

namespace App\Models;

use App\Enums\ActivityStatus;
use App\Enums\ActivityType;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class DailyReportActivity extends Model
{
    /**
     * @var string
     */
    protected $table = 'daily_report_activities';

    /**
     * @var list<string>
     */
    protected $fillable = [
        'daily_report_id',
        'activity_id',
        'activity_uuid',
        'activity_title',
        'activity_type',
        'activity_status',
        'scheduled_date',
        'start_time',
        'end_time',
        'completed_at',
        'sort_order',
    ];

    /**
     * @var list<string>
     */
    protected $hidden = [];

    /**
     * @var array<string, string>
     */
    protected $casts = [
        'activity_type' => ActivityType::class,
        'activity_status' => ActivityStatus::class,
        'scheduled_date' => 'date',
        'completed_at' => 'datetime',
        'sort_order' => 'integer',
    ];

    public function dailyReport(): BelongsTo
    {
        return $this->belongsTo(DailyReport::class);
    }

    public function activity(): BelongsTo
    {
        return $this->belongsTo(Activity::class);
    }
}
