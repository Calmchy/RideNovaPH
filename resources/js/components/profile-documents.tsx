// Profile page extras: the user's own profile picture, and their uploaded documents
// (driver licence front/back, vehicle COR, Gov ID). Everything shown here belongs to the signed-in user:
// the server only ever serves/edits the logged-in account's files.
import { Link, router, usePage } from '@inertiajs/react';
import {
    BadgeCheck,
    Camera,
    Clock,
    Loader2,
    ShieldAlert,
    Trash2,
    XCircle,
} from 'lucide-react';
import { useRef, useState } from 'react';
import DocReplaceDialog from '@/components/doc-replace-dialog';
import DocTile from '@/components/doc-tile';
import { Panel } from '@/components/kit';
import { StatusBadge } from '@/components/lux';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { useInitials } from '@/hooks/use-initials';
import type { Auth } from '@/types';

export type ProfileDocuments = {
    id: {
        type: string;
        status: string;
        front: string;
        back: string | null;
    } | null;
    licence: {
        status: string;
        expiry: string;
        front: string | null;
        back: string | null;
    } | null;
    vehicles: {
        id: number;
        name: string;
        plate_number: string;
        cor_url: string | null;
    }[];
};

const MAX_BYTES = 3 * 1024 * 1024;
const TYPES = ['image/jpeg', 'image/png', 'image/webp'];
// Licence and Gov ID photos are JPG/PNG only (4 MB), same as the first upload.
const ID_TYPES = ['image/jpeg', 'image/png'];

type VerifyStatus = 'approved' | 'pending' | 'rejected' | null;

const BADGE: Record<
    'approved' | 'pending' | 'rejected' | 'none',
    { text: string; icon: typeof BadgeCheck; cls: string }
> = {
    approved: {
        text: 'Verified',
        icon: BadgeCheck,
        cls: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
    },
    pending: {
        text: 'Pending review',
        icon: Clock,
        cls: 'border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300',
    },
    rejected: {
        text: 'Rejected',
        icon: XCircle,
        cls: 'border-destructive/40 bg-destructive/10 text-destructive',
    },
    none: {
        text: 'Not submitted',
        icon: ShieldAlert,
        cls: 'border-border bg-muted text-muted-foreground',
    },
};

/** Small pill: "Gov ID · Verified". */
function VerifyBadge({ label, status }: { label: string; status: VerifyStatus }) {
    const b = BADGE[status ?? 'none'];
    const Icon = b.icon;

    return (
        <span
            className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium whitespace-nowrap ${b.cls}`}
        >
            <Icon className="size-3.5" aria-hidden />
            {label} · {b.text}
        </span>
    );
}

export function ProfilePhotoPanel({
    idStatus,
    driverStatus,
    isDriver,
}: {
    idStatus: VerifyStatus;
    driverStatus: VerifyStatus;
    isDriver: boolean;
}) {
    const { auth } = usePage<{ auth: Auth }>().props;
    const getInitials = useInitials();
    const fileRef = useRef<HTMLInputElement>(null);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const pick = (file: File | undefined) => {
        if (!file) {
            return;
        }

        if (!TYPES.includes(file.type)) {
            setError('Use a JPG, PNG or WEBP photo.');

            return;
        }

        if (file.size > MAX_BYTES) {
            setError('That photo is over 3 MB. Choose a smaller one.');

            return;
        }

        setError(null);
        router.post(
            '/settings/profile/photo',
            { photo: file },
            {
                forceFormData: true,
                preserveScroll: true,
                onStart: () => setBusy(true),
                onFinish: () => {
                    setBusy(false);

                    if (fileRef.current) {
                        fileRef.current.value = '';
                    }
                },
                onError: (errors) =>
                    setError(errors.photo ?? 'Could not upload that photo.'),
            },
        );
    };

    return (
        <Panel title="Profile picture">
            <div className="flex flex-wrap items-center gap-5 p-5">
                <Avatar className="size-24 overflow-hidden rounded-full border">
                    <AvatarImage
                        src={auth.user.avatar ?? undefined}
                        alt={auth.user.name}
                    />
                    <AvatarFallback className="bg-neutral-200 text-2xl text-black dark:bg-neutral-700 dark:text-white">
                        {getInitials(auth.user.name)}
                    </AvatarFallback>
                </Avatar>
                <div className="space-y-3">
                    <div>
                        <p className="text-lg font-semibold">
                            {auth.user.name}
                        </p>
                        {/* Verification badges, right beside the picture */}
                        <div className="mt-2 flex flex-wrap gap-2">
                            <VerifyBadge label="Gov ID" status={idStatus} />
                            {isDriver && (
                                <VerifyBadge
                                    label="Driver’s licence"
                                    status={driverStatus}
                                />
                            )}
                        </div>
                    </div>
                    <p className="text-xs text-muted-foreground">
                        Only you can change your picture. JPG, PNG or WEBP, up
                        to 3 MB.
                    </p>
                    <input
                        ref={fileRef}
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        className="sr-only"
                        tabIndex={-1}
                        aria-hidden
                        onChange={(e) => pick(e.target.files?.[0])}
                    />
                    <div className="flex flex-wrap gap-2">
                        <Button
                            type="button"
                            size="sm"
                            disabled={busy}
                            onClick={() => fileRef.current?.click()}
                        >
                            {busy ? (
                                <Loader2 className="animate-spin" />
                            ) : (
                                <Camera />
                            )}
                            {auth.user.avatar ? 'Change photo' : 'Upload photo'}
                        </Button>
                        {auth.user.avatar && (
                            <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                disabled={busy}
                                onClick={() =>
                                    router.delete('/settings/profile/photo', {
                                        preserveScroll: true,
                                    })
                                }
                            >
                                <Trash2 /> Remove
                            </Button>
                        )}
                    </div>
                    {error && (
                        <p role="alert" className="text-xs text-destructive">
                            {error}
                        </p>
                    )}
                </div>
            </div>
        </Panel>
    );
}

function Section({
    title,
    status,
    note,
    action,
    extra,
    children,
}: {
    title: string;
    status?: string | null;
    note?: string;
    action?: { href: string; label: string };
    /** e.g. the single "Replace photos" button */
    extra?: React.ReactNode;
    children: React.ReactNode;
}) {
    return (
        <section className="space-y-3 p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                    <h3 className="flex items-center gap-2 text-sm font-semibold">
                        {title} {status && <StatusBadge status={status} />}
                    </h3>
                    {note && (
                        <p className="text-xs text-muted-foreground">{note}</p>
                    )}
                </div>
                {extra}
                {action && (
                    <Button asChild size="sm" variant="ghost">
                        <Link href={action.href}>{action.label}</Link>
                    </Button>
                )}
            </div>
            <div className="grid gap-4 sm:grid-cols-2">{children}</div>
        </section>
    );
}

/** Approved documents go back to review when a photo changes, so warn first. Pending ones just get the new photo. */
function replaceWarning(status: string, what: string): string | undefined {
    return status === 'approved'
        ? `Replacing this photo sends your ${what} back to review. ${
              what === 'ID'
                  ? 'You may not be able to book rides'
                  : 'You will not be able to publish new rides'
          } until an admin approves it again. Continue?`
        : undefined;
}

export function DocumentsPanel({
    documents,
    isDriver,
}: {
    documents: ProfileDocuments;
    isDriver: boolean;
}) {
    const { licence, vehicles, id } = documents;

    return (
        <Panel title="My documents">
            <div className="divide-y">
                {isDriver && (
                    <Section
                        title="Driver’s licence"
                        status={licence?.status}
                        note={
                            licence
                                ? `Expires ${licence.expiry}`
                                : 'Not submitted yet'
                        }
                        extra={
                            licence && licence.status !== 'rejected' ? (
                                <DocReplaceDialog
                                    title="Driver’s licence"
                                    url="/driver/license/photos"
                                    current={{
                                        front: licence.front,
                                        back: licence.back,
                                    }}
                                    types={ID_TYPES}
                                    maxMb={4}
                                    warning={replaceWarning(
                                        licence.status,
                                        'licence',
                                    )}
                                />
                            ) : undefined
                        }
                        action={
                            !licence || licence.status === 'rejected'
                                ? {
                                      href: '/driver/apply',
                                      label: licence
                                          ? 'Resubmit licence'
                                          : 'Submit licence',
                                  }
                                : undefined
                        }
                    >
                        <DocTile label="Front" url={licence?.front ?? null} />
                        <DocTile label="Back" url={licence?.back ?? null} />
                    </Section>
                )}

                {isDriver && (
                    <Section
                        title="Vehicle COR (Certificate of Registration)"
                        note={
                            vehicles.length
                                ? 'One per registered vehicle.'
                                : 'Register a vehicle to add its COR.'
                        }
                        action={
                            vehicles.length
                                ? undefined
                                : {
                                      href: '/driver/vehicles',
                                      label: 'Register a vehicle',
                                  }
                        }
                    >
                        {vehicles.map((v) => (
                            <DocTile
                                key={v.id}
                                label={`${v.name} · ${v.plate_number}`}
                                url={v.cor_url}
                                upload={{
                                    url: `/driver/vehicles/${v.id}/cor`,
                                    field: 'cor_image',
                                    label: v.cor_url
                                        ? 'Replace COR'
                                        : 'Upload COR',
                                }}
                            />
                        ))}
                    </Section>
                )}

                <Section
                    title="Government ID"
                    status={id?.status}
                    note={id?.type ?? 'Not submitted yet'}
                    extra={
                        id && id.status !== 'rejected' ? (
                            <DocReplaceDialog
                                title="Gov ID"
                                url="/identity/photos"
                                current={{ front: id.front, back: id.back }}
                                types={ID_TYPES}
                                maxMb={4}
                                warning={replaceWarning(id.status, 'ID')}
                            />
                        ) : undefined
                    }
                    action={
                        !id || id.status === 'rejected'
                            ? {
                                  href: '/identity',
                                  label: id ? 'Resubmit ID' : 'Verify ID',
                              }
                            : undefined
                    }
                >
                    <DocTile label="Front" url={id?.front ?? null} />
                    <DocTile
                        label="Back"
                        url={id?.back ?? null}
                        emptyText={id ? 'No back photo submitted' : undefined}
                    />
                </Section>
            </div>
        </Panel>
    );
}
