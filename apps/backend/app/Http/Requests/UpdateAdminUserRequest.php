<?php

namespace App\Http\Requests;

use App\Enums\UserRole;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateAdminUserRequest extends FormRequest
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
        $userId = $this->route('user')?->id;

        return [
            'name' => ['sometimes', 'required', 'string', 'max:255'],
            'email' => [
                'sometimes',
                'required',
                'string',
                'email',
                'max:255',
                Rule::unique('users', 'email')->ignore($userId),
            ],
            'role' => ['sometimes', 'required', Rule::in(array_column(UserRole::cases(), 'value'))],
            'group_id' => ['sometimes', 'nullable', 'integer', 'exists:groups,id'],
            'status' => ['sometimes', 'required', Rule::in(['pending', 'active', 'inactive'])],
        ];
    }
}
