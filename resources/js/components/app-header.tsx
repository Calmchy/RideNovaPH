import { Link, usePage } from '@inertiajs/react';
import {
    CalendarCheck,
    Car,
    Info,
    LayoutGrid,
    Menu,
    ReceiptText,
    ShieldCheck,
} from 'lucide-react';
import AppLogo from '@/components/app-logo';
import { Breadcrumbs } from '@/components/breadcrumbs';
import NotificationBell from '@/components/notification-bell';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from '@/components/ui/sheet';
import { UserMenuContent } from '@/components/user-menu-content';
import { useCurrentUrl } from '@/hooks/use-current-url';
import { useInitials } from '@/hooks/use-initials';
import { cn } from '@/lib/utils';
import type { BreadcrumbItem, NavItem } from '@/types';

type Props = { breadcrumbs?: BreadcrumbItem[] };

/**
 * Signed-in top navigation. Links depend on the role, but this is ONLY about what is shown:
 * the server (auth / driver / admin middleware) is what actually protects each area.
 */
export function AppHeader({ breadcrumbs = [] }: Props) {
    const { auth } = usePage().props;
    const getInitials = useInitials();
    const { isCurrentOrParentUrl } = useCurrentUrl();

    const items: NavItem[] = [
        { title: 'Dashboard', href: '/dashboard', icon: LayoutGrid },
        { title: 'Bookings', href: '/bookings', icon: CalendarCheck },
        { title: 'Transactions', href: '/transactions', icon: ReceiptText },
        ...(auth.isDriver
            ? [{ title: 'Driver', href: '/driver', icon: Car }]
            : []),
        { title: 'About', href: '/about', icon: Info },
        ...(auth.isAdmin
            ? [{ title: 'Admin', href: '/admin', icon: ShieldCheck }]
            : []),
    ];

    return (
        <>
            <div className="sticky top-0 z-40 border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80">
                <div className="mx-auto flex h-16 items-center gap-2 px-4 md:max-w-7xl">
                    {/* Mobile menu */}
                    <div className="lg:hidden">
                        <Sheet>
                            <SheetTrigger asChild>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    aria-label="Open menu"
                                >
                                    <Menu className="size-5" />
                                </Button>
                            </SheetTrigger>
                            <SheetContent
                                side="left"
                                className="w-64 bg-sidebar text-sidebar-foreground"
                            >
                                <SheetTitle className="sr-only">
                                    Navigation menu
                                </SheetTitle>
                                <SheetHeader>
                                    <AppLogo />
                                </SheetHeader>
                                <nav className="flex flex-col gap-1 p-4">
                                    {items.map((item) => (
                                        <Link
                                            key={item.title}
                                            href={item.href}
                                            className={cn(
                                                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium hover:bg-sidebar-accent',
                                                isCurrentOrParentUrl(
                                                    item.href,
                                                ) &&
                                                    'bg-sidebar-accent text-white',
                                            )}
                                        >
                                            {item.icon && (
                                                <item.icon className="size-4" />
                                            )}
                                            {item.title}
                                        </Link>
                                    ))}
                                </nav>
                            </SheetContent>
                        </Sheet>
                    </div>

                    <Link
                        href="/dashboard"
                        prefetch
                        className="flex items-center gap-2"
                    >
                        <AppLogo />
                    </Link>

                    {/* Desktop navigation */}
                    <nav
                        className="ml-6 hidden items-center gap-1 lg:flex"
                        aria-label="Main"
                    >
                        {items.map((item) => {
                            const active = isCurrentOrParentUrl(item.href);

                            return (
                                <Link
                                    key={item.title}
                                    href={item.href}
                                    prefetch
                                    aria-current={active ? 'page' : undefined}
                                    className={cn(
                                        'flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition',
                                        active
                                            ? 'bg-ocean/10 text-ocean dark:bg-foam/15 dark:text-foam'
                                            : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                                    )}
                                >
                                    {item.icon && (
                                        <item.icon className="size-4" />
                                    )}
                                    {item.title}
                                </Link>
                            );
                        })}
                    </nav>

                    <div className="ml-auto flex items-center gap-1">
                        <NotificationBell />
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button
                                    variant="ghost"
                                    className="size-10 rounded-full p-1"
                                    aria-label="Account menu"
                                >
                                    <Avatar className="size-8 overflow-hidden rounded-full">
                                        <AvatarImage
                                            src={auth.user?.avatar}
                                            alt={auth.user?.name}
                                        />
                                        <AvatarFallback className="rounded-lg bg-deep text-sand">
                                            {getInitials(auth.user?.name ?? '')}
                                        </AvatarFallback>
                                    </Avatar>
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent className="w-56" align="end">
                                {auth.user && (
                                    <UserMenuContent user={auth.user} />
                                )}
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </div>
            </div>
            {breadcrumbs.length > 1 && (
                <div className="flex w-full border-b">
                    <div className="mx-auto flex h-12 w-full items-center px-4 text-muted-foreground md:max-w-7xl">
                        <Breadcrumbs breadcrumbs={breadcrumbs} />
                    </div>
                </div>
            )}
        </>
    );
}
