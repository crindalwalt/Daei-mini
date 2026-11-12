<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Controller;
use App\Http\Resources\AdminGroupResource;
use App\Http\Resources\AdminUserResource;
use App\Http\Resources\DailyReportResource;
use App\Http\Responses\ApiResponse;
use App\Models\DailyReport;
use App\Models\Group;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SearchController extends Controller
{
    /**
     * Search users, groups and reports for the global admin search.
     */
    public function index(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'q' => ['required', 'string', 'min:2', 'max:255'],
        ]);

        $term = trim($validated['q']);
        $like = '%'.str_replace(['%', '_'], ['\%', '\_'], $term).'%';

        $users = User::query()
            ->with('groups')
            ->withCount(['activities', 'dailyReports'])
            ->withAvg('dailyReports as average_score', 'calculated_score')
            ->where(fn ($query) => $query
                ->where('name', 'like', $like)
                ->orWhere('email', 'like', $like))
            ->limit(5)
            ->get();

        $groups = Group::query()
            ->withCount('users')
            ->where(fn ($query) => $query
                ->where('name', 'like', $like)
                ->orWhere('description', 'like', $like)
                ->orWhere('leader_name', 'like', $like))
            ->limit(5)
            ->get();

        $reports = DailyReport::query()
            ->with('user')
            ->withCount('comments')
            ->where(fn ($query) => $query
                ->where('summary', 'like', $like)
                ->orWhereHas('user', fn ($user) => $user
                    ->where('name', 'like', $like)
                    ->orWhere('email', 'like', $like)))
            ->orderByDesc('report_date')
            ->limit(5)
            ->get();

        return ApiResponse::success([
            'query' => $term,
            'users' => AdminUserResource::collection($users),
            'groups' => AdminGroupResource::collection($groups),
            'reports' => DailyReportResource::collection($reports),
        ], 'Search results retrieved.');
    }
}
