import { Link } from '@inertiajs/react';
import type { AuthLayoutProps } from '@/types';

/**
 * Login / register / reset layout. No photo: a deep navy gradient with a soft gold glow.
 * The wrapper carries the `dark` class so every shadcn input and button inside renders
 * with its dark-theme colours regardless of the user's appearance setting.
 */
export default function AuthSimpleLayout({ children, title, description }: AuthLayoutProps) {
    return (
        <div className="dark relative isolate flex min-h-svh flex-col items-center justify-center overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 p-6 text-white md:p-10">
            <div aria-hidden className="pointer-events-none absolute -top-40 left-1/2 -z-10 size-[640px] -translate-x-1/2 rounded-full bg-amber-300/10 blur-3xl" />

            <Link href="/" className="mb-8 font-serif text-3xl tracking-wide">
                RideNova<span className="text-amber-300">PH</span>
            </Link>

            <div className="w-full max-w-md rounded-3xl border border-amber-300/20 bg-white/5 p-8 shadow-2xl backdrop-blur-md md:p-10">
                <div className="mb-8 space-y-2 text-center">
                    <h1 className="font-serif text-3xl">{title}</h1>
                    <p className="text-sm text-white/60">{description}</p>
                </div>
                {children}
            </div>

            <Link href="/rides" className="mt-8 text-sm text-white/50 transition hover:text-amber-300">
                Just browsing? See available rides →
            </Link>
        </div>
    );
}
