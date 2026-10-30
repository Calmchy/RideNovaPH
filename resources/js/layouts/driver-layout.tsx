// Sub-navigation for every /driver/* page (sits under the normal app header).
import { Link } from '@inertiajs/react';
import type { ReactNode } from 'react';
import { useCurrentUrl } from '@/hooks/use-current-url';
import { cn } from '@/lib/utils';

const TABS = [
    { title: 'Overview', href: '/driver', exact: true },
    { title: 'My rides', href: '/driver/rides' },
    // The driver's own inbox: seat requests from passengers and group "hire a driver" requests.
    { title: 'Passenger requests', href: '/driver/requests' },
    { title: 'Hire requests', href: '/driver/hire' },
    { title: 'Vehicles', href: '/driver/vehicles' },
    { title: 'Rent my unit', href: '/driver/rentals' },
    { title: 'Licence', href: '/driver/apply' },
];

export default function DriverLayout({ children }: { children: ReactNode }) {
    const { currentUrl } = useCurrentUrl();

    return (
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 p-4 md:p-8">
            <nav
                className="flex gap-1 overflow-x-auto border-b"
                aria-label="Driver"
            >
                {TABS.map((t) => {
                    const active = t.exact
                        ? currentUrl === t.href
                        : currentUrl.startsWith(t.href);

                    return (
                        <Link
                            key={t.href}
                            href={t.href}
                            aria-current={active ? 'page' : undefined}
                            className={cn(
                                '-mb-px border-b-2 px-4 py-2 text-sm font-medium whitespace-nowrap',
                                active
                                    ? 'border-ocean text-ocean dark:border-foam dark:text-foam'
                                    : 'border-transparent text-muted-foreground hover:text-foreground',
                            )}
                        >
                            {t.title}
                        </Link>
                    );
                })}
            </nav>
            {children}
        </div>
    );
}
