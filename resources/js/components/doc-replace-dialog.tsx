// ONE "Replace photos" button for a document with a front and a back (driver licence, Gov ID).
// Opens a popup where the user picks a new front and/or back, sees a PREVIEW of what they picked,
// and nothing is uploaded until they press Save.
import { router } from '@inertiajs/react';
import { Camera, ImagePlus, Loader2, TriangleAlert } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';

type Side = 'front' | 'back';
type Picked = Record<Side, File | null>;
type Shown = Record<Side, string | null>;

const SIDES: { key: Side; label: string; field: string }[] = [
    { key: 'front', label: 'Front', field: 'front_photo' },
    { key: 'back', label: 'Back', field: 'back_photo' },
];

export default function DocReplaceDialog({
    title,
    url,
    current,
    types,
    maxMb,
    warning,
}: {
    /** e.g. "Driver’s licence" */
    title: string;
    /** POST target; receives front_photo and/or back_photo */
    url: string;
    /** the photos on file now (shown until a new one is picked) */
    current: Shown;
    types: string[];
    maxMb: number;
    /** shown in the popup when saving will send the document back to review */
    warning?: string;
}) {
    const [open, setOpen] = useState(false);
    const [files, setFiles] = useState<Picked>({ front: null, back: null });
    const [previews, setPreviews] = useState<Shown>({ front: null, back: null });
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const inputs = useRef<Record<Side, HTMLInputElement | null>>({
        front: null,
        back: null,
    });

    // Local preview of the newly chosen files; the object URLs are released when they change.
    useEffect(() => {
        const next: Shown = {
            front: files.front ? URL.createObjectURL(files.front) : null,
            back: files.back ? URL.createObjectURL(files.back) : null,
        };
        setPreviews(next);

        return () => {
            Object.values(next).forEach((u) => u && URL.revokeObjectURL(u));
        };
    }, [files]);

    const reset = () => {
        setFiles({ front: null, back: null });
        setError(null);
    };

    const choose = (side: Side, file: File | undefined) => {
        if (!file) {
            return;
        }

        if (!types.includes(file.type)) {
            setError('Use a JPG or PNG photo.');

            return;
        }

        if (file.size > maxMb * 1024 * 1024) {
            setError(`That photo is over ${maxMb} MB. Choose a smaller one.`);

            return;
        }

        setError(null);
        setFiles((f) => ({ ...f, [side]: file }));
    };

    const save = () => {
        // Only send what was actually picked.
        const data: Record<string, File> = {};
        SIDES.forEach(({ key, field }) => {
            const f = files[key];

            if (f) {
                data[field] = f;
            }
        });

        router.post(url, data, {
            forceFormData: true,
            preserveScroll: true,
            onStart: () => setBusy(true),
            onFinish: () => setBusy(false),
            onSuccess: () => {
                setOpen(false);
                reset();
            },
            onError: (errors) =>
                setError(
                    errors.front_photo ??
                        errors.back_photo ??
                        'Could not upload those photos.',
                ),
        });
    };

    const nothingPicked = !files.front && !files.back;

    return (
        <Dialog
            open={open}
            onOpenChange={(v) => {
                setOpen(v);

                if (!v) {
                    reset();
                }
            }}
        >
            <DialogTrigger asChild>
                <Button type="button" size="sm" variant="outline">
                    <Camera /> Replace photos
                </Button>
            </DialogTrigger>
            <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
                <DialogHeader>
                    <DialogTitle>Replace {title} photos</DialogTitle>
                    <DialogDescription>
                        Pick a new photo for the front, the back, or both.
                        Nothing changes until you press Save.
                    </DialogDescription>
                </DialogHeader>

                {warning && (
                    <p className="flex items-start gap-2 rounded-xl border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-amber-800 dark:text-amber-200">
                        <TriangleAlert
                            className="mt-0.5 size-4 shrink-0"
                            aria-hidden
                        />
                        {warning}
                    </p>
                )}

                <div className="grid gap-4 sm:grid-cols-2">
                    {SIDES.map(({ key, label }) => {
                        const shown = previews[key] ?? current[key];

                        return (
                            <div key={key} className="space-y-2">
                                <p className="text-xs font-medium tracking-widest text-ocean uppercase dark:text-foam">
                                    {label}
                                    {files[key] && (
                                        <span className="ml-2 tracking-normal text-emerald-600 normal-case dark:text-emerald-300">
                                            new photo
                                        </span>
                                    )}
                                </p>
                                <div className="aspect-[4/3] overflow-hidden rounded-xl border bg-muted">
                                    {shown ? (
                                        <img
                                            src={shown}
                                            alt={`${label} preview`}
                                            className="size-full object-cover"
                                        />
                                    ) : (
                                        <div className="flex size-full flex-col items-center justify-center gap-2 text-sm text-muted-foreground">
                                            <ImagePlus
                                                className="size-6"
                                                aria-hidden
                                            />
                                            Not uploaded yet
                                        </div>
                                    )}
                                </div>
                                <input
                                    ref={(el) => {
                                        inputs.current[key] = el;
                                    }}
                                    type="file"
                                    accept={types.join(',')}
                                    className="sr-only"
                                    tabIndex={-1}
                                    aria-hidden
                                    onChange={(e) => {
                                        choose(key, e.target.files?.[0]);
                                        e.target.value = '';
                                    }}
                                />
                                <Button
                                    type="button"
                                    size="sm"
                                    variant="secondary"
                                    onClick={() => inputs.current[key]?.click()}
                                >
                                    <ImagePlus />
                                    {files[key]
                                        ? 'Choose a different photo'
                                        : current[key]
                                          ? `Choose new ${label.toLowerCase()}`
                                          : `Add ${label.toLowerCase()}`}
                                </Button>
                            </div>
                        );
                    })}
                </div>

                {error && (
                    <p role="alert" className="text-sm text-destructive">
                        {error}
                    </p>
                )}

                <DialogFooter>
                    <Button
                        type="button"
                        variant="outline"
                        disabled={busy}
                        onClick={() => setOpen(false)}
                    >
                        Cancel
                    </Button>
                    <Button
                        type="button"
                        disabled={busy || nothingPicked}
                        onClick={save}
                    >
                        {busy && <Loader2 className="animate-spin" />}
                        {busy ? 'Saving…' : 'Save'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
