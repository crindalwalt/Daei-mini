<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreExerciseRecordRequest extends FormRequest
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
            'activity_id' => ['nullable', 'integer', 'exists:activities,id'],
            'exercise_type' => ['required', 'string', 'max:100'],
            'title' => ['required', 'string', 'max:255'],
            'duration_minutes' => ['nullable', 'integer', 'min:0'],
            'distance' => ['nullable', 'numeric', 'min:0'],
            'calories_burned' => ['nullable', 'integer', 'min:0'],
            'notes' => ['nullable', 'string', 'max:5000'],
            'recorded_at' => ['required', 'date'],
            'client_created_at' => ['nullable', 'date'],
            'client_updated_at' => ['nullable', 'date'],
        ];
    }
}
