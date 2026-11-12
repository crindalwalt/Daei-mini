<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreAdminGroupRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'min:2', 'max:255', 'unique:groups,name'],
            'description' => ['nullable', 'string', 'max:2000'],
            'leader' => ['nullable', 'string', 'max:255'],
            'color' => ['nullable', Rule::in(['brand', 'sky', 'emerald', 'amber', 'rose', 'violet'])],
            'member_ids' => ['sometimes', 'array'],
            'member_ids.*' => ['integer', 'exists:users,id'],
        ];
    }
}
