import { Link, usePage } from '@inertiajs/react';

/**
 * Header for the PUBLIC pages (landing + ride details). It works for guests too:
 * the signed-in app header assumes a user exists, so these pages don't use it.
 * One "Bookings" entry only (find rides + my bookings live inside it).
 */
export default function SiteHeader({ solid = false }: { solid?: boolean }) {
    const { auth } = usePage().props;
    const link =
        'rounded-full px-4 py-2 text-sm text-white/85 transition hover:bg-white/10 hover:text-white';

    return (
        <header className={solid ? 'bg-deep' : 'absolute inset-x-0 top-0 z-30'}>
            <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-5">
                <Link
                    href="/"
                    className="font-serif text-2xl tracking-wide text-white"
                >
                    RideNova<span className="text-sand">PH</span>
                </Link>
                <nav className="flex items-center gap-1" aria-label="Main">
                    <Link href="/bookings" className={link}>
                        Bookings
                    </Link>
                    {auth.user ? (
                        <Link
                            href="/dashboard"
                            className="rounded-full bg-coral px-5 py-2 text-sm font-semibold text-deep transition hover:brightness-110"
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
                                className="rounded-full bg-coral px-5 py-2 text-sm font-semibold text-deep transition hover:brightness-110"
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
