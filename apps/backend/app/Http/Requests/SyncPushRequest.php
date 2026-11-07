<?php

namespace App\Http\Requests;

use App\Enums\ConflictResolutionPolicy;
use App\Enums\SyncEntityType;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class SyncPushRequest extends FormRequest
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
            'device_id' => ['nullable', 'integer', 'exists:user_devices,id'],
            'conflict_policy' => ['sometimes', Rule::enum(ConflictResolutionPolicy::class)],
            'operations' => ['required', 'array', 'min:1', 'max:200'],
            'operations.*.operation_uuid' => ['required', 'uuid'],
            'operations.*.entity_type' => ['required', Rule::enum(SyncEntityType::class)],
            'operations.*.entity_uuid' => ['required', 'uuid'],
            'operations.*.operation_type' => ['required', 'string', 'in:create,update,delete'],
            'operations.*.client_version' => ['nullable', 'integer', 'min:0'],
            'operations.*.client_updated_at' => ['nullable', 'date'],
            'operations.*.payload' => ['nullable', 'array'],
        ];
    }
}
