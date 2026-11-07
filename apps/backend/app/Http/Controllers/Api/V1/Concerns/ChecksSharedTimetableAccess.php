<?php

namespace App\Http\Controllers\Api\V1\Concerns;

use App\Models\SharedTimetable;
use App\Models\User;

trait ChecksSharedTimetableAccess
{
    /**
     * Abort with 404 unless the user is an administrator, the creator,
     * or an explicitly assigned user/group member.
     */
    protected function ensureTimetableAccessible(User $user, SharedTimetable $timetable): void
    {
        if ($user->isAdmin() || $timetable->created_by === $user->id) {
            return;
        }

        $groupIds = $user->groups()->pluck('groups.id')->all();

        $accessible = $timetable->assignments()
            ->where(function ($query) use ($user, $groupIds): void {
                $query->where('user_id', $user->id);

                if ($groupIds !== []) {
                    $query->orWhereIn('group_id', $groupIds);
                }
            })
            ->exists();

        abort_unless($accessible, 404);
    }
}
