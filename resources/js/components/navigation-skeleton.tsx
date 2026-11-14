// Skeleton loading screen shown while the next page is being fetched (Inertia navigation).
//
//  - Only for real page changes: GET visits to another path. Filters/search (same path), background
//    polls, partial reloads and prefetches never trigger it, so lists don't flicker while you type.
//  - Waits SHOW_AFTER_MS first, so fast pages just appear without a flash.
//  - Shape follows where you are going: table pages (admin, driver, transactions), detail pages
//    (a ride, a booking, a driver profile) or card grids (everything else).
//  - Uses the shared <Skeleton> (pulse is switched off for users who prefer reduced motion).
import { router } from '@inertiajs/react';
import { useEffect, useState } from 'react';
import { Skeleton } from '@/components/ui/skeleton';

const SHOW_AFTER_MS = 150;
type Shape = 'cards' | 'table' | 'detail';

function shapeFor(path: string): Shape {
    if (/^\/(admin|driver|transactions|messages)(\/|$)/.test(path)) {
        return /^\/driver\/rides\/\d+/.test(path) ? 'detail' : 'table';
    }

    if (/^\/(rides|bookings|rentals|drivers|charters)\/\d+/.test(path)) {
        return 'detail';
    }

    return 'cards';
}

const S = ({ className }: { className?: string }) => (
    <Skeleton className={`motion-reduce:animate-none ${className ?? ''}`} />
);

function CardsShape() {
    return (
        <>
            <div className="flex flex-wrap items-end gap-3 rounded-2xl border bg-card p-4">
                {[0, 1, 2, 3].map((i) => (
                    <div key={i} className="grid min-w-36 flex-1 gap-2">
                        <S className="h-3 w-16" />
                        <S className="h-10 w-full" />
                    </div>
                ))}
            </div>
            <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
                {[0, 1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className="space-y-4 rounded-2xl border bg-card p-5">
                        <div className="flex items-start justify-between gap-3">
                            <S className="h-6 w-2/3" />
                            <S className="h-7 w-20 rounded-full" />
                        </div>
                        <S className="h-4 w-1/2" />
                        <S className="h-4 w-3/5" />
                        <S className="h-4 w-2/5" />
                        <div className="flex items-center gap-3 rounded-xl border p-3">
                            <S className="size-11 rounded-full" />
                            <div className="flex-1 space-y-2">
                                <S className="h-4 w-1/2" />
                                <S className="h-3 w-2/3" />
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <S className="h-9 flex-1" />
                            <S className="h-9 flex-1" />
                        </div>
                    </div>
                ))}
            </div>
        </>
    );
}

function TableShape() {
    return (
        <>
            <div className="flex flex-wrap items-end gap-3 rounded-2xl border bg-card p-4">
                <S className="h-10 min-w-56 flex-1" />
                <S className="h-10 w-40" />
            </div>
            <div className="overflow-hidden rounded-2xl border bg-card">
                <div className="flex gap-6 border-b bg-muted/50 px-4 py-3">
                    {[0, 1, 2, 3, 4].map((i) => (
                        <S key={i} className="h-3 w-20" />
                    ))}
                </div>
                {[0, 1, 2, 3, 4, 5, 6].map((i) => (
                    <div key={i} className="flex items-center gap-6 border-b px-4 py-4 last:border-b-0">
                        <S className="h-4 w-1/4" />
                        <S className="h-4 w-1/5" />
                        <S className="h-4 w-1/6" />
                        <S className="h-6 w-20 rounded-full" />
                        <S className="ml-auto h-8 w-20" />
                    </div>
                ))}
            </div>
        </>
    );
}

function DetailShape() {
    return (
        <div className="grid gap-8 md:grid-cols-[1fr_340px]">
            <div className="space-y-6">
                <S className="h-12 w-3/4" />
                <div className="grid grid-cols-2 gap-5 rounded-2xl border bg-card p-6">
                    {[0, 1, 2, 3, 4, 5].map((i) => (
                        <div key={i} className="space-y-2">
                            <S className="h-3 w-20" />
                            <S className="h-5 w-3/4" />
                        </div>
                    ))}
                </div>
                <div className="space-y-3 rounded-2xl border bg-card p-6">
                    <S className="h-6 w-1/3" />
                    <S className="h-4 w-full" />
                    <S className="h-4 w-5/6" />
                    <S className="h-4 w-2/3" />
                </div>
            </div>
            <div className="h-fit space-y-4 rounded-3xl border bg-card p-6">
                <S className="h-10 w-1/2" />
                <S className="h-4 w-2/3" />
                <S className="h-12 w-full" />
            </div>
        </div>
    );
}

export default function NavigationSkeleton() {
    const [shape, setShape] = useState<Shape | null>(null);

    useEffect(() => {
        let timer: ReturnType<typeof setTimeout> | undefined;

        const offStart = router.on('start', (event) => {
            const v = event.detail.visit;
            const toOtherPage =
                v.method === 'get' &&
                !v.async &&
                !v.prefetch &&
                v.only.length === 0 &&
                v.url.pathname !== window.location.pathname;

            clearTimeout(timer);

            if (toOtherPage) {
                const next = shapeFor(v.url.pathname);
                timer = setTimeout(() => setShape(next), SHOW_AFTER_MS);
            }
        });
        const offFinish = router.on('finish', () => {
            clearTimeout(timer);
            setShape(null);
        });

        return () => {
            clearTimeout(timer);
            offStart();
            offFinish();
        };
    }, []);

    if (!shape) {
        return null;
    }

    return (
        <div
            role="status"
            aria-busy="true"
            aria-live="polite"
            className="fixed inset-0 z-[60] overflow-y-auto bg-background"
        >
            <span className="sr-only">Loading…</span>
            {/* The site header, as blocks */}
            <div className="border-b bg-deep">
                <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4">
                    <Skeleton className="h-7 w-36 bg-white/15 motion-reduce:animate-none" />
                    <div className="flex items-center gap-3">
                        <Skeleton className="hidden h-8 w-20 rounded-full bg-white/15 sm:block motion-reduce:animate-none" />
                        <Skeleton className="hidden h-8 w-20 rounded-full bg-white/15 sm:block motion-reduce:animate-none" />
                        <Skeleton className="size-9 rounded-full bg-white/15 motion-reduce:animate-none" />
                    </div>
                </div>
            </div>
            <div className="mx-auto max-w-7xl space-y-6 px-5 py-10">
                {shape !== 'detail' && (
                    <div className="space-y-3">
                        <S className="h-10 w-64" />
                        <S className="h-4 w-96 max-w-full" />
                    </div>
                )}
                {shape === 'cards' && <CardsShape />}
                {shape === 'table' && <TableShape />}
                {shape === 'detail' && <DetailShape />}
            </div>
        </div>
    );
}
