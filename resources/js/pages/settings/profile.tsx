// Profile: verification status, editable personal info, and role-specific settings.
// Saves with PATCH /settings/profile. The server only accepts whitelisted fields (never role or status).
import { Head, Link, useForm, usePage } from '@inertiajs/react';
import { BadgeCheck, Car, MailWarning } from 'lucide-react';
import { useState } from 'react';
import type { ReactNode } from 'react';
import DeleteUser from '@/components/delete-user';
import Heading from '@/components/heading';
import IdVerification from '@/components/id-verification';
import type { IdHistoryItem } from '@/components/id-verification';
import InputError from '@/components/input-error';
import { inputCls, Panel } from '@/components/kit';
import { fmtDate, StatusBadge } from '@/components/lux';
import { Button } from '@/components/ui/button';
import type { Auth } from '@/types';
import { edit } from '@/routes/profile';
import { send } from '@/routes/verification';

type Props = {
    mustVerifyEmail: boolean;
    status?: string;
    profile: {
        phone_number: string | null;
        address: string | null;
        emergency_contact_name: string | null;
        emergency_contact_phone: string | null;
        role: string;
        member_since: string;
    };
    verification: {
        id_status: 'pending' | 'approved' | 'rejected' | null;
        id_remarks: string | null;
        driver_status: 'pending' | 'approved' | 'rejected' | null;
        driver_remarks: string | null;
        has_driver_profile: boolean;
    };
    driver: { bio: string | null; allows_luggage: boolean } | null;
    id_types: { id: number; name: string }[];
    id_history: IdHistoryItem[];
};

function VerifyRow({
    icon: Icon,
    title,
    status,
    remarks,
    href,
    cta,
    onToggle,
    children,
}: {
    icon: typeof BadgeCheck;
    title: string;
    status: string | null;
    remarks: string | null;
    href?: string;
    cta: string;
    // When given, the button opens/closes `children` right here instead of going to another page.
    onToggle?: () => void;
    children?: ReactNode;
}) {
    const variant =
        status === 'approved' || status === 'pending'
            ? 'ghost'
            : status === 'rejected'
              ? 'destructive'
              : 'default';

    return (
        <div className="flex flex-wrap items-center justify-between gap-3 py-3">
            <div className="flex items-start gap-3">
                <Icon className="mt-0.5 size-5 text-ocean dark:text-foam" />
                <div>
                    <p className="text-sm font-medium">{title}</p>
                    {remarks && (
                        <p className="text-xs text-destructive">
                            Reason: {remarks}
                        </p>
                    )}
                </div>
            </div>
            <div className="flex items-center gap-3">
                {status ? (
                    <StatusBadge status={status} />
                ) : (
                    <span className="text-xs text-muted-foreground">
                        Not submitted
                    </span>
                )}
                {onToggle ? (
                    <Button
                        type="button"
                        size="sm"
                        variant={variant}
                        onClick={onToggle}
                    >
                        {cta}
                    </Button>
                ) : (
                    <Button asChild size="sm" variant={variant}>
                        <Link href={href ?? '#'}>{cta}</Link>
                    </Button>
                )}
            </div>
            {children && <div className="w-full">{children}</div>}
        </div>
    );
}

export default function Profile({
    mustVerifyEmail,
    status,
    profile,
    verification,
    driver,
    id_types,
    id_history,
}: Props) {
    const { auth } = usePage<{ auth: Auth }>().props;
    // The ID form opens by itself when action is needed (never submitted, or rejected).
    const idNeedsAction =
        verification.id_status === null || verification.id_status === 'rejected';
    const [idOpen, setIdOpen] = useState(idNeedsAction);
    const form = useForm({
        name: auth.user.name,
        email: auth.user.email,
        phone_number: profile.phone_number ?? '',
        address: profile.address ?? '',
        emergency_contact_name: profile.emergency_contact_name ?? '',
        emergency_contact_phone: profile.emergency_contact_phone ?? '',
        bio: driver?.bio ?? '',
        allows_luggage: driver?.allows_luggage ?? true,
    });
    const set =
        <K extends keyof typeof form.data>(k: K) =>
        (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
            form.setData(k, e.target.value as never);

    return (
        <>
            <Head title="Profile settings" />
            <h1 className="sr-only">Profile settings</h1>

            <div className="space-y-8">
                <div id="verification" className="scroll-mt-20">
                    <Panel title="Verification">
                        <div className="divide-y px-5">
                            <VerifyRow
                                icon={BadgeCheck}
                                title="Valid government ID"
                                status={verification.id_status}
                                remarks={verification.id_remarks}
                                onToggle={() => setIdOpen((o) => !o)}
                                cta={
                                    idOpen
                                        ? 'Hide'
                                        : idNeedsAction
                                          ? verification.id_status === 'rejected'
                                              ? 'Resubmit ID'
                                              : 'Verify ID'
                                          : 'Details'
                                }
                            >
                                {idOpen && (
                                    <IdVerification
                                        id_types={id_types}
                                        status={verification.id_status}
                                        remarks={verification.id_remarks}
                                        history={id_history}
                                    />
                                )}
                            </VerifyRow>
                            {profile.role === 'driver' && (
                                <VerifyRow
                                    icon={Car}
                                    title="Driver licence"
                                    status={verification.driver_status}
                                    remarks={verification.driver_remarks}
                                    href="/driver/apply"
                                    cta={
                                        verification.driver_status === 'rejected'
                                            ? 'Resubmit licence'
                                            : 'Submit licence'
                                    }
                                />
                            )}
                        </div>
                    </Panel>
                </div>

                <form
                    onSubmit={(e) => {
                        e.preventDefault();
                        form.patch('/settings/profile', {
                            preserveScroll: true,
                        });
                    }}
                    className="space-y-6"
                >
                    <Heading
                        variant="small"
                        title="Personal information"
                        description={`${profile.role[0].toUpperCase()}${profile.role.slice(1)} account · member since ${fmtDate(profile.member_since)}`}
                    />

                    <div className="grid gap-4 sm:grid-cols-2">
                        {(
                            [
                                ['name', 'Full name', 'text', 'name', true],
                                [
                                    'email',
                                    'Email address',
                                    'email',
                                    'username',
                                    true,
                                ],
                                [
                                    'phone_number',
                                    'Mobile number',
                                    'tel',
                                    'tel',
                                    false,
                                ],
                                [
                                    'address',
                                    'Home address',
                                    'text',
                                    'street-address',
                                    false,
                                ],
                            ] as const
                        ).map(([key, label, type, ac, req]) => (
                            <label key={key} className="grid gap-1.5 text-sm">
                                <span className="font-medium">{label}</span>
                                <input
                                    type={type}
                                    required={req}
                                    autoComplete={ac}
                                    value={form.data[key]}
                                    onChange={set(key)}
                                    className={inputCls}
                                />
                                <InputError message={form.errors[key]} />
                            </label>
                        ))}
                    </div>

                    {mustVerifyEmail &&
                        auth.user.email_verified_at === null && (
                            <p className="flex items-center gap-2 text-sm text-muted-foreground">
                                <MailWarning className="size-4 text-coral" />{' '}
                                Your email address is unverified.{' '}
                                <Link
                                    href={send()}
                                    as="button"
                                    className="underline underline-offset-4"
                                >
                                    Re-send the verification email
                                </Link>
                            </p>
                        )}
                    {status === 'verification-link-sent' && (
                        <p className="text-sm font-medium text-ocean">
                            A new verification link has been sent.
                        </p>
                    )}

                    <Heading
                        variant="small"
                        title="Emergency contact"
                        description="Used only if there is a problem during a trip."
                    />
                    <div className="grid gap-4 sm:grid-cols-2">
                        {(
                            [
                                [
                                    'emergency_contact_name',
                                    'Contact name',
                                    'text',
                                ],
                                [
                                    'emergency_contact_phone',
                                    'Contact mobile number',
                                    'tel',
                                ],
                            ] as const
                        ).map(([key, label, type]) => (
                            <label key={key} className="grid gap-1.5 text-sm">
                                <span className="font-medium">{label}</span>
                                <input
                                    type={type}
                                    value={form.data[key]}
                                    onChange={set(key)}
                                    className={inputCls}
                                />
                                <InputError message={form.errors[key]} />
                            </label>
                        ))}
                    </div>

                    {driver && (
                        <>
                            <Heading
                                variant="small"
                                title="Driver settings"
                                description="Shown to passengers on your rides."
                            />
                            <label className="grid gap-1.5 text-sm">
                                <span className="font-medium">About you</span>
                                <textarea
                                    rows={3}
                                    maxLength={280}
                                    value={form.data.bio}
                                    onChange={set('bio')}
                                    className={inputCls}
                                    placeholder="e.g. Friendly weekend driver, AC and charging ports"
                                />
                                <InputError message={form.errors.bio} />
                            </label>
                            <label className="flex items-center gap-2 text-sm">
                                <input
                                    type="checkbox"
                                    checked={form.data.allows_luggage}
                                    onChange={(e) =>
                                        form.setData(
                                            'allows_luggage',
                                            e.target.checked,
                                        )
                                    }
                                />
                                I allow passengers to bring luggage
                            </label>
                        </>
                    )}

                    <Button
                        disabled={form.processing}
                        data-test="update-profile-button"
                    >
                        {form.processing ? 'Saving…' : 'Save changes'}
                    </Button>
                </form>
            </div>

            <DeleteUser />
        </>
    );
}

Profile.layout = {
    breadcrumbs: [{ title: 'Profile settings', href: edit() }],
};