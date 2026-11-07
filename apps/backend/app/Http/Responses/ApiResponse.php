<?php

namespace App\Http\Responses;

use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Http\JsonResponse;

final class ApiResponse
{
    /**
     * Build a consistent success response envelope.
     *
     * @param  array<string, mixed>|null  $meta
     */
    public static function success(
        mixed $data = null,
        string $message = 'OK',
        int $status = 200,
        ?array $meta = null,
    ): JsonResponse {
        $payload = [
            'success' => true,
            'data' => $data,
            'message' => $message,
        ];

        if ($meta !== null) {
            $payload['meta'] = $meta;
        }

        return response()->json($payload, $status);
    }

    /**
     * Build a paginated success response envelope.
     *
     * @param  iterable<int, mixed>  $items
     */
    public static function paginated(
        LengthAwarePaginator $paginator,
        iterable $items,
        string $message = 'OK',
    ): JsonResponse {
        return self::success($items, $message, 200, [
            'current_page' => $paginator->currentPage(),
            'per_page' => $paginator->perPage(),
            'total' => $paginator->total(),
            'last_page' => $paginator->lastPage(),
        ]);
    }

    /**
     * Build a consistent error response envelope.
     *
     * @param  array<string, array<int, string>>|null  $errors
     */
    public static function error(string $message, int $status = 400, ?array $errors = null): JsonResponse
    {
        $payload = [
            'success' => false,
            'data' => null,
            'message' => $message,
        ];

        if ($errors !== null) {
            $payload['errors'] = $errors;
        }

        return response()->json($payload, $status);
    }
}
