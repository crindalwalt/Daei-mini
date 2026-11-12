<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class DailyReportResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'uuid' => $this->uuid,
            'user_id' => $this->user_id,
            'user_name' => $this->whenLoaded('user', fn () => $this->user?->name),
            'user_email' => $this->whenLoaded('user', fn () => $this->user?->email),
            'report_date' => $this->report_date?->toDateString(),
            'summary' => $this->summary,
            'self_assessment' => $this->self_assessment,
            'calculated_score' => (float) ($this->calculated_score ?? 0),
            'scheduled_count' => (int) ($this->scheduled_count ?? 0),
            'completed_count' => (int) ($this->completed_count ?? 0),
            // Legacy aliases retained for existing clients.
            'score' => $this->score === null ? null : (float) $this->score,
            'completed_activities_count' => (int) $this->completed_activities_count,
            'total_activities_count' => (int) $this->total_activities_count,
            'submitted_at' => $this->submitted_at?->toIso8601String(),
            'status' => $this->status ?? 'submitted',
            'reviewed_at' => $this->reviewed_at?->toIso8601String(),
            'comments_count' => $this->whenCounted('comments', fn () => (int) $this->comments_count),
            'activities' => DailyReportActivityResource::collection($this->whenLoaded('activities')),
            'comments' => DailyReportCommentResource::collection($this->whenLoaded('comments')),
            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),
        ];
    }
}
