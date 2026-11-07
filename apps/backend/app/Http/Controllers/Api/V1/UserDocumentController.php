<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreUserDocumentRequest;
use App\Http\Requests\UpdateUserDocumentRequest;
use App\Http\Resources\UserDocumentResource;
use App\Http\Responses\ApiResponse;
use App\Models\UserDocument;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\BinaryFileResponse;
use Symfony\Component\HttpFoundation\StreamedResponse;

class UserDocumentController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $request->validate([
            'category' => ['sometimes', 'string', 'max:100'],
            'search' => ['sometimes', 'string', 'max:255'],
            'per_page' => ['sometimes', 'integer', 'between:1,100'],
        ]);

        $query = UserDocument::query()
            ->ownedBy($request->user())
            ->orderByDesc('created_at');

        if ($request->filled('category')) {
            $query->where('category', $request->string('category')->toString());
        }

        if ($request->filled('search')) {
            $query->where('title', 'like', '%'.$request->string('search')->toString().'%');
        }

        $paginator = $query->paginate((int) $request->integer('per_page', 20));

        return ApiResponse::paginated(
            $paginator,
            UserDocumentResource::collection($paginator->items()),
            'Documents retrieved.',
        );
    }

    public function store(StoreUserDocumentRequest $request): JsonResponse
    {
        $user = $request->user();
        $file = $request->file('file');

        abort_if($file === null, 422, 'A document file is required.');

        $path = $file->store('user-documents/'.$user->id, 'local');

        abort_if($path === false, 500, 'The document could not be stored.');

        $document = UserDocument::create([
            'user_id' => $user->id,
            'title' => $request->string('title')->toString(),
            'description' => $request->input('description'),
            'category' => $request->input('category'),
            'file_name' => $file->getClientOriginalName(),
            'storage_disk' => 'local',
            'storage_path' => $path,
            'mime_type' => $file->getClientMimeType() ?? 'application/octet-stream',
            'file_size' => $file->getSize(),
            'is_private' => $request->boolean('is_private', true),
            'client_created_at' => now(),
            'client_updated_at' => now(),
            'server_version' => 1,
            'synced_at' => now(),
        ]);

        return ApiResponse::success(
            new UserDocumentResource($document),
            'Document uploaded.',
            201,
        );
    }

    public function show(Request $request, UserDocument $document): JsonResponse
    {
        $this->ensureOwned($request, $document);

        return ApiResponse::success(new UserDocumentResource($document));
    }

    public function update(UpdateUserDocumentRequest $request, UserDocument $document): JsonResponse
    {
        $this->ensureOwned($request, $document);

        $document->fill($request->validated());
        $document->server_version = ((int) $document->server_version) + 1;
        $document->synced_at = now();
        $document->save();

        return ApiResponse::success(new UserDocumentResource($document->refresh()), 'Document updated.');
    }

    public function destroy(Request $request, UserDocument $document): JsonResponse
    {
        $this->ensureOwned($request, $document);

        Storage::disk($document->storage_disk)->delete($document->storage_path);
        $document->delete();

        return ApiResponse::success(null, 'Document deleted.');
    }

    public function download(Request $request, UserDocument $document): BinaryFileResponse|StreamedResponse
    {
        $this->ensureOwned($request, $document);

        $disk = Storage::disk($document->storage_disk);

        abort_unless($disk->exists($document->storage_path), 404);

        return $disk->download($document->storage_path, $document->file_name);
    }

    private function ensureOwned(Request $request, UserDocument $document): void
    {
        abort_unless($document->user_id === $request->user()->id, 404);
    }
}
