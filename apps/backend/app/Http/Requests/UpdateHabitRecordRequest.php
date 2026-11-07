<?php

namespace App\Http\Requests;

use App\Enums\ActivityStatus;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateHabitRecordRequest extends FormRequest
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
            'status' => ['sometimes', Rule::enum(ActivityStatus::class)],
            'notes' => ['sometimes', 'nullable', 'string', 'max:5000'],
            'client_updated_at' => ['sometimes', 'nullable', 'date'],
        ];
    }
}
