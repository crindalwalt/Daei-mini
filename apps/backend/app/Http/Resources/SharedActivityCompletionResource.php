<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class SharedActivityCompletionResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'uuid' => $this->uuid,
            'shared_timetable_activity_id' => $this->shared_timetable_activity_id,
            'user_id' => $this->user_id,
            'status' => $this->status?->value,
            'completed_at' => $this->completed_at?->toIso8601String(),
            'notes' => $this->notes,
            'activity' => new SharedTimetableActivityResource($this->whenLoaded('sharedTimetableActivity')),
            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),
        ];
    }
}
