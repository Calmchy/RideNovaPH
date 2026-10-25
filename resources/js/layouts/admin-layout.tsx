// Admin shell: a dark left menu (like the Grand Taxi style), a slim top bar, and the page on the right.
// All links are plain Inertia links to server-protected routes: a non-admin gets a 403 from the server.
import { Link, usePage } from '@inertiajs/react';
import {
    BadgeCheck,
    BarChart3,
    CalendarCheck,
    Car,
    ExternalLink,
    Images,
    LayoutDashboard,
    Menu,
    ReceiptText,
    Route as RouteIcon,
    Settings,
    Users,
} from 'lucide-react';
import { useState } from 'react';
import type { ReactNode } from 'react';
import AppLogo from '@/components/app-logo';
import NotificationBell from '@/components/notification-bell';
import { useCurrentUrl } from '@/hooks/use-current-url';
import { cn } from '@/lib/utils';

const NAV = [
    { title: 'Overview', href: '/admin', icon: LayoutDashboard, exact: true },
    { title: 'Users', href: '/admin/users', icon: Users },
    { title: 'Drivers', href: '/admin/drivers', icon: Car },
    { title: 'ID verification', href: '/admin/identity', icon: BadgeCheck },
    { title: 'Rides', href: '/admin/rides', icon: RouteIcon },
    { title: 'Bookings', href: '/admin/bookings', icon: CalendarCheck },
    { title: 'Transactions', href: '/admin/transactions', icon: ReceiptText },
    { title: 'Reports', href: '/admin/reports', icon: BarChart3 },
    { title: 'Content', href: '/admin/content', icon: Images },
    { title: 'Settings', href: '/admin/settings', icon: Settings },
];

export default function AdminLayout({ children }: { children: ReactNode }) {
    const { auth } = usePage().props;
    const { currentUrl } = useCurrentUrl();
    const [open, setOpen] = useState(false);

    return (
        <div className="min-h-screen bg-background lg:grid lg:grid-cols-[16rem_minmax(0,1fr)]">
            <aside
                className={cn(
                    'fixed inset-y-0 left-0 z-40 w-64 -translate-x-full overflow-y-auto bg-sidebar p-4 text-sidebar-foreground transition-transform lg:sticky lg:top-0 lg:h-screen lg:translate-x-0 lg:self-start',
                    open && 'translate-x-0',
                )}
            >
                <Link
                    href="/admin"
                    className="mb-6 flex items-center gap-2 px-2 text-white"
                >
                    <AppLogo />
                </Link>
                <p className="mb-2 px-3 text-[11px] tracking-widest text-sidebar-foreground/60 uppercase">
                    Administration
                </p>
                <nav className="flex flex-col gap-1" aria-label="Admin">
                    {NAV.map((n) => {
                        const active = n.exact
                            ? currentUrl === n.href
                            : currentUrl.startsWith(n.href);

                        return (
                            <Link
                                key={n.href}
                                href={n.href}
                                prefetch
                                onClick={() => setOpen(false)}
                                aria-current={active ? 'page' : undefined}
                                className={cn(
                                    'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition hover:bg-sidebar-accent hover:text-white',
                                    active &&
                                        'bg-sidebar-accent text-white shadow-inner',
                                )}
                            >
                                <n.icon
                                    className={cn(
                                        'size-4',
                                        active && 'text-sand',
                                    )}
                                />
                                {n.title}
                            </Link>
                        );
                    })}
                </nav>
                <Link
                    href="/dashboard"
                    className="mt-6 flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-white"
                >
                    <ExternalLink className="size-4" /> Back to the site
                </Link>
            </aside>
            {open && (
                <button
                    aria-label="Close menu"
                    onClick={() => setOpen(false)}
                    className="fixed inset-0 z-30 bg-deep/60 lg:hidden"
                />
            )}

            <div className="min-w-0">
                <div className="sticky top-0 z-20 flex h-14 items-center justify-between border-b bg-card/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-card/80">
                    <button
                        onClick={() => setOpen(true)}
                        aria-label="Open menu"
                        className="rounded-lg p-2 hover:bg-muted lg:hidden"
                    >
                        <Menu className="size-5" />
                    </button>
                    <p className="hidden text-sm text-muted-foreground lg:block">
                        Signed in as{' '}
                        <span className="font-medium text-foreground">
                            {auth.user?.name}
                        </span>
                    </p>
                    <NotificationBell />
                </div>
                <main className="mx-auto flex max-w-6xl flex-col gap-6 p-4 md:p-8">
                    {children}
                </main>
            </div>
        </div>
    );
}
