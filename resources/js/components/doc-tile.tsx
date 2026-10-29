// One document image (licence side, COR, Gov ID side) with an optional upload button.
// The image comes from an owner-only route; the upload button only exists where the page passes `upload`.
import { router } from '@inertiajs/react';
import { Camera, FileImage, Loader2 } from 'lucide-react';
import { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';

const MAX_BYTES = 5 * 1024 * 1024;
const TYPES = ['image/jpeg', 'image/png', 'image/webp'];

export type DocUpload = {
    /** POST target */
    url: string;
    /** form field name the server expects */
    field: string;
    label: string;
    /** Allowed MIME types (default JPG, PNG, WEBP). Licence and Gov ID photos are JPG/PNG only. */
    types?: string[];
    /** Size limit in MB (default 5). */
    maxMb?: number;
    /** If set, the user must confirm this warning before the file picker opens. */
    confirm?: string;
};

export default function DocTile({
    label,
    url,
    upload,
    emptyText = 'Not uploaded yet',
}: {
    label: string;
    url: string | null;
    upload?: DocUpload;
    emptyText?: string;
}) {
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const fileRef = useRef<HTMLInputElement>(null);

    const send = (file: File | undefined) => {
        if (!file || !upload) {
            return;
        }

        // Friendly early checks; the server validates again.
        const allowed = upload.types ?? TYPES;
        const maxMb = upload.maxMb ?? MAX_BYTES / 1024 / 1024;

        if (!allowed.includes(file.type)) {
            setError(
                allowed.includes('image/webp')
                    ? 'Use a JPG, PNG or WEBP photo.'
                    : 'Use a JPG or PNG photo.',
            );

            return;
        }

        if (file.size > maxMb * 1024 * 1024) {
            setError(`That photo is over ${maxMb} MB. Choose a smaller one.`);

            return;
        }

        setError(null);
        router.post(
            upload.url,
            { [upload.field]: file },
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
                    setError(
                        errors[upload.field] ?? 'Could not upload that photo.',
                    ),
            },
        );
    };

    return (
        <div className="space-y-2">
            <p className="text-xs font-medium tracking-widest text-ocean uppercase dark:text-foam">
                {label}
            </p>
            {url ? (
                <Dialog>
                    <DialogTrigger asChild>
                        <button
                            type="button"
                            aria-label={`View ${label} full size`}
                            className="block w-full cursor-zoom-in overflow-hidden rounded-xl border bg-muted"
                        >
                            <img
                                src={url}
                                alt={label}
                                loading="lazy"
                                className="aspect-[4/3] w-full object-cover"
                            />
                        </button>
                    </DialogTrigger>
                    {/* The X button is built into DialogContent (top-right); the title bar keeps it clear of the photo. */}
                    <DialogContent className="max-h-[90vh] gap-0 overflow-hidden p-0 sm:max-w-3xl">
                        <div className="border-b px-5 py-3 pr-12">
                            <DialogTitle className="text-sm">{label}</DialogTitle>
                            <DialogDescription className="sr-only">
                                Full size preview. Press Esc or the X button to
                                close.
                            </DialogDescription>
                        </div>
                        <div className="overflow-auto bg-black/80">
                            <img
                                src={url}
                                alt={label}
                                className="mx-auto max-h-[75vh] w-auto max-w-full object-contain"
                            />
                        </div>
                    </DialogContent>
                </Dialog>
            ) : (
                <div className="flex aspect-[4/3] w-full flex-col items-center justify-center gap-2 rounded-xl border border-dashed text-center text-sm text-muted-foreground">
                    <FileImage className="size-6" aria-hidden />
                    {emptyText}
                </div>
            )}

            {upload && (
                <>
                    <input
                        ref={fileRef}
                        type="file"
                        accept={(upload.types ?? TYPES).join(',')}
                        className="sr-only"
                        tabIndex={-1}
                        aria-hidden
                        onChange={(e) => send(e.target.files?.[0])}
                    />
                    <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={busy}
                        onClick={() => {
                            if (upload.confirm && !window.confirm(upload.confirm)) {
                                return;
                            }

                            fileRef.current?.click();
                        }}
                    >
                        {busy ? <Loader2 className="animate-spin" /> : <Camera />}
                        {upload.label}
                    </Button>
                </>
            )}
            {error && (
                <p role="alert" className="text-xs text-destructive">
                    {error}
                </p>
            )}
        </div>
    );
}
