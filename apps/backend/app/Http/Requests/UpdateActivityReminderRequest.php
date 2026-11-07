<?php

namespace App\Http\Requests;

use App\Enums\ReminderChannel;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateActivityReminderRequest extends FormRequest
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
            'reminder_at' => ['sometimes', 'required', 'date'],
            'is_enabled' => ['sometimes', 'boolean'],
            'channel' => ['sometimes', Rule::enum(ReminderChannel::class)],
            'client_updated_at' => ['sometimes', 'nullable', 'date'],
        ];
    }
}
