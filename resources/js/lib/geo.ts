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
