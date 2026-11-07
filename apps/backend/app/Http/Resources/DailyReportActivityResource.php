<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class DailyReportActivityResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'activity_id' => $this->activity_id,
            'activity_uuid' => $this->activity_uuid,
            'activity_title' => $this->activity_title,
            'activity_type' => $this->activity_type?->value,
            'activity_status' => $this->activity_status?->value,
            'scheduled_date' => $this->scheduled_date?->toDateString(),
            'start_time' => $this->start_time,
            'end_time' => $this->end_time,
            'completed_at' => $this->completed_at?->toIso8601String(),
            'sort_order' => (int) $this->sort_order,
        ];
    }
}
