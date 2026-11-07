<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class SyncOperationResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'operation_uuid' => $this->operation_uuid,
            'device_id' => $this->device_id,
            'entity_type' => $this->entity_type,
            'entity_uuid' => $this->entity_uuid,
            'operation_type' => $this->operation_type,
            'status' => $this->status?->value,
            'error_message' => $this->error_message,
            'processed_at' => $this->processed_at?->toIso8601String(),
            'created_at' => $this->created_at?->toIso8601String(),
        ];
    }
}
