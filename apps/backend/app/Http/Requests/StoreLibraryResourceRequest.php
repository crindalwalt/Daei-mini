<?php

namespace App\Http\Requests;

use App\Enums\LibraryVisibility;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreLibraryResourceRequest extends FormRequest
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
            'title' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string', 'max:5000'],
            'category' => ['nullable', 'string', 'max:60'],
            'file' => ['required', 'file', 'max:51200'],
            'visibility' => ['sometimes', Rule::enum(LibraryVisibility::class)],
            'status' => ['sometimes', 'string', 'in:active,archived'],
        ];
    }
}
