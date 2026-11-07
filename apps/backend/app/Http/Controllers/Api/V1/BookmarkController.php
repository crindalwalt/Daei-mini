<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Api\V1\Concerns\ScopesLibraryVisibility;
use App\Http\Controllers\Controller;
use App\Http\Requests\StoreBookmarkRequest;
use App\Http\Resources\BookmarkResource;
use App\Http\Responses\ApiResponse;
use App\Models\Bookmark;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class BookmarkController extends Controller
{
    use ScopesLibraryVisibility;

    public function index(Request $request): JsonResponse
    {
        $paginator = Bookmark::query()
            ->ownedBy($request->user())
            ->with([
                'libraryResource.bookmarks' => fn ($query) => $query->where('user_id', $request->user()->id),
            ])
            ->orderByDesc('created_at')
            ->paginate((int) $request->integer('per_page', 20));

        return ApiResponse::paginated(
            $paginator,
            BookmarkResource::collection($paginator->items()),
            'Bookmarks retrieved.',
        );
    }

    public function store(StoreBookmarkRequest $request): JsonResponse
    {
        $user = $request->user();

        $resource = $this->visibleLibraryResources($user)
            ->whereKey($request->integer('library_resource_id'))
            ->first();

        abort_if($resource === null, 404);

        $bookmark = Bookmark::query()
            ->withTrashed()
            ->where('user_id', $user->id)
            ->where('library_resource_id', $resource->id)
            ->first();

        $wasRecentlyCreated = $bookmark === null;
        $bookmark ??= new Bookmark([
            'user_id' => $user->id,
            'library_resource_id' => $resource->id,
        ]);

        if ($bookmark->trashed()) {
            $bookmark->restore();
        }

        $bookmark->server_version = $wasRecentlyCreated ? 1 : ((int) $bookmark->server_version) + 1;
        $bookmark->synced_at = now();
        $bookmark->save();
        $bookmark->load([
            'libraryResource.bookmarks' => fn ($query) => $query->where('user_id', $user->id),
        ]);

        return ApiResponse::success(
            new BookmarkResource($bookmark),
            'Bookmark saved.',
            $wasRecentlyCreated ? 201 : 200,
        );
    }

    public function destroy(Request $request, Bookmark $bookmark): JsonResponse
    {
        abort_unless($bookmark->user_id === $request->user()->id, 404);
        $bookmark->delete();

        return ApiResponse::success(null, 'Bookmark removed.');
    }
}
