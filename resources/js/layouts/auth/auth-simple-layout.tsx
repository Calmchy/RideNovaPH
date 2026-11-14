import { Link } from '@inertiajs/react';
import type { AuthLayoutProps } from '@/types';

/**
 * Login / register / reset layout. No photo: a soft gradient with a gold glow.
 * It follows the user's appearance setting (light / dark / system): every colour below is a
 * theme token or has an explicit `dark:` variant, so inputs, labels and links adapt too.
 */
export default function AuthSimpleLayout({ children, title, description }: AuthLayoutProps) {
    return (
        <div className="relative isolate flex min-h-svh flex-col items-center justify-center overflow-hidden bg-gradient-to-br from-sky-50 via-white to-amber-50 p-6 text-foreground md:p-10 dark:from-slate-950 dark:via-slate-900 dark:to-indigo-950">
            <div aria-hidden className="pointer-events-none absolute -top-40 left-1/2 -z-10 size-[640px] -translate-x-1/2 rounded-full bg-amber-300/30 blur-3xl dark:bg-amber-300/10" />

            <Link href="/" className="mb-8 font-serif text-3xl tracking-wide">
                RideNova<span className="text-amber-600 dark:text-amber-300">PH</span>
            </Link>

            <div className="w-full max-w-md rounded-3xl border border-amber-500/30 bg-white/80 p-8 shadow-xl backdrop-blur-md md:p-10 dark:border-amber-300/20 dark:bg-white/5 dark:shadow-2xl">
                <div className="mb-8 space-y-2 text-center">
                    <h1 className="font-serif text-3xl">{title}</h1>
                    <p className="text-sm text-muted-foreground">{description}</p>
                </div>
                {children}
            </div>

            <Link href="/rides" className="mt-8 text-sm text-muted-foreground transition hover:text-amber-600 dark:hover:text-amber-300">
                Just browsing? See available rides →
            </Link>
        </div>
    );
}