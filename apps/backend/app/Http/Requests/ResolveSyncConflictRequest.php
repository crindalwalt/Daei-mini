<?php

namespace App\Http\Requests;

use App\Enums\ConflictResolutionPolicy;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class ResolveSyncConflictRequest extends FormRequest
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
            'resolution_type' => ['required', Rule::enum(ConflictResolutionPolicy::class)],
        ];
    }
}
