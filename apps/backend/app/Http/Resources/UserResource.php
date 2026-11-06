<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class UserResource extends JsonResource
{
    /**
     * Transform the resource into a safe public representation.
     *
     * Password hashes, remember tokens, sanctum tokens, and internal
     * bookkeeping timestamps are never exposed.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $role = $this->role?->value;
        $preference = $this->whenLoaded('prayerPreference');

        return [
            'id' => $this->id,
            'uuid' => $this->uuid,
            'name' => $this->name,
            'email' => $this->email,
            'role' => $role,
            'roles' => $role !== null ? [$role] : [],
            'is_active' => (bool) $this->is_active,
            'email_verified' => $this->email_verified_at !== null,
            'prayer_preferences' => $this->when(
                $this->relationLoaded('prayerPreference'),
                fn () => $preference === null ? null : [
                    'timezone' => $preference->timezone,
                    'calculation_method' => $preference->calculation_method,
                    'latitude' => $preference->latitude,
                    'longitude' => $preference->longitude,
                    'notifications_enabled' => (bool) $preference->notifications_enabled,
                ],
            ),
        ];
    }
}
