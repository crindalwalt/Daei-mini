<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ExerciseRecordResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'uuid' => $this->uuid,
            'activity_id' => $this->activity_id,
            'activity' => new ActivityResource($this->whenLoaded('activity')),
            'exercise_type' => $this->exercise_type,
            'title' => $this->title,
            'duration_minutes' => $this->duration_minutes === null ? null : (int) $this->duration_minutes,
            'distance' => $this->distance === null ? null : (float) $this->distance,
            'calories_burned' => $this->calories_burned === null ? null : (int) $this->calories_burned,
            'notes' => $this->notes,
            'recorded_at' => $this->recorded_at?->toIso8601String(),
            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),
        ];
    }
}
