<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class BookmarkResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'uuid' => $this->uuid,
            'library_resource_id' => $this->library_resource_id,
            'library_resource' => new LibraryItemResource($this->whenLoaded('libraryResource')),
            'created_at' => $this->created_at?->toIso8601String(),
        ];
    }
}
