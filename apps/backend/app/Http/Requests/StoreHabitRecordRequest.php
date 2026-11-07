<?php

namespace App\Http\Requests;

use App\Enums\ActivityStatus;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreHabitRecordRequest extends FormRequest
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
            'status' => ['sometimes', Rule::enum(ActivityStatus::class)],
            'notes' => ['nullable', 'string', 'max:5000'],
            'client_created_at' => ['nullable', 'date'],
            'client_updated_at' => ['nullable', 'date'],
        ];
    }
}
