// The tab row shared by the Bookings area. The charter pages (/charters) reuse it so
// "Hire a driver" looks like one more tab of Bookings.
import { Link } from '@inertiajs/react';
import { cn } from '@/lib/utils';

export default function BookingsTabs({
    active,
    isDriver,
}: {
    active: 'hire' | 'reviews';
    isDriver: boolean;
}) {
    const tabs = [
        { id: 'find', label: 'Find a ride', href: '/bookings?tab=find' },
        { id: 'mine', label: 'My bookings', href: '/bookings?tab=mine' },
        ...(isDriver
            ? [
                  {
                      id: 'requests',
                      label: 'Requests',
                      href: '/bookings?tab=requests',
                  },
              ]
            : []),
        { id: 'hire', label: 'Hire a driver', href: '/charters' },
        { id: 'reviews', label: 'Review history', href: '/reviews' },
    ];

    return (
        <nav className="flex gap-1 border-b" aria-label="Bookings sections">
            {tabs.map((t) => (
                <Link
                    key={t.id}
                    href={t.href}
                    aria-current={active === t.id ? 'page' : undefined}
                    className={cn(
                        '-mb-px flex items-center gap-2 border-b-2 px-4 py-2 text-sm font-medium',
                        active === t.id
                            ? 'border-ocean text-ocean dark:border-foam dark:text-foam'
                            : 'border-transparent text-muted-foreground hover:text-foreground',
                    )}
                >
                    {t.label}
                </Link>
            ))}
        </nav>
    );
}
