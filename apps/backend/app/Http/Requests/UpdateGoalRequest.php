<?php

namespace App\Http\Requests;

use App\Enums\GoalStatus;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateGoalRequest extends FormRequest
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
            'title' => ['sometimes', 'required', 'string', 'max:255'],
            'description' => ['sometimes', 'nullable', 'string', 'max:5000'],
            'target_date' => ['sometimes', 'nullable', 'date'],
            'progress' => ['sometimes', 'numeric', 'between:0,100'],
            'status' => ['sometimes', Rule::enum(GoalStatus::class)],
            'client_updated_at' => ['sometimes', 'nullable', 'date'],
        ];
    }
}
