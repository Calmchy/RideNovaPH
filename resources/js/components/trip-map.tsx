// Interactive OpenStreetMap (Leaflet) for the booking form and the booking page.
//  - click the map to drop the ACTIVE pin (pick-up or return)
//  - drag a pin to fine-tune it
//  - "live" mode follows the device GPS with watchPosition (real-time position dot)
// Leaflet is driven imperatively inside effects; React only passes props in.
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useEffect, useRef } from 'react';
import { PH_CENTER } from '@/lib/geo';
import type { LatLng } from '@/lib/geo';

export type PinKind = 'pickup' | 'return';

type Props = {
    center?: LatLng | null;
    pickup?: LatLng | null;
    dropoff?: LatLng | null;
    /** which pin a map click sets; null = map is read-only */
    active?: PinKind | null;
    onPick?: (kind: PinKind, p: LatLng) => void;
    /** follow the device GPS in real time */
    live?: boolean;
    className?: string;
};

/** A round coloured dot instead of Leaflet's default image marker (those images break under bundlers). */
const dot = (color: string, size = 18) =>
    L.divIcon({
        className: '',
        iconSize: [size, size],
        iconAnchor: [size / 2, size / 2],
        html: `<span style="display:block;width:${size}px;height:${size}px;border-radius:9999px;background:${color};border:3px solid #fff;box-shadow:0 1px 6px rgba(6,42,53,.5)"></span>`,
    });

const COLORS = {
    pickup: 'var(--brand-ocean)',
    return: 'var(--brand-coral)',
    me: 'var(--brand-deep)',
};

export default function TripMap({
    center,
    pickup,
    dropoff,
    active,
    onPick,
    live,
    className,
}: Props) {
    const box = useRef<HTMLDivElement>(null);
    const map = useRef<L.Map | null>(null);
    const pins = useRef<{
        pickup?: L.Marker;
        return?: L.Marker;
        me?: L.Marker;
        line?: L.Polyline;
    }>({});
    // Latest callbacks/props in refs so map event handlers never go stale.
    const activeRef = useRef(active);
    const onPickRef = useRef(onPick);

    useEffect(() => {
        activeRef.current = active;
        onPickRef.current = onPick;
    });

    // Create the map once.
    useEffect(() => {
        if (!box.current || map.current) {
            return;
        }

        const c = center ?? pickup ?? PH_CENTER;
        const m = L.map(box.current, { zoomControl: true }).setView(
            [c.lat, c.lng],
            center || pickup ? 12 : 8,
        );

        L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 19,
            attribution:
                '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        }).addTo(m);

        m.on('click', (e: L.LeafletMouseEvent) => {
            if (activeRef.current && onPickRef.current) {
                onPickRef.current(activeRef.current, {
                    lat: e.latlng.lat,
                    lng: e.latlng.lng,
                });
            }
        });

        map.current = m;
        // The container may have been hidden while mounting (tabs/steps): re-measure once visible.
        setTimeout(() => m.invalidateSize(), 100);

        return () => {
            m.remove();
            map.current = null;
            pins.current = {};
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Keep the two pins + the connecting line in sync with props.
    useEffect(() => {
        const m = map.current;

        if (!m) {
            return;
        }

        const sync = (kind: PinKind, p?: LatLng | null) => {
            const existing = pins.current[kind];

            if (!p) {
                existing?.remove();
                pins.current[kind] = undefined;

                return;
            }

            if (existing) {
                existing.setLatLng([p.lat, p.lng]);
            } else {
                const mk = L.marker([p.lat, p.lng], {
                    icon: dot(COLORS[kind]),
                    draggable: !!onPickRef.current,
                })
                    .addTo(m)
                    .bindTooltip(kind === 'pickup' ? 'Pick-up' : 'Return');
                mk.on('dragend', () => {
                    const ll = mk.getLatLng();
                    onPickRef.current?.(kind, { lat: ll.lat, lng: ll.lng });
                });
                pins.current[kind] = mk;
            }
        };

        sync('pickup', pickup);
        sync('return', dropoff);

        pins.current.line?.remove();
        pins.current.line = undefined;

        if (pickup && dropoff) {
            pins.current.line = L.polyline(
                [
                    [pickup.lat, pickup.lng],
                    [dropoff.lat, dropoff.lng],
                ],
                { color: '#007f9e', weight: 3, dashArray: '6 8' },
            ).addTo(m);
            m.fitBounds(
                L.latLngBounds([
                    [pickup.lat, pickup.lng],
                    [dropoff.lat, dropoff.lng],
                ]),
                { padding: [40, 40], maxZoom: 14 },
            );
        } else if (pickup || dropoff) {
            const p = (pickup ?? dropoff) as LatLng;
            m.setView([p.lat, p.lng], Math.max(m.getZoom(), 13));
        }
    }, [pickup?.lat, pickup?.lng, dropoff?.lat, dropoff?.lng]); // eslint-disable-line react-hooks/exhaustive-deps

    // Real-time GPS: watchPosition keeps the "me" dot moving until live is switched off.
    useEffect(() => {
        const m = map.current;

        if (!live || !m || !('geolocation' in navigator)) {
            pins.current.me?.remove();
            pins.current.me = undefined;

            return;
        }

        const id = navigator.geolocation.watchPosition(
            (pos) => {
                const ll: L.LatLngTuple = [
                    pos.coords.latitude,
                    pos.coords.longitude,
                ];

                if (pins.current.me) {
                    pins.current.me.setLatLng(ll);
                } else {
                    pins.current.me = L.marker(ll, { icon: dot(COLORS.me, 16) })
                        .addTo(m)
                        .bindTooltip('You are here');
                    m.setView(ll, Math.max(m.getZoom(), 14));
                }
            },
            () => undefined,
            { enableHighAccuracy: true, maximumAge: 5000 },
        );

        return () => {
            navigator.geolocation.clearWatch(id);
            pins.current.me?.remove();
            pins.current.me = undefined;
        };
    }, [live]);

    return (
        <div
            ref={box}
            className={className ?? 'h-72 w-full rounded-xl'}
            role="application"
            aria-label="Map"
        />
    );
}
