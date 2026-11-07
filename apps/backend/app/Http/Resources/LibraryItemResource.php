<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class LibraryItemResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'uuid' => $this->uuid,
            'title' => $this->title,
            'description' => $this->description,
            'file_name' => $this->file_name,
            'mime_type' => $this->mime_type,
            'file_size' => (int) $this->file_size,
            'visibility' => $this->visibility?->value,
            'status' => $this->status,
            'uploaded_by' => $this->uploaded_by,
            'is_bookmarked' => $this->when(
                $request->user() !== null,
                fn () => $this->bookmarks->contains('user_id', $request->user()->id),
            ),
            'download_url' => route('library.download', ['libraryResource' => $this->id]),
            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),
        ];
    }
}
