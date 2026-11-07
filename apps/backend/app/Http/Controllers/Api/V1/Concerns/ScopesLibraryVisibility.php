<?php

namespace App\Http\Controllers\Api\V1\Concerns;

use App\Enums\LibraryVisibility;
use App\Models\LibraryResource;
use App\Models\User;
use Illuminate\Database\Eloquent\Builder;

trait ScopesLibraryVisibility
{
    /**
     * Limit a library resource query to items visible to the given user.
     */
    protected function visibleLibraryResources(User $user): Builder
    {
        $query = LibraryResource::query();

        if ($user->isAdmin()) {
            return $query;
        }

        $groupIds = $user->groups()->pluck('groups.id')->all();

        return $query->where(function (Builder $query) use ($user, $groupIds): void {
            $query->where('visibility', LibraryVisibility::Public->value)
                ->orWhere('uploaded_by', $user->id)
                ->orWhere(function (Builder $query) use ($user, $groupIds): void {
                    $query->where('visibility', LibraryVisibility::Assigned->value)
                        ->whereHas('permissions', function (Builder $permission) use ($user, $groupIds): void {
                            $permission->where('user_id', $user->id);

                            if ($groupIds !== []) {
                                $permission->orWhereIn('group_id', $groupIds);
                            }
                        });
                });
        });
    }
}
