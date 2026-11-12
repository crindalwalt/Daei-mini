<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class AdminGroupResource extends JsonResource
{
    /**
     * Present a group in the shape consumed by the admin dashboard.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'uuid' => $this->uuid,
            'name' => $this->name,
            'description' => $this->description,
            'leader' => $this->leader_name,
            'color' => $this->color,
            'members_count' => (int) ($this->users_count ?? 0),
            'activities_count' => (int) ($this->activities_count ?? 0),
            'progress' => (int) round((float) ($this->average_score ?? 0)),
            'members' => $this->when(
                $this->relationLoaded('users'),
                fn () => AdminUserResource::collection($this->users)->resolve($request),
            ),
            'created_at' => $this->created_at?->toDateString(),
            'updated_at' => $this->updated_at?->toIso8601String(),
        ];
    }
}
