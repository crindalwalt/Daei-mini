<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class HealthRecordResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'uuid' => $this->uuid,
            'record_date' => $this->record_date?->toDateString(),
            'weight_kg' => $this->weight_kg === null ? null : (float) $this->weight_kg,
            'water_ml' => $this->water_ml === null ? null : (int) $this->water_ml,
            'sleep_hours' => $this->sleep_hours === null ? null : (float) $this->sleep_hours,
            'blood_pressure_systolic' => $this->blood_pressure_systolic === null ? null : (int) $this->blood_pressure_systolic,
            'blood_pressure_diastolic' => $this->blood_pressure_diastolic === null ? null : (int) $this->blood_pressure_diastolic,
            'blood_pressure' => $this->blood_pressure_systolic !== null && $this->blood_pressure_diastolic !== null
                ? $this->blood_pressure_systolic.'/'.$this->blood_pressure_diastolic
                : null,
            'notes' => $this->notes,
            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),
        ];
    }
}
