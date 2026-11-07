<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreLibraryResourcePermissionRequest extends FormRequest
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
            'user_id' => ['nullable', 'integer', 'exists:users,id', 'required_without:group_id', 'prohibits:group_id'],
            'group_id' => ['nullable', 'integer', 'exists:groups,id', 'required_without:user_id', 'prohibits:user_id'],
        ];
    }
}
