<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class AdminReportCommentResource extends JsonResource
{
    /**
     * Present a report comment in the compact shape used by the admin UI.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $author = $this->whenLoaded('author');

        return [
            'id' => $this->id,
            'author' => $author?->name ?? 'Administrator',
            'role' => $author?->role?->value === 'admin' ? 'Administrator' : 'Member',
            'comment' => $this->comment,
            'created_at' => $this->created_at?->toIso8601String(),
        ];
    }
}
