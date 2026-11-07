<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class SyncConflictResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'conflict_uuid' => $this->conflict_uuid,
            'entity_type' => $this->entity_type,
            'entity_uuid' => $this->entity_uuid,
            'client_version' => (int) $this->client_version,
            'server_version' => (int) $this->server_version,
            'client_payload' => $this->client_payload,
            'server_payload' => $this->server_payload,
            'resolution_status' => $this->resolution_status,
            'resolution_type' => $this->resolution_type?->value,
            'resolved_at' => $this->resolved_at?->toIso8601String(),
            'created_at' => $this->created_at?->toIso8601String(),
        ];
    }
}
