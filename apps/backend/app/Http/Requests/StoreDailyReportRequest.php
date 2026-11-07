<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreDailyReportRequest extends FormRequest
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
            'report_date' => ['required', 'date', 'before_or_equal:today'],
            'summary' => ['nullable', 'string', 'max:5000'],
            'self_assessment' => ['nullable', 'string', 'max:5000'],
            'client_created_at' => ['nullable', 'date'],
            'client_updated_at' => ['nullable', 'date'],
        ];
    }
}
