<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpdateExerciseRecordRequest extends FormRequest
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
            'activity_id' => ['sometimes', 'nullable', 'integer', 'exists:activities,id'],
            'exercise_type' => ['sometimes', 'required', 'string', 'max:100'],
            'title' => ['sometimes', 'required', 'string', 'max:255'],
            'duration_minutes' => ['sometimes', 'nullable', 'integer', 'min:0'],
            'distance' => ['sometimes', 'nullable', 'numeric', 'min:0'],
            'calories_burned' => ['sometimes', 'nullable', 'integer', 'min:0'],
            'notes' => ['sometimes', 'nullable', 'string', 'max:5000'],
            'recorded_at' => ['sometimes', 'required', 'date'],
            'client_updated_at' => ['sometimes', 'nullable', 'date'],
        ];
    }
}
