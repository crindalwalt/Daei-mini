<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Api\V1\Concerns\ScopesLibraryVisibility;
use App\Http\Controllers\Controller;
use App\Http\Requests\StoreLibraryResourcePermissionRequest;
use App\Http\Requests\StoreLibraryResourceRequest;
use App\Http\Requests\UpdateLibraryResourceRequest;
use App\Http\Resources\LibraryItemResource;
use App\Http\Resources\LibraryPermissionResource;
use App\Http\Responses\ApiResponse;
use App\Models\LibraryResource;
use App\Models\LibraryResourcePermission;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\BinaryFileResponse;
use Symfony\Component\HttpFoundation\StreamedResponse;

class LibraryResourceController extends Controller
{
    use ScopesLibraryVisibility;

    public function index(Request $request): JsonResponse
    {
        $request->validate([
            'search' => ['sometimes', 'string', 'max:255'],
            'status' => ['sometimes', 'string', 'in:active,archived'],
            'per_page' => ['sometimes', 'integer', 'between:1,100'],
        ]);

        $query = $this->visibleLibraryResources($request->user())
            ->with(['bookmarks' => fn ($query) => $query->where('user_id', $request->user()->id)])
            ->orderByDesc('created_at');

        if ($request->filled('search')) {
            $query->where('title', 'like', '%'.$request->string('search')->toString().'%');
        }

        if ($request->filled('status')) {
            $query->where('status', $request->string('status')->toString());
        }

        $paginator = $query->paginate((int) $request->integer('per_page', 20));

        return ApiResponse::paginated(
            $paginator,
            LibraryItemResource::collection($paginator->items()),
            'Library resources retrieved.',
        );
    }

    public function store(StoreLibraryResourceRequest $request): JsonResponse
    {
        $file = $request->file('file');

        abort_if($file === null, 422, 'A resource file is required.');

        $path = $file->store('library-resources', 'local');

        abort_if($path === false, 500, 'The resource could not be stored.');

        $resource = LibraryResource::create([
            'title' => $request->string('title')->toString(),
            'description' => $request->input('description'),
            'category' => $request->input('category'),
            'file_name' => $file->getClientOriginalName(),
            'storage_disk' => 'local',
            'storage_path' => $path,
            'mime_type' => $file->getClientMimeType() ?? 'application/octet-stream',
            'file_size' => $file->getSize(),
            'uploaded_by' => $request->user()->id,
            'visibility' => $request->input('visibility', 'private'),
            'status' => $request->input('status', 'active'),
            'client_created_at' => now(),
            'client_updated_at' => now(),
            'server_version' => 1,
            'synced_at' => now(),
        ]);

        $resource->load(['bookmarks' => fn ($query) => $query->where('user_id', $request->user()->id)]);

        return ApiResponse::success(new LibraryItemResource($resource), 'Library resource created.', 201);
    }

    public function show(Request $request, LibraryResource $libraryResource): JsonResponse
    {
        $this->ensureVisible($request, $libraryResource);

        $libraryResource->load([
            'bookmarks' => fn ($query) => $query->where('user_id', $request->user()->id),
            'permissions',
        ]);

        return ApiResponse::success(new LibraryItemResource($libraryResource));
    }

    public function update(
        UpdateLibraryResourceRequest $request,
        LibraryResource $libraryResource,
    ): JsonResponse {
        $libraryResource->fill($request->validated());
        $libraryResource->server_version = ((int) $libraryResource->server_version) + 1;
        $libraryResource->synced_at = now();
        $libraryResource->save();

        $libraryResource->load(['bookmarks' => fn ($query) => $query->where('user_id', $request->user()->id)]);

        return ApiResponse::success(new LibraryItemResource($libraryResource->refresh()), 'Library resource updated.');
    }

    public function destroy(LibraryResource $libraryResource): JsonResponse
    {
        Storage::disk($libraryResource->storage_disk)->delete($libraryResource->storage_path);
        $libraryResource->delete();

        return ApiResponse::success(null, 'Library resource deleted.');
    }

    public function download(Request $request, LibraryResource $libraryResource): BinaryFileResponse|StreamedResponse
    {
        $this->ensureVisible($request, $libraryResource);

        $disk = Storage::disk($libraryResource->storage_disk);

        abort_unless($disk->exists($libraryResource->storage_path), 404);

        return $disk->download($libraryResource->storage_path, $libraryResource->file_name);
    }

    public function permissions(Request $request, LibraryResource $libraryResource): JsonResponse
    {
        return ApiResponse::success(
            LibraryPermissionResource::collection(
                $libraryResource->permissions()->orderBy('id')->get(),
            ),
            'Library permissions retrieved.',
        );
    }

    public function storePermission(
        StoreLibraryResourcePermissionRequest $request,
        LibraryResource $libraryResource,
    ): JsonResponse {
        $data = $request->validated();

        $permission = $libraryResource->permissions()->updateOrCreate(
            [
                'user_id' => $data['user_id'] ?? null,
                'group_id' => $data['group_id'] ?? null,
            ],
            [],
        );

        return ApiResponse::success(
            new LibraryPermissionResource($permission),
            'Library permission granted.',
            201,
        );
    }

    public function destroyPermission(
        LibraryResource $libraryResource,
        LibraryResourcePermission $permission,
    ): JsonResponse {
        abort_unless($permission->library_resource_id === $libraryResource->id, 404);
        $permission->delete();

        return ApiResponse::success(null, 'Library permission revoked.');
    }

    private function ensureVisible(Request $request, LibraryResource $resource): void
    {
        $visible = $this->visibleLibraryResources($request->user())
            ->whereKey($resource->id)
            ->exists();

        abort_unless($visible, 404);
    }
}
