// Tiny wrappers around the browser GPS and OpenStreetMap's free Nominatim service
// (no API key needed). Nominatim's usage policy asks for user-triggered searches only
// (no autocomplete-on-every-keystroke), so every call below is started by a button/Enter.

export type LatLng = { lat: number; lng: number };

/** Philippines-wide default map centre (used when a city has no coordinates yet). */
export const PH_CENTER: LatLng = { lat: 11.0, lng: 124.8 };

const NOMINATIM = 'https://nominatim.openstreetmap.org';

/** Search a place name inside the Philippines. Returns null when nothing is found. */
export async function searchPlace(
    query: string,
): Promise<(LatLng & { label: string }) | null> {
    const url = `${NOMINATIM}/search?format=jsonv2&limit=1&countrycodes=ph&q=${encodeURIComponent(query)}`;
    const res = await fetch(url, { headers: { 'Accept-Language': 'en' } });

    if (!res.ok) {
        return null;
    }

    const hit = (
        (await res.json()) as {
            lat: string;
            lon: string;
            display_name: string;
        }[]
    )[0];

    return hit
        ? {
              lat: Number(hit.lat),
              lng: Number(hit.lon),
              label: hit.display_name,
          }
        : null;
}

/** Turn coordinates into a readable address (used after "Use my location" or a map click). */
export async function reverseGeocode(p: LatLng): Promise<string | null> {
    const res = await fetch(
        `${NOMINATIM}/reverse?format=jsonv2&lat=${p.lat}&lon=${p.lng}`,
        { headers: { 'Accept-Language': 'en' } },
    );

    return res.ok
        ? (((await res.json()) as { display_name?: string }).display_name ??
              null)
        : null;
}

/** One-shot GPS reading (asks the browser for permission). */
export function currentPosition(): Promise<LatLng> {
    return new Promise((resolve, reject) => {
        if (!('geolocation' in navigator)) {
            reject(new Error('This browser has no GPS support.'));

            return;
        }

        navigator.geolocation.getCurrentPosition(
            (pos) =>
                resolve({
                    lat: pos.coords.latitude,
                    lng: pos.coords.longitude,
                }),
            () =>
                reject(
                    new Error('Location permission was denied or unavailable.'),
                ),
            { enableHighAccuracy: true, timeout: 10000 },
        );
    });
}

export type RouteInfo = {
    /** polyline as [lat, lng] pairs, ready for Leaflet */
    coords: [number, number][];
    km: number;
    min: number;
};

/**
 * Driving route + road distance + travel time between two points, from the public OSRM demo server
 * (no API key). Returns null when offline / rate-limited, so callers fall back to the server's
 * straight-line estimate. For production traffic, host your own OSRM or use a paid routing API.
 */
export async function routeBetween(
    a: LatLng,
    b: LatLng,
): Promise<RouteInfo | null> {
    try {
        const ctrl = new AbortController();
        const timer = setTimeout(() => ctrl.abort(), 8000);
        const res = await fetch(
            `https://router.project-osrm.org/route/v1/driving/${a.lng},${a.lat};${b.lng},${b.lat}?overview=full&geometries=geojson`,
            { signal: ctrl.signal },
        );
        clearTimeout(timer);

        if (!res.ok) {
            return null;
        }

        const json = (await res.json()) as {
            routes?: {
                distance: number;
                duration: number;
                geometry: { coordinates: [number, number][] };
            }[];
        };
        const r = json.routes?.[0];

        if (!r) {
            return null;
        }

        return {
            coords: r.geometry.coordinates.map(([lng, lat]) => [lat, lng]),
            km: r.distance / 1000,
            min: Math.max(1, Math.round(r.duration / 60)),
        };
    } catch {
        return null;
    }
}

/** Straight-line distance in km between two points (used to decide when to re-route). */
export function distanceKm(a: LatLng, b: LatLng): number {
    const rad = (d: number) => (d * Math.PI) / 180;
    const h =
        Math.sin(rad(b.lat - a.lat) / 2) ** 2 +
        Math.cos(rad(a.lat)) *
            Math.cos(rad(b.lat)) *
            Math.sin(rad(b.lng - a.lng) / 2) ** 2;

    return 6371.0088 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}
