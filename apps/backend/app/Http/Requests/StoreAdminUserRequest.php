<?php

namespace App\Http\Requests;

use App\Enums\UserRole;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreAdminUserRequest extends FormRequest
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
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'string', 'email', 'max:255', 'unique:users,email'],
            'role' => ['required', Rule::in(array_column(UserRole::cases(), 'value'))],
            'group_id' => ['nullable', 'integer', 'exists:groups,id'],
            'status' => ['required', Rule::in(['pending', 'active', 'inactive'])],
            'send_invitation' => ['sometimes', 'boolean'],
        ];
    }
}
