<?php

namespace App\Http\Requests;

use App\Models\Ride;
use App\Support\DriverLocation;
use App\Support\PlaceResolver;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

/** Driver publishes a ride. Ownership of the vehicle is re-checked in PublishRide. */
class StoreRideRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->isApprovedDriver() ?? false;
    }

    protected function prepareForValidation(): void
    {
        foreach (['pickup_point', 'dropoff_point', 'notes', 'event_name', 'origin_place', 'destination_place'] as $field) {
            if (is_string($this->input($field))) {
                $this->merge([$field => trim(strip_tags($this->input($field)))]);
            }
        }
    }

    /** After validation: a typed event replaces any picked announcement (one or the other, never both). */
    public function validated($key = null, $default = null)
    {
        $data = parent::validated();

        // A typed / picked place becomes a city row (created on first use); the rest of the app only sees ids.
        foreach (['origin', 'destination'] as $end) {
            if (filled($data[$end.'_place'] ?? null)) {
                $data[$end.'_city_id'] = PlaceResolver::cityId($data[$end.'_province'], $data[$end.'_place']);
            }
            unset($data[$end.'_place'], $data[$end.'_province']);
        }

        $data['event_name'] = filled($data['event_name'] ?? null) ? $data['event_name'] : null;
        if ($data['event_name']) {
            $data['announcement_id'] = null;
        }

        return $key ? data_get($data, $key, $default) : $data;
    }

    /** From and To must not be the same place, and From must be where the driver last arrived. */
    public function after(): array
    {
        return [function (Validator $v) {
            if ($v->errors()->isNotEmpty()) {
                return;
            }

            $key = fn (string $end) => filled($this->input($end.'_place'))
                ? ($id = PlaceResolver::find((string) $this->input($end.'_province'), (string) $this->input($end.'_place')))
                    ? "id:$id"
                    : 'new:'.mb_strtolower($this->input($end.'_province').'|'.PlaceResolver::clean($this->input($end.'_place')))
                : 'id:'.(int) $this->input($end.'_city_id');

            // A driver who has arrived somewhere can only start the next ride from that town.
            // (Editing an old ride is fine as long as its starting place is not changed.)
            $arrival = DriverLocation::lastArrival($this->user());
            $editing = $this->route('ride');
            $unchanged = $editing instanceof Ride && $key('origin') === 'id:'.$editing->origin_city_id;

            if ($arrival && ! $unchanged && $key('origin') !== 'id:'.$arrival->id) {
                $v->errors()->add('origin_city_id', "You last arrived in {$arrival->name}".($arrival->province ? ", {$arrival->province->name}" : '').'. Your next ride must start from there.');

                return;
            }

            if ($key('origin') === $key('destination')) {
                $v->errors()->add('destination_city_id', 'The destination must be different from the starting place.');
            }
        }];
    }

    public function rules(): array
    {
        $provinces = PlaceResolver::provinceNames();
        // Letters (any language), digits, spaces and . , ' ( ) - ñ/Ñ — no markup.
        $placeRegex = "regex:/^[\\p{L}\\p{N}\\s.,'()\\-]+$/u";

        return [
            'vehicle_id' => ['required', 'integer', 'exists:vehicles,id'],
            // Either an existing city id, or a province + own place typed/picked by the driver.
            'origin_city_id' => ['nullable', 'required_without:origin_place', 'integer', 'exists:cities,id'],
            'origin_place' => ['nullable', 'required_without:origin_city_id', 'string', 'min:2', 'max:80', $placeRegex],
            'origin_province' => ['nullable', 'required_with:origin_place', 'string', Rule::in($provinces)],
            'destination_city_id' => ['nullable', 'required_without:destination_place', 'integer', 'exists:cities,id'],
            'destination_place' => ['nullable', 'required_without:destination_city_id', 'string', 'min:2', 'max:80', $placeRegex],
            'destination_province' => ['nullable', 'required_with:destination_place', 'string', Rule::in($provinces)],
            'pickup_point' => ['required', 'string', 'max:150'],
            'dropoff_point' => ['nullable', 'string', 'max:150'],
            'departure_at' => ['required', 'date', 'after:now'],
            'seats_offered' => ['required', 'integer', 'min:1', 'max:20'],
            'price_per_seat' => ['required', 'numeric', 'min:0', 'max:50000'],
            'notes' => ['nullable', 'string', 'max:1000'],
            'announcement_id' => ['nullable', 'integer', 'exists:announcements,id'],
            'event_name' => ['nullable', 'string', 'max:120'],
        ];
    }
}
