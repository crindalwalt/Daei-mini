<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreHealthRecordRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'uuid' => ['sometimes', 'uuid'],
            'record_date' => ['required', 'date'],
            'weight_kg' => ['nullable', 'numeric', 'between:0,999.99'],
            'water_ml' => ['nullable', 'integer', 'min:0'],
            'sleep_hours' => ['nullable', 'numeric', 'between:0,24'],
            'blood_pressure_systolic' => ['nullable', 'integer', 'between:0,300'],
            'blood_pressure_diastolic' => ['nullable', 'integer', 'between:0,300'],
            'notes' => ['nullable', 'string', 'max:5000'],
            'client_created_at' => ['nullable', 'date'],
            'client_updated_at' => ['nullable', 'date'],
        ];
    }
}
