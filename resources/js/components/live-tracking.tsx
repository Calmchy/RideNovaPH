// Live GPS tracking panel, shown on the booking page to BOTH sides of a confirmed trip.
//
//   Driver phone   -> "Share my location" -> watchPosition -> POST /tracking/rides/{ride}/ping (every ~5 s)
//   Passenger phone-> same button, so the driver can find them
//   Both           -> poll GET /bookings/{booking}/tracking (every 5 s) and draw the OTHER person on the map
//
// What each side sees: route + distance + ETA to the pick-up, then to the destination, and a banner
// (+ browser notification) when the driver reaches the pinned pick-up. The server decides who may see
// what (TrackingController); this file only draws it.
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { BellRing, Car, LocateFixed, Navigation, Radio } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { distanceKm, PH_CENTER, routeBetween } from '@/lib/geo';
import type { LatLng, RouteInfo } from '@/lib/geo';

type Point = {
    lat: number;
    lng: number;
    heading: number | null;
    speed_kmh: number | null;
    seconds_ago: number;
    online: boolean;
};
type Place = { lat: number; lng: number; label: string | null };
type Tracking = {
    role: 'driver' | 'passenger';
    window_open: boolean;
    arrived: boolean;
    arrived_at: string | null;
    pickup: Place | null;
    destination: Place | null;
    driver: Point | null;
    passenger: Point | null;
    metrics: {
        estimated: boolean;
        to_pickup_km: number | null;
        to_pickup_min: number | null;
        to_destination_km: number | null;
        to_destination_min: number | null;
    };
};

const POLL_MS = 5000; // how often the other person's position is refreshed
const PING_MS = 4000; // at most one GPS report per this many ms
const REROUTE_MS = 15000; // OSRM is a free shared server: be gentle with it
const REROUTE_KM = 0.08; // ...and only re-route after moving ~80 m

/** Laravel's CSRF token travels in the XSRF-TOKEN cookie; echo it back in a header for fetch(). */
function xsrf(): string {
    const m = document.cookie.match(/(?:^|; )XSRF-TOKEN=([^;]+)/);

    return m ? decodeURIComponent(m[1]) : '';
}

function api(url: string, method: string, body?: object): Promise<Response> {
    return fetch(url, {
        method,
        credentials: 'same-origin',
        headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
            'X-Requested-With': 'XMLHttpRequest',
            'X-XSRF-TOKEN': xsrf(),
        },
        body: body ? JSON.stringify(body) : undefined,
    });
}

/** Round coloured marker (Leaflet's default image markers break under bundlers). */
const dot = (color: string, size = 18, glyph = '') =>
    L.divIcon({
        className: '',
        iconSize: [size, size],
        iconAnchor: [size / 2, size / 2],
        html: `<span style="display:flex;align-items:center;justify-content:center;width:${size}px;height:${size}px;border-radius:9999px;background:${color};border:3px solid #fff;box-shadow:0 1px 6px rgba(6,42,53,.5);font-size:${size - 8}px;line-height:1">${glyph}</span>`,
    });

const fmtKm = (km: number | null | undefined) =>
    km === null || km === undefined
        ? '—'
        : km < 1
          ? `${Math.round(km * 1000)} m`
          : `${km.toFixed(1)} km`;
const fmtMin = (min: number | null | undefined) =>
    min === null || min === undefined
        ? '—'
        : min < 1
          ? 'now'
          : min >= 60
            ? `${Math.floor(min / 60)} h ${min % 60} min`
            : `${min} min`;

export default function LiveTracking({
    bookingId,
    rideId,
    role,
}: {
    bookingId: number;
    rideId: number;
    role: 'driver' | 'passenger';
}) {
    const [data, setData] = useState<Tracking | null>(null);
    const [sharing, setSharing] = useState(false);
    const [me, setMe] = useState<LatLng | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [leg, setLeg] = useState<{
        to: 'pickup' | 'destination';
        route: RouteInfo;
    } | null>(null);
    const [full, setFull] = useState<RouteInfo | null>(null); // pick-up -> destination

    const box = useRef<HTMLDivElement>(null);
    const map = useRef<L.Map | null>(null);
    const layers = useRef<Record<string, L.Layer | undefined>>({});
    const fitted = useRef(false);
    const lastPing = useRef(0);
    const lastRoute = useRef<{ from: LatLng; to: string; at: number } | null>(
        null,
    );
    const wasArrived = useRef<boolean | null>(null);

    // ---------- 1. poll the other side's position ----------
    const load = useCallback(async () => {
        try {
            const res = await api(`/bookings/${bookingId}/tracking`, 'GET');

            if (res.ok) {
                setData((await res.json()) as Tracking);
            }
        } catch {
            /* offline: keep showing the last known data */
        }
    }, [bookingId]);

    useEffect(() => {
        const first = setTimeout(() => void load(), 0);
        const id = setInterval(() => void load(), POLL_MS);

        return () => {
            clearTimeout(first);
            clearInterval(id);
        };
    }, [load]);

    // ---------- 2. share my own GPS while the toggle is ON ----------
    useEffect(() => {
        if (!sharing) {
            return;
        }

        const watch = navigator.geolocation.watchPosition(
            (pos) => {
                const here = {
                    lat: pos.coords.latitude,
                    lng: pos.coords.longitude,
                };
                setMe(here);
                setError(null);

                if (Date.now() - lastPing.current < PING_MS) {
                    return;
                }

                lastPing.current = Date.now();
                const { heading, speed, accuracy } = pos.coords;
                void api(`/tracking/rides/${rideId}/ping`, 'POST', {
                    ...here,
                    heading:
                        heading !== null && !Number.isNaN(heading)
                            ? Math.round(heading) % 360
                            : null,
                    speed_kmh:
                        speed !== null && !Number.isNaN(speed)
                            ? Math.round(speed * 36) / 10
                            : null,
                    accuracy_m: Math.round(accuracy),
                }).then(async (res) => {
                    if (res.status === 422 || res.status === 403) {
                        setError(
                            'Live tracking is not open for this trip right now.',
                        );
                        setSharing(false);

                        return;
                    }

                    const out = (await res.json()) as { arrived?: number[] };

                    if (out.arrived?.length) {
                        void load();
                    }
                });
            },
            (e) => {
                setError(
                    e.code === e.PERMISSION_DENIED
                        ? 'Location permission was denied. Allow it in your browser settings.'
                        : 'Could not read your GPS position.',
                );
                setSharing(false);
            },
            { enableHighAccuracy: true, maximumAge: 3000, timeout: 20000 },
        );

        return () => navigator.geolocation.clearWatch(watch);
    }, [sharing, rideId, load]);

    const toggleSharing = async () => {
        if (sharing) {
            setSharing(false);
            setMe(null);
            await api(`/tracking/rides/${rideId}/ping`, 'DELETE'); // erase my stored position
            void load();

            return;
        }

        // Passengers get asked once for permission to show the "driver arrived" alert.
        if (
            role === 'passenger' &&
            'Notification' in window &&
            Notification.permission === 'default'
        ) {
            void Notification.requestPermission();
        }

        if (!('geolocation' in navigator)) {
            setError('This browser has no GPS support.');

            return;
        }

        setError(null);
        setSharing(true);
    };

    // ---------- 3. "driver arrived" alert ----------
    useEffect(() => {
        if (!data) {
            return;
        }

        if (wasArrived.current === false && data.arrived) {
            navigator.vibrate?.([200, 100, 200]);

            if (
                role === 'passenger' &&
                'Notification' in window &&
                Notification.permission === 'granted'
            ) {
                new Notification('Your driver has arrived', {
                    body: 'Your driver is at your pinned pick-up point.',
                });
            }
        }

        wasArrived.current = data.arrived;
    }, [data, role]);

    // The position that represents the DRIVER on the map.
    const driverPos: LatLng | null =
        role === 'driver' ? me : data?.driver ? data.driver : null;
    const target: Place | null = data
        ? data.arrived
            ? data.destination
            : data.pickup
        : null;
    const targetKey = data?.arrived ? 'destination' : 'pickup';

    // ---------- 4. road route: driver -> next stop (pick-up, then destination) ----------
    useEffect(() => {
        if (!driverPos || !target) {
            return;
        }

        const prev = lastRoute.current;
        const moved = prev ? distanceKm(prev.from, driverPos) : Infinity;

        if (
            prev &&
            prev.to === targetKey &&
            (Date.now() - prev.at < REROUTE_MS || moved < REROUTE_KM)
        ) {
            return;
        }

        lastRoute.current = { from: driverPos, to: targetKey, at: Date.now() };
        void routeBetween(driverPos, target).then((route) =>
            setLeg(route ? { to: targetKey, route } : null),
        );
    }, [driverPos?.lat, driverPos?.lng, target?.lat, target?.lng, targetKey]); // eslint-disable-line react-hooks/exhaustive-deps

    // pick-up -> destination, fetched once for the dashed line and the "total to destination" figure
    // Depend on the plain numbers, NOT the objects: the objects are re-created on every 5 s poll.
    const pLat = data?.pickup?.lat;
    const pLng = data?.pickup?.lng;
    const dLat = data?.destination?.lat;
    const dLng = data?.destination?.lng;
    useEffect(() => {
        if (
            pLat === undefined ||
            pLng === undefined ||
            dLat === undefined ||
            dLng === undefined
        ) {
            return;
        }

        void routeBetween(
            { lat: pLat, lng: pLng },
            { lat: dLat, lng: dLng },
        ).then(setFull);
    }, [pLat, pLng, dLat, dLng]);

    // ---------- 5. the map ----------
    useEffect(() => {
        if (!box.current || map.current) {
            return;
        }

        const m = L.map(box.current).setView([PH_CENTER.lat, PH_CENTER.lng], 8);
        L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 19,
            attribution:
                '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        }).addTo(m);
        map.current = m;
        setTimeout(() => m.invalidateSize(), 100);

        return () => {
            m.remove();
            map.current = null;
            layers.current = {};
            fitted.current = false;
        };
    }, []);

    useEffect(() => {
        const m = map.current;

        if (!m || !data) {
            return;
        }

        const put = (key: string, layer: L.Layer | null) => {
            layers.current[key]?.remove();
            layers.current[key] = layer ? layer.addTo(m) : undefined;
        };
        const marker = (
            p: LatLng | null,
            icon: L.DivIcon,
            tip: string,
        ): L.Layer | null =>
            p ? L.marker([p.lat, p.lng], { icon }).bindTooltip(tip) : null;

        put('pickup', marker(data.pickup, dot('#007f9e', 20, '📍'), 'Pick-up'));
        put(
            'dest',
            marker(data.destination, dot('#ff6f61', 20, '🏁'), 'Destination'),
        );
        put(
            'driver',
            marker(
                driverPos,
                dot('#062a35', 26, '🚗'),
                role === 'driver' ? 'You' : 'Your driver',
            ),
        );
        put(
            'passenger',
            role === 'driver'
                ? marker(data.passenger, dot('#aee8d8', 20, '🧍'), 'Passenger')
                : null,
        );
        put(
            'full',
            full
                ? L.polyline(full.coords, {
                      color: '#007f9e',
                      weight: 3,
                      dashArray: '6 8',
                      opacity: 0.7,
                  })
                : null,
        );
        put(
            'leg',
            leg && leg.to === targetKey
                ? L.polyline(leg.route.coords, { color: '#ff6f61', weight: 5 })
                : null,
        );

        // Fit once when the first useful points arrive; afterwards the user's own pan/zoom is respected.
        const pts = [data.pickup, data.destination, driverPos].filter(
            Boolean,
        ) as LatLng[];

        if (!fitted.current && pts.length) {
            m.fitBounds(L.latLngBounds(pts.map((p) => [p.lat, p.lng])), {
                padding: [40, 40],
                maxZoom: 15,
            });
            fitted.current = true;
        }
    }, [data, driverPos?.lat, driverPos?.lng, full, leg, role, targetKey]); // eslint-disable-line react-hooks/exhaustive-deps

    const recenter = () => {
        const pts = [data?.pickup, data?.destination, driverPos].filter(
            Boolean,
        ) as LatLng[];

        if (map.current && pts.length) {
            map.current.fitBounds(
                L.latLngBounds(pts.map((p) => [p.lat, p.lng])),
                { padding: [40, 40], maxZoom: 15 },
            );
        }
    };

    // ---------- numbers shown to both sides ----------
    const legNow = leg && leg.to === 'pickup' ? leg.route : null;
    const legDest = leg && leg.to === 'destination' ? leg.route : null;
    const toPickupKm = data?.arrived
        ? 0
        : (legNow?.km ?? data?.metrics.to_pickup_km ?? null);
    const toPickupMin = data?.arrived
        ? 0
        : (legNow?.min ?? data?.metrics.to_pickup_min ?? null);
    // total remaining = driver -> pick-up -> destination (or driver -> destination once picked up)
    const toDestKm = legDest
        ? legDest.km
        : legNow && full
          ? legNow.km + full.km
          : (data?.metrics.to_destination_km ?? null);
    const toDestMin = legDest
        ? legDest.min
        : legNow && full
          ? legNow.min + full.min
          : (data?.metrics.to_destination_min ?? null);

    const other = role === 'driver' ? data?.passenger : data?.driver;
    const live = !!other?.online;

    const markArrived = async () => {
        await api(`/bookings/${bookingId}/arrived`, 'POST');
        void load();
    };

    const navTarget = target ?? data?.destination;

    return (
        <section
            className="grid gap-4 rounded-2xl border bg-card p-5"
            aria-label="Live tracking"
        >
            <header className="flex flex-wrap items-center justify-between gap-3">
                <div>
                    <h2 className="flex items-center gap-2 font-serif text-xl">
                        <Radio className="size-5 text-coral-ink" /> Live
                        tracking
                    </h2>
                    <p className="text-xs text-muted-foreground">
                        {role === 'driver'
                            ? 'Share your location so your passenger can follow you to the pick-up.'
                            : 'Follow your driver to your pick-up. Share your location too so the driver can find you.'}
                    </p>
                </div>
                <Button
                    variant={sharing ? 'destructive' : 'default'}
                    onClick={() => void toggleSharing()}
                >
                    <LocateFixed />
                    {sharing ? 'Stop sharing' : 'Share my location'}
                </Button>
            </header>

            {data?.arrived && (
                <p
                    role="status"
                    className="flex items-center gap-2 rounded-xl border border-coral/40 bg-coral/10 p-4 text-sm font-medium"
                >
                    <BellRing className="size-5 text-coral-ink" />
                    {role === 'passenger'
                        ? 'Your driver has arrived at your pick-up point!'
                        : 'You have arrived at the pick-up point.'}
                </p>
            )}

            {error && (
                <p role="alert" className="text-sm text-destructive">
                    {error}
                </p>
            )}

            <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="rounded-xl border p-3">
                    <p className="text-xs text-muted-foreground">
                        {data?.arrived ? 'Pick-up' : 'To pick-up'}
                    </p>
                    <p className="text-lg font-semibold">
                        {data?.arrived ? 'Arrived' : fmtKm(toPickupKm)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                        {data?.arrived
                            ? 'Driver is at the pin'
                            : `ETA ${fmtMin(toPickupMin)}`}
                    </p>
                </div>
                <div className="rounded-xl border p-3">
                    <p className="text-xs text-muted-foreground">
                        To {data?.destination?.label ?? 'destination'}
                    </p>
                    <p className="text-lg font-semibold">{fmtKm(toDestKm)}</p>
                    <p className="text-xs text-muted-foreground">
                        ETA {fmtMin(toDestMin)}
                    </p>
                </div>
            </div>

            <p className="text-xs text-muted-foreground" aria-live="polite">
                {live
                    ? `${role === 'driver' ? 'Passenger' : 'Driver'} is live · updated ${other?.seconds_ago ?? 0}s ago`
                    : other
                      ? `${role === 'driver' ? 'Passenger' : 'Driver'} last seen ${Math.max(1, Math.round(other.seconds_ago / 60))} min ago`
                      : `Waiting for the ${role === 'driver' ? 'passenger' : 'driver'} to share their location…`}
                {data?.metrics.estimated &&
                    ' · Figures are estimates until the driver goes live.'}
            </p>

            <div
                ref={box}
                className="h-80 w-full rounded-xl border"
                role="application"
                aria-label="Live map"
            />

            <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" onClick={recenter}>
                    <LocateFixed /> Show everything
                </Button>
                {navTarget && (
                    <Button variant="outline" size="sm" asChild>
                        <a
                            href={`https://www.google.com/maps/dir/?api=1&destination=${navTarget.lat},${navTarget.lng}&travelmode=driving`}
                            target="_blank"
                            rel="noopener noreferrer"
                        >
                            <Navigation /> Open directions
                        </a>
                    </Button>
                )}
                {role === 'driver' && data && !data.arrived && (
                    <Button size="sm" onClick={() => void markArrived()}>
                        <Car /> I’ve arrived
                    </Button>
                )}
            </div>

            <p className="text-xs text-muted-foreground">
                Your position is shared only with the other person on this trip,
                only while sharing is ON, and is deleted when the trip ends.
            </p>
        </section>
    );
}
