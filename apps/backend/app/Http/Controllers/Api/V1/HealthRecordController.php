<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreHealthRecordRequest;
use App\Http\Requests\UpdateHealthRecordRequest;
use App\Http\Resources\HealthRecordResource;
use App\Http\Responses\ApiResponse;
use App\Models\HealthRecord;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Validation\ValidationException;

class HealthRecordController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $request->validate([
            'from' => ['sometimes', 'date'],
            'to' => ['sometimes', 'date', 'after_or_equal:from'],
            'per_page' => ['sometimes', 'integer', 'between:1,100'],
        ]);

        $query = HealthRecord::query()
            ->ownedBy($request->user())
            ->orderByDesc('record_date');

        if ($request->filled('from')) {
            $query->whereDate('record_date', '>=', $request->date('from')->toDateString());
        }

        if ($request->filled('to')) {
            $query->whereDate('record_date', '<=', $request->date('to')->toDateString());
        }

        $paginator = $query->paginate((int) $request->integer('per_page', 30));

        return ApiResponse::paginated(
            $paginator,
            HealthRecordResource::collection($paginator->items()),
            'Health records retrieved.',
        );
    }

    public function store(StoreHealthRecordRequest $request): JsonResponse
    {
        $data = $request->validated();
        $this->validateBloodPressure($data);

        $date = Carbon::parse($data['record_date'])->toDateString();
        $record = HealthRecord::query()
            ->ownedBy($request->user())
            ->whereDate('record_date', $date)
            ->first();

        $wasRecentlyCreated = $record === null;
        $record ??= new HealthRecord([
            'user_id' => $request->user()->id,
            'record_date' => $date,
        ]);

        if (isset($data['uuid'])) {
            $record->uuid = $data['uuid'];
        }

        $record->fill(array_diff_key($data, ['uuid' => true]));
        $record->user_id = $request->user()->id;
        $record->record_date = $date;
        $record->server_version = $wasRecentlyCreated ? 1 : ((int) $record->server_version) + 1;
        $record->synced_at = now();
        $record->save();

        return ApiResponse::success(
            new HealthRecordResource($record),
            'Health record saved.',
            $wasRecentlyCreated ? 201 : 200,
        );
    }

    public function show(Request $request, HealthRecord $healthRecord): JsonResponse
    {
        $this->ensureOwned($request, $healthRecord);

        return ApiResponse::success(new HealthRecordResource($healthRecord));
    }

    public function update(UpdateHealthRecordRequest $request, HealthRecord $healthRecord): JsonResponse
    {
        $this->ensureOwned($request, $healthRecord);

        $data = $request->validated();
        $this->validateBloodPressure(array_merge($healthRecord->toArray(), $data));

        $healthRecord->fill($data);
        $healthRecord->server_version = ((int) $healthRecord->server_version) + 1;
        $healthRecord->synced_at = now();
        $healthRecord->save();

        return ApiResponse::success(new HealthRecordResource($healthRecord->refresh()), 'Health record updated.');
    }

    public function destroy(Request $request, HealthRecord $healthRecord): JsonResponse
    {
        $this->ensureOwned($request, $healthRecord);
        $healthRecord->delete();

        return ApiResponse::success(null, 'Health record deleted.');
    }

    public function summary(Request $request): JsonResponse
    {
        $request->validate([
            'from' => ['sometimes', 'date'],
            'to' => ['sometimes', 'date', 'after_or_equal:from'],
        ]);

        $query = HealthRecord::query()->ownedBy($request->user());

        if ($request->filled('from')) {
            $query->whereDate('record_date', '>=', $request->date('from')->toDateString());
        }

        if ($request->filled('to')) {
            $query->whereDate('record_date', '<=', $request->date('to')->toDateString());
        }

        $aggregates = (clone $query)
            ->selectRaw('COUNT(*) as record_count')
            ->selectRaw('AVG(weight_kg) as average_weight_kg')
            ->selectRaw('AVG(water_ml) as average_water_ml')
            ->selectRaw('AVG(sleep_hours) as average_sleep_hours')
            ->first();

        $latest = (clone $query)->orderByDesc('record_date')->first();

        return ApiResponse::success([
            'record_count' => (int) ($aggregates->record_count ?? 0),
            'average_weight_kg' => $aggregates?->average_weight_kg === null ? null : round((float) $aggregates->average_weight_kg, 2),
            'average_water_ml' => $aggregates?->average_water_ml === null ? null : round((float) $aggregates->average_water_ml, 2),
            'average_sleep_hours' => $aggregates?->average_sleep_hours === null ? null : round((float) $aggregates->average_sleep_hours, 2),
            'latest' => $latest === null ? null : new HealthRecordResource($latest),
        ]);
    }

    private function ensureOwned(Request $request, HealthRecord $healthRecord): void
    {
        abort_unless($healthRecord->user_id === $request->user()->id, 404);
    }

    /**
     * @param  array<string, mixed>  $data
     */
    private function validateBloodPressure(array $data): void
    {
        $systolic = $data['blood_pressure_systolic'] ?? null;
        $diastolic = $data['blood_pressure_diastolic'] ?? null;

        if ($systolic !== null && $diastolic !== null && (int) $systolic < (int) $diastolic) {
            throw ValidationException::withMessages([
                'blood_pressure_systolic' => ['Systolic pressure must be greater than or equal to diastolic pressure.'],
            ]);
        }
    }
}
