<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpdateHealthRecordRequest extends FormRequest
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
            'record_date' => ['sometimes', 'required', 'date'],
            'weight_kg' => ['sometimes', 'nullable', 'numeric', 'between:0,999.99'],
            'water_ml' => ['sometimes', 'nullable', 'integer', 'min:0'],
            'sleep_hours' => ['sometimes', 'nullable', 'numeric', 'between:0,24'],
            'blood_pressure_systolic' => ['sometimes', 'nullable', 'integer', 'between:0,300'],
            'blood_pressure_diastolic' => ['sometimes', 'nullable', 'integer', 'between:0,300'],
            'notes' => ['sometimes', 'nullable', 'string', 'max:5000'],
            'client_updated_at' => ['sometimes', 'nullable', 'date'],
        ];
    }
}
