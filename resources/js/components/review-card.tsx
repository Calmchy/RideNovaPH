// Shared layout for the admin review queues (Drivers, ID verification): a header bar with the status and the
// decision buttons, the facts and the person on the left, and the submitted photos on the right.
import { Link } from '@inertiajs/react';
import { useState } from 'react';
import type { ReactNode } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { useInitials } from '@/hooks/use-initials';

export type Fact = { label: string; value: ReactNode; mono?: boolean };
export type Person = {
    id: number;
    name: string;
    photo: string | null;
    rows: [string, string | null][];
};

/** A submitted photo; click to enlarge in a popup. Pass src=null for "not uploaded". */
export function ReviewPhoto({
    src,
    label,
    name,
}: {
    src: string | null;
    label: string;
    name: string;
}) {
    const [failed, setFailed] = useState(false);

    if (!src || failed) {
        return (
            <div className="grid aspect-[4/3] w-full place-items-center rounded-xl border border-dashed text-center text-xs text-muted-foreground">
                {label}: {src ? 'image unavailable' : 'not uploaded'}
            </div>
        );
    }

    return (
        <Dialog>
            <DialogTrigger asChild>
                <button
                    type="button"
                    aria-label={`Enlarge ${label} of ${name}`}
                    className="group relative block w-full cursor-zoom-in overflow-hidden rounded-xl border bg-muted/40 focus-visible:ring-2 focus-visible:ring-ocean focus-visible:outline-none"
                >
                    <img
                        src={src}
                        alt={`${label} of ${name}`}
                        loading="lazy"
                        onError={() => setFailed(true)}
                        className="aspect-[4/3] w-full object-cover transition group-hover:scale-105"
                    />
                    <span className="absolute inset-x-0 bottom-0 bg-black/55 px-2 py-0.5 text-left text-[11px] font-medium text-white">
                        {label}
                    </span>
                </button>
            </DialogTrigger>
            <DialogContent className="w-auto max-w-[94vw] p-3 sm:max-w-3xl">
                <DialogTitle className="text-sm">
                    {label} · {name}
                </DialogTitle>
                <DialogDescription className="sr-only">
                    Enlarged photo
                </DialogDescription>
                <img
                    src={src}
                    alt={`${label} of ${name}`}
                    className="max-h-[80vh] w-full rounded-lg object-contain"
                />
            </DialogContent>
        </Dialog>
    );
}

export default function ReviewCard({
    title,
    chips,
    actions,
    facts,
    person,
    note,
    children,
}: {
    title: ReactNode;
    chips?: ReactNode;
    actions?: ReactNode;
    facts: Fact[];
    person: Person;
    note?: ReactNode;
    /** the photos: they are laid out in a 2-column grid */
    children: ReactNode;
}) {
    const initials = useInitials();

    return (
        <li className="overflow-hidden rounded-2xl border bg-card shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b bg-muted/30 px-5 py-4">
                <div className="flex flex-wrap items-center gap-3">
                    <h2 className="font-serif text-xl">{title}</h2>
                    {chips}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    {actions}
                </div>
            </div>

            <div className="grid gap-5 p-5 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
                <div className="space-y-4">
                    <dl className="grid grid-cols-2 gap-3 text-sm">
                        {facts.map((f) => (
                            <div
                                key={f.label}
                                className="rounded-xl bg-muted/40 px-3 py-2"
                            >
                                <dt className="text-[11px] font-medium tracking-wider text-muted-foreground uppercase">
                                    {f.label}
                                </dt>
                                <dd
                                    className={`mt-0.5 font-medium break-words ${f.mono ? 'font-mono' : ''}`}
                                >
                                    {f.value}
                                </dd>
                            </div>
                        ))}
                    </dl>

                    <div className="rounded-xl border p-3 text-sm">
                        <div className="flex items-center gap-3">
                            <Avatar className="size-12">
                                {person.photo && (
                                    <AvatarImage
                                        src={person.photo}
                                        alt={person.name}
                                    />
                                )}
                                <AvatarFallback className="bg-ocean font-semibold text-white">
                                    {initials(person.name)}
                                </AvatarFallback>
                            </Avatar>
                            <div className="min-w-0 flex-1">
                                <p className="text-[11px] font-medium tracking-wider text-muted-foreground uppercase">
                                    Account holder
                                </p>
                                <p className="truncate font-medium">
                                    {person.name}
                                </p>
                            </div>
                            <Button asChild size="sm" variant="outline">
                                <Link href={`/admin/users/${person.id}`}>
                                    Full profile
                                </Link>
                            </Button>
                        </div>
                        <dl className="mt-3 grid gap-x-4 gap-y-2 sm:grid-cols-2">
                            {person.rows
                                .filter(([, v]) => v)
                                .map(([k, v]) => (
                                    <div key={k}>
                                        <dt className="text-xs text-muted-foreground">
                                            {k}
                                        </dt>
                                        <dd className="font-medium capitalize">
                                            {v}
                                        </dd>
                                    </div>
                                ))}
                        </dl>
                    </div>

                    {note}
                </div>

                <div className="grid grid-cols-2 content-start gap-3">
                    {children}
                </div>
            </div>
        </li>
    );
}
