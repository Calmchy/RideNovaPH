import { Link, usePage } from '@inertiajs/react';

/**
 * Header for the PUBLIC pages (landing + ride details). It works for guests too:
 * the signed-in app header assumes a user exists, so these pages don't use it.
 * One "Bookings" entry only (find rides + my bookings live inside it).
 */
export default function SiteHeader({ solid = false }: { solid?: boolean }) {
    const { auth } = usePage().props;
    const link =
        'rounded-full px-2.5 py-2 text-sm whitespace-nowrap text-white/85 transition hover:bg-white/10 hover:text-white sm:px-4';

    return (
        <header className={solid ? 'bg-deep' : 'absolute inset-x-0 top-0 z-30'}>
            <div className="mx-auto flex max-w-7xl items-center justify-between gap-2 px-4 py-4 sm:px-5 sm:py-5">
                <Link
                    href="/"
                    className="shrink-0 font-serif text-xl tracking-wide text-white sm:text-2xl"
                >
                    RideNova<span className="text-sand">PH</span>
                </Link>
                <nav className="flex items-center gap-0.5 sm:gap-1" aria-label="Main">
                    <Link href="/bookings" className={link}>
                        Bookings
                    </Link>
                    {auth.user ? (
                        <Link
                            href="/dashboard"
                            className="rounded-full bg-coral px-4 py-2 text-sm font-semibold whitespace-nowrap text-deep transition hover:brightness-110 sm:px-5"
                        >
                            Dashboard
                        </Link>
                    ) : (
                        <>
                            <Link href="/login" className={link}>
                                Log in
                            </Link>
                            <Link
                                href="/register"
                                className="rounded-full bg-coral px-4 py-2 text-sm font-semibold whitespace-nowrap text-deep transition hover:brightness-110 sm:px-5"
                            >
                                Register
                            </Link>
                        </>
                    )}
                </nav>
            </div>
        </header>
    );
}