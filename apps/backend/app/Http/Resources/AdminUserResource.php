<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class AdminUserResource extends JsonResource
{
    /**
     * Present a user in the shape consumed by the admin dashboard.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $role = $this->role?->value ?? (string) $this->role;
        $groups = $this->whenLoaded('groups');

        return [
            'id' => $this->id,
            'uuid' => $this->uuid,
            'name' => $this->name,
            'email' => $this->email,
            'role' => $role,
            'roles' => $role !== null ? [$role] : [],
            'is_active' => (bool) $this->is_active,
            'is_suspended' => $this->suspended_at !== null,
            'suspended_at' => $this->suspended_at?->toIso8601String(),
            'status' => $this->adminStatus(),
            'email_verified' => $this->email_verified_at !== null,
            'email_verified_at' => $this->email_verified_at?->toIso8601String(),
            'invited_at' => $this->invited_at?->toIso8601String(),
            'invitation_accepted_at' => $this->invitation_accepted_at?->toIso8601String(),
            'group' => $this->relationLoaded('groups') ? $groups->first()?->name : null,
            'groups' => $this->when(
                $this->relationLoaded('groups'),
                fn () => $groups->map(fn ($group) => [
                    'id' => $group->id,
                    'name' => $group->name,
                    'color' => $group->color,
                ])->values(),
            ),
            'joined_at' => $this->created_at?->toDateString(),
            'last_active' => $this->updated_at?->toIso8601String(),
            'activities' => (int) ($this->activities_count ?? 0),
            'reports' => (int) ($this->daily_reports_count ?? 0),
            'progress' => (int) round((float) ($this->average_score ?? 0)),
            'phone' => $this->phone ?? null,
            'location' => $this->location ?? null,
            'bio' => $this->bio ?? null,
            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),
        ];
    }

    private function adminStatus(): string
    {
        if ($this->suspended_at !== null) {
            return 'suspended';
        }

        if ($this->invited_at !== null && $this->invitation_accepted_at === null) {
            return 'pending';
        }

        return $this->is_active ? 'active' : 'inactive';
    }
}
