// Vehicle photo banner (front / back / interior) with a description panel underneath.
// Read-only by default. Pass `editable` ONLY on the driver's own page: it adds the upload and
// edit controls. The server independently checks ownership, so hiding the buttons is never the security.
import { router } from '@inertiajs/react';
import {
    Camera,
    ChevronLeft,
    ChevronRight,
    Loader2,
    Pencil,
} from 'lucide-react';
import { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';

export type VehiclePhoto = {
    key: string;
    label: string;
    url: string | null;
};

type Editable = {
    /** POST target for replacing one photo, e.g. /driver/vehicles/3/photos/front */
    photoUrl: (key: string) => string;
    /** PATCH target for the description text */
    descriptionUrl: string;
};

type Props = {
    photos: VehiclePhoto[];
    description: string | null;
    editable?: Editable;
};

const MAX_BYTES = 5 * 1024 * 1024;
const TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_DESCRIPTION = 500;

export default function VehicleBanner({ photos, description, editable }: Props) {
    const [i, setI] = useState(0);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [editingText, setEditingText] = useState(false);
    const [draft, setDraft] = useState(description ?? '');
    const [saving, setSaving] = useState(false);
    const fileRef = useRef<HTMLInputElement>(null);

    const go = (n: number) => setI((n + photos.length) % photos.length);
    const slide = photos[i];
    const missing = photos.filter((p) => !p.url).length;

    const upload = (file: File | undefined) => {
        if (!file || !editable) {
            return;
        }

        // Quick checks for a friendly message; the server validates again.
        if (!TYPES.includes(file.type)) {
            setError('Use a JPG, PNG or WEBP photo.');

            return;
        }

        if (file.size > MAX_BYTES) {
            setError('That photo is over 5 MB. Choose a smaller one.');

            return;
        }

        setError(null);
        router.post(
            editable.photoUrl(slide.key),
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

    const saveText = () => {
        if (!editable) {
            return;
        }

        router.patch(
            editable.descriptionUrl,
            { description: draft },
            {
                preserveScroll: true,
                onStart: () => setSaving(true),
                onFinish: () => setSaving(false),
                onSuccess: () => setEditingText(false),
                onError: (errors) =>
                    setError(errors.description ?? 'Could not save.'),
            },
        );
    };

    return (
        <figure className="overflow-hidden rounded-2xl border bg-card">
            <div
                className="relative aspect-[16/8] w-full bg-deep"
                role="group"
                aria-roledescription="carousel"
                aria-label="Vehicle photos"
            >
                {slide.url ? (
                    <img
                        key={slide.url}
                        src={slide.url}
                        alt={`${slide.label} of the vehicle`}
                        className="size-full object-cover"
                    />
                ) : (
                    <div className="flex size-full flex-col items-center justify-center gap-2 bg-gradient-to-br from-deep via-ocean/60 to-deep p-6 text-center text-foam/80">
                        <Camera className="size-8" aria-hidden />
                        <p className="text-sm">
                            No {slide.label.toLowerCase()} photo yet
                        </p>
                    </div>
                )}

                {/* view label */}
                <span className="absolute top-3 left-3 rounded-full bg-deep/80 px-3 py-1 text-xs font-medium tracking-wide text-sand uppercase backdrop-blur">
                    {slide.label} view
                </span>

                {/* driver-only: replace / add this view */}
                {editable && (
                    <>
                        <input
                            ref={fileRef}
                            type="file"
                            accept="image/jpeg,image/png,image/webp"
                            className="sr-only"
                            tabIndex={-1}
                            aria-hidden
                            onChange={(e) => upload(e.target.files?.[0])}
                        />
                        <Button
                            type="button"
                            size="sm"
                            variant="secondary"
                            className="absolute top-3 right-3"
                            disabled={busy}
                            onClick={() => fileRef.current?.click()}
                        >
                            {busy ? (
                                <Loader2 className="animate-spin" />
                            ) : (
                                <Camera />
                            )}
                            {slide.url ? 'Replace photo' : 'Upload photo'}
                        </Button>
                    </>
                )}

                {/* prev / next */}
                <button
                    type="button"
                    onClick={() => go(i - 1)}
                    aria-label="Previous photo"
                    className="absolute top-1/2 left-2 -translate-y-1/2 rounded-full bg-deep/70 p-2 text-white backdrop-blur hover:bg-deep"
                >
                    <ChevronLeft className="size-5" />
                </button>
                <button
                    type="button"
                    onClick={() => go(i + 1)}
                    aria-label="Next photo"
                    className="absolute top-1/2 right-2 -translate-y-1/2 rounded-full bg-deep/70 p-2 text-white backdrop-blur hover:bg-deep"
                >
                    <ChevronRight className="size-5" />
                </button>

                {/* view picker */}
                <div className="absolute inset-x-0 bottom-3 flex justify-center gap-2">
                    {photos.map((p, n) => (
                        <button
                            key={p.key}
                            type="button"
                            onClick={() => setI(n)}
                            aria-label={`Show ${p.label.toLowerCase()} photo`}
                            aria-current={n === i}
                            className={`rounded-full px-3 py-1 text-xs backdrop-blur transition ${
                                n === i
                                    ? 'bg-coral font-semibold text-deep'
                                    : 'bg-deep/70 text-white hover:bg-deep'
                            }`}
                        >
                            {p.label}
                            {editable && !p.url && ' •'}
                        </button>
                    ))}
                </div>
            </div>

            {/* description panel */}
            <figcaption className="space-y-2 border-t p-4">
                <div className="flex items-center justify-between gap-3">
                    <h3 className="text-xs font-semibold tracking-widest text-ocean uppercase dark:text-foam">
                        About this vehicle
                    </h3>
                    {editable && !editingText && (
                        <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                                setDraft(description ?? '');
                                setEditingText(true);
                            }}
                        >
                            <Pencil /> Edit
                        </Button>
                    )}
                </div>

                {editable && editingText ? (
                    <div className="space-y-2">
                        <textarea
                            value={draft}
                            onChange={(e) => setDraft(e.target.value)}
                            maxLength={MAX_DESCRIPTION}
                            rows={4}
                            placeholder="Condition, aircon, luggage space, house rules…"
                            className="w-full rounded-xl border bg-background p-3 text-sm"
                            aria-label="Vehicle description"
                        />
                        <div className="flex items-center justify-between gap-3">
                            <span className="text-xs text-muted-foreground">
                                {draft.length}/{MAX_DESCRIPTION}
                            </span>
                            <div className="flex gap-2">
                                <Button
                                    type="button"
                                    size="sm"
                                    variant="outline"
                                    disabled={saving}
                                    onClick={() => setEditingText(false)}
                                >
                                    Cancel
                                </Button>
                                <Button
                                    type="button"
                                    size="sm"
                                    disabled={saving}
                                    onClick={saveText}
                                >
                                    {saving ? 'Saving…' : 'Save'}
                                </Button>
                            </div>
                        </div>
                    </div>
                ) : description ? (
                    <p className="text-sm whitespace-pre-line">{description}</p>
                ) : (
                    <p className="text-sm text-muted-foreground">
                        {editable
                            ? 'No description yet. Tell passengers about your vehicle.'
                            : 'The driver has not added a description.'}
                    </p>
                )}

                {editable && missing > 0 && (
                    <p className="text-xs text-coral">
                        {missing} of {photos.length} photos still needed
                        (marked •). Passengers see all three views.
                    </p>
                )}
                {error && (
                    <p role="alert" className="text-xs text-destructive">
                        {error}
                    </p>
                )}
            </figcaption>
        </figure>
    );
}
