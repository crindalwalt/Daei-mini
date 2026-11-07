<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class SharedTimetableAssignmentResource extends JsonResource
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
            'user_id' => $this->user_id,
            'group_id' => $this->group_id,
            'assigned_by' => $this->assigned_by,
            'assigned_at' => $this->assigned_at?->toIso8601String(),
            'user' => new UserResource($this->whenLoaded('user')),
            'group' => $this->whenLoaded('group', fn () => [
                'id' => $this->group->id,
                'uuid' => $this->group->uuid,
                'name' => $this->group->name,
            ]),
            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),
        ];
    }
}
