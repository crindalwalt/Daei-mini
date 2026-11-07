<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpdateDailyReportRequest extends FormRequest
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
            'summary' => ['sometimes', 'nullable', 'string', 'max:5000'],
            'self_assessment' => ['sometimes', 'nullable', 'string', 'max:5000'],
            'client_updated_at' => ['sometimes', 'nullable', 'date'],
        ];
    }
}
