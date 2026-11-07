<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreDeviceTokenRequest extends FormRequest
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
            'device_token' => ['required', 'string', 'max:512'],
            'device_type' => ['required', 'string', 'in:android,ios,web,other'],
            'device_identifier' => ['nullable', 'string', 'max:255'],
        ];
    }
}
