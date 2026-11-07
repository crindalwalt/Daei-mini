<?php

namespace App\Http\Requests;

use App\Enums\ReminderChannel;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreActivityReminderRequest extends FormRequest
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
            'uuid' => ['sometimes', 'uuid'],
            'reminder_at' => ['required', 'date', 'after:now'],
            'is_enabled' => ['sometimes', 'boolean'],
            'channel' => ['sometimes', Rule::enum(ReminderChannel::class)],
            'client_created_at' => ['nullable', 'date'],
            'client_updated_at' => ['nullable', 'date'],
        ];
    }
}
