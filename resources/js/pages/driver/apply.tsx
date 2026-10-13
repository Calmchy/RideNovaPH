// Driver licence submission / resubmission (private storage, admin approval, rejection reason shown).
import { Head, useForm } from '@inertiajs/react';
import { ShieldCheck } from 'lucide-react';
import InputError from '@/components/input-error';
import { inputCls } from '@/components/kit';
import { StatusBadge } from '@/components/lux';
import { Button } from '@/components/ui/button';

type Props = {
    status: 'pending' | 'approved' | 'rejected' | null;
    remarks: string | null;
    license_number: string | null;
};

export default function DriverApply({
    status,
    remarks,
    license_number,
}: Props) {
    const form = useForm<{
        license_number: string;
        license_expiry: string;
        license_image: File | null;
        consent: boolean;
    }>({
        license_number: license_number ?? '',
        license_expiry: '',
        license_image: null,
        consent: false,
    });
    const locked = status === 'pending' || status === 'approved';

    return (
        <>
            <Head title="Driver licence" />
            <div className="mx-auto flex w-full max-w-xl flex-col gap-6">
                <header>
                    <h1 className="font-serif text-3xl">Driver licence</h1>
                    <p className="mt-2 text-sm text-muted-foreground">
                        Upload your professional/non-professional driver’s
                        licence. An admin reviews it before you can publish
                        rides. You also need an approved personal ID (Profile →
                        Verification).
                    </p>
                    {status && (
                        <p className="mt-3 flex items-center gap-2 text-sm">
                            Status: <StatusBadge status={status} />
                        </p>
                    )}
                    {status === 'rejected' && remarks && (
                        <p className="mt-3 rounded-lg border border-coral/40 bg-coral/10 p-3 text-sm">
                            <strong>Reason:</strong> {remarks}. Please resubmit
                            below.
                        </p>
                    )}
                </header>

                {locked ? (
                    <p className="flex items-start gap-3 rounded-2xl border bg-card p-6 text-sm text-muted-foreground">
                        <ShieldCheck className="size-5 shrink-0 text-ocean" />
                        {status === 'approved'
                            ? 'Your licence is approved. Register a vehicle and publish a ride.'
                            : 'Your licence is being reviewed.'}
                    </p>
                ) : (
                    <form
                        onSubmit={(e) => {
                            e.preventDefault();
                            form.post('/driver/apply', { forceFormData: true });
                        }}
                        className="space-y-5 rounded-2xl border bg-card p-6"
                    >
                        <label className="grid gap-1.5 text-sm">
                            <span className="font-medium">Licence number</span>
                            <input
                                required
                                value={form.data.license_number}
                                onChange={(e) =>
                                    form.setData(
                                        'license_number',
                                        e.target.value,
                                    )
                                }
                                className={inputCls}
                            />
                            <InputError message={form.errors.license_number} />
                        </label>
                        <label className="grid gap-1.5 text-sm">
                            <span className="font-medium">Expiry date</span>
                            <input
                                required
                                type="date"
                                value={form.data.license_expiry}
                                onChange={(e) =>
                                    form.setData(
                                        'license_expiry',
                                        e.target.value,
                                    )
                                }
                                className={inputCls}
                            />
                            <InputError message={form.errors.license_expiry} />
                        </label>
                        <label className="grid gap-1.5 text-sm">
                            <span className="font-medium">
                                Photo of licence (JPG or PNG, max 4 MB)
                            </span>
                            <input
                                required
                                type="file"
                                accept="image/jpeg,image/png"
                                onChange={(e) =>
                                    form.setData(
                                        'license_image',
                                        e.target.files?.[0] ?? null,
                                    )
                                }
                                className={inputCls}
                            />
                            <InputError message={form.errors.license_image} />
                        </label>
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
                                I consent to RideNovaPH storing my licence
                                privately for verification (Data Privacy Act of
                                2012).
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
                                  ? 'Resubmit licence'
                                  : 'Submit licence'}
                        </Button>
                    </form>
                )}
            </div>
        </>
    );
}
