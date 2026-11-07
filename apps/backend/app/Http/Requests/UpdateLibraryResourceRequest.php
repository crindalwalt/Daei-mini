<?php

namespace App\Http\Requests;

use App\Enums\LibraryVisibility;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateLibraryResourceRequest extends FormRequest
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
            'visibility' => ['sometimes', Rule::enum(LibraryVisibility::class)],
            'status' => ['sometimes', 'string', 'in:active,archived'],
        ];
    }
}
