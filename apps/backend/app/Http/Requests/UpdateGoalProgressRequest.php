<?php

namespace App\Http\Requests;

use App\Enums\GoalStatus;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateGoalProgressRequest extends FormRequest
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
            'progress' => ['required', 'numeric', 'between:0,100'],
            'status' => ['sometimes', Rule::enum(GoalStatus::class)],
        ];
    }
}
