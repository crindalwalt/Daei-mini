<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class SharedTimetableActivityResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'uuid' => $this->uuid,
            'shared_timetable_id' => $this->shared_timetable_id,
            'title' => $this->title,
            'description' => $this->description,
            'activity_type' => $this->activity_type?->value,
            'activity_date' => $this->activity_date?->toDateString(),
            'start_time' => $this->start_time,
            'end_time' => $this->end_time,
            'sort_order' => (int) $this->sort_order,
            'completion' => $this->whenLoaded('completions', function () {
                $completion = $this->completions->first();

                return $completion === null ? null : new SharedActivityCompletionResource($completion);
            }),
            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),
        ];
    }
}
