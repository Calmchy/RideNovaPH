// ID verification for passengers AND drivers. Upload (private storage), see the status, read the
// rejection reason, and resubmit. The consent checkbox is required by the Data Privacy Act of 2012.
import { Head, useForm } from '@inertiajs/react';
import { ShieldCheck } from 'lucide-react';
import InputError from '@/components/input-error';
import { inputCls, Panel } from '@/components/kit';
import { fmtDateTime, StatusBadge } from '@/components/lux';
import { Button } from '@/components/ui/button';

type Props = {
    id_types: { id: number; name: string }[];
    status: 'pending' | 'approved' | 'rejected' | null;
    remarks: string | null;
    history: {
        id: number;
        id_type: string;
        status: string;
        remarks: string | null;
        submitted_at: string;
    }[];
};

export default function IdentityCreate({
    id_types,
    status,
    remarks,
    history,
}: Props) {
    const form = useForm<{
        id_type_id: string;
        front_image: File | null;
        back_image: File | null;
        consent: boolean;
    }>({
        id_type_id: '',
        front_image: null,
        back_image: null,
        consent: false,
    });
    const locked = status === 'pending' || status === 'approved';

    return (
        <>
            <Head title="Verify your ID" />
            <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 p-4 md:p-8">
                <header>
                    <h1 className="font-serif text-3xl md:text-4xl">
                        Verify your ID
                    </h1>
                    <p className="mt-2 text-muted-foreground">
                        Upload a clear photo of a valid government ID. It is
                        required before your first booking. Only RideNovaPH
                        admins can see it, and it is kept in private storage.
                    </p>
                    {status && (
                        <div className="mt-4 flex items-center gap-2 text-sm">
                            Current status: <StatusBadge status={status} />
                        </div>
                    )}
                    {status === 'rejected' && remarks && (
                        <p className="mt-3 rounded-lg border border-coral/40 bg-coral/10 p-3 text-sm">
                            <strong>Why it was rejected:</strong> {remarks}.
                            Please upload a new photo below.
                        </p>
                    )}
                </header>

                {locked ? (
                    <p className="flex items-start gap-3 rounded-2xl border bg-card p-6 text-sm text-muted-foreground">
                        <ShieldCheck className="size-5 shrink-0 text-ocean" />
                        {status === 'approved'
                            ? 'Your ID is verified. You can book rides now.'
                            : 'Your ID is being reviewed. We will unlock booking as soon as it is approved.'}
                    </p>
                ) : (
                    <form
                        onSubmit={(e) => {
                            e.preventDefault();
                            form.post('/identity', { forceFormData: true });
                        }}
                        className="space-y-5 rounded-2xl border bg-card p-6"
                    >
                        <div>
                            <label
                                className="mb-1 block text-sm font-medium"
                                htmlFor="id_type_id"
                            >
                                ID type
                            </label>
                            <select
                                id="id_type_id"
                                required
                                value={form.data.id_type_id}
                                onChange={(e) =>
                                    form.setData('id_type_id', e.target.value)
                                }
                                className={inputCls}
                            >
                                <option value="">Choose…</option>
                                {id_types.map((t) => (
                                    <option key={t.id} value={t.id}>
                                        {t.name}
                                    </option>
                                ))}
                            </select>
                            <InputError message={form.errors.id_type_id} />
                        </div>
                        <div>
                            <label
                                className="mb-1 block text-sm font-medium"
                                htmlFor="front"
                            >
                                Front of ID (JPG or PNG, max 4 MB)
                            </label>
                            <input
                                id="front"
                                type="file"
                                required
                                accept="image/jpeg,image/png"
                                onChange={(e) =>
                                    form.setData(
                                        'front_image',
                                        e.target.files?.[0] ?? null,
                                    )
                                }
                                className={inputCls}
                            />
                            <InputError message={form.errors.front_image} />
                        </div>
                        <div>
                            <label
                                className="mb-1 block text-sm font-medium"
                                htmlFor="back"
                            >
                                Back of ID (optional)
                            </label>
                            <input
                                id="back"
                                type="file"
                                accept="image/jpeg,image/png"
                                onChange={(e) =>
                                    form.setData(
                                        'back_image',
                                        e.target.files?.[0] ?? null,
                                    )
                                }
                                className={inputCls}
                            />
                            <InputError message={form.errors.back_image} />
                        </div>
                        <label className="flex items-start gap-3 text-sm">
                            <input
                                type="checkbox"
                                checked={form.data.consent}
                                onChange={(e) =>
                                    form.setData('consent', e.target.checked)
                                }
                                className="mt-1"
                            />
                            <span>
                                I consent to RideNovaPH collecting and storing
                                my ID for identity verification and safety, in
                                line with the Data Privacy Act of 2012.
                            </span>
                        </label>
                        <InputError message={form.errors.consent} />
                        <Button
                            type="submit"
                            disabled={form.processing}
                            className="w-full"
                        >
                            {form.processing
                                ? 'Uploading…'
                                : status === 'rejected'
                                  ? 'Resubmit for verification'
                                  : 'Submit for verification'}
                        </Button>
                    </form>
                )}

                {history.length > 0 && (
                    <Panel title="Submission history">
                        <ul className="divide-y">
                            {history.map((h) => (
                                <li
                                    key={h.id}
                                    className="flex flex-wrap items-center justify-between gap-2 px-5 py-3 text-sm"
                                >
                                    <div>
                                        <p>{h.id_type}</p>
                                        <p className="text-xs text-muted-foreground">
                                            {fmtDateTime(h.submitted_at)}
                                            {h.remarks && ` · ${h.remarks}`}
                                        </p>
                                    </div>
                                    <StatusBadge status={h.status} />
                                </li>
                            ))}
                        </ul>
                    </Panel>
                )}
            </div>
        </>
    );
}
