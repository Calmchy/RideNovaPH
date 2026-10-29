// "Rate your driver" form: click a star to choose 1-5 (hover previews), add an optional comment,
// then Save or Cancel. Save stays disabled until a star is chosen. The server re-checks that the
// trip is completed and that you haven't reviewed it already.
import { router } from '@inertiajs/react';
import { Star } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

const LABELS = ['', 'Poor', 'Fair', 'Good', 'Very good', 'Excellent'];

export default function ReviewForm({
    bookingId,
    target,
}: {
    bookingId: number;
    /** Who is being reviewed, e.g. "your driver". */
    target: string;
}) {
    const [open, setOpen] = useState(false);
    const [rating, setRating] = useState(0);
    const [hover, setHover] = useState(0);
    const [comment, setComment] = useState('');
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const shown = hover || rating;

    const cancel = () => {
        setOpen(false);
        setRating(0);
        setHover(0);
        setComment('');
        setError(null);
    };

    const save = () => {
        if (rating < 1) {
            setError('Please tap a star to rate.');

            return;
        }

        router.post(
            `/bookings/${bookingId}/reviews`,
            { rating, comment },
            {
                preserveScroll: true,
                onStart: () => setSaving(true),
                onFinish: () => setSaving(false),
                onError: (e) => setError(e.rating ?? e.comment ?? 'Could not save.'),
                onSuccess: cancel,
            },
        );
    };

    return (
        <Dialog
            open={open}
            onOpenChange={(o) => {
                // Closing the banner any way (X, Esc, click outside) discards the draft.
                if (!o) {
                    cancel();
                } else {
                    setOpen(true);
                }
            }}
        >
            <DialogTrigger asChild>
                <Button>Write a Review</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle>How was the trip?</DialogTitle>
                    <DialogDescription>
                        Rate {target}. Your name and comment will be shown
                        publicly on their profile.
                    </DialogDescription>
                </DialogHeader>

                <div>
                    <div
                        className="flex gap-1"
                        role="radiogroup"
                        aria-label="Rating"
                        onMouseLeave={() => setHover(0)}
                    >
                        {[1, 2, 3, 4, 5].map((n) => (
                            <button
                                key={n}
                                type="button"
                                role="radio"
                                aria-checked={rating === n}
                                aria-label={`${n} ${n === 1 ? 'star' : 'stars'}`}
                                onClick={() => {
                                    setRating(n);
                                    setError(null);
                                }}
                                onMouseEnter={() => setHover(n)}
                                onFocus={() => setHover(n)}
                                onBlur={() => setHover(0)}
                                className="rounded p-0.5 transition hover:scale-110 focus-visible:ring-2 focus-visible:ring-ocean focus-visible:outline-none"
                            >
                                <Star
                                    className={cn(
                                        'size-9 transition-all duration-150',
                                        // Hover previews in a brighter yellow; a clicked star stays solid yellow;
                                        // every other star is just an outline (no colour).
                                        hover && n <= hover
                                            ? 'scale-110 fill-yellow-300 text-yellow-400 drop-shadow'
                                            : n <= rating
                                              ? 'fill-yellow-400 text-yellow-400'
                                              : 'fill-transparent text-muted-foreground',
                                    )}
                                />
                            </button>
                        ))}
                    </div>
                    <p className="mt-1 h-5 text-sm text-muted-foreground">
                        {shown
                            ? `${shown}/5 · ${LABELS[shown]}`
                            : 'Tap a star to rate'}
                    </p>
                    {error && (
                        <p role="alert" className="text-sm text-destructive">
                            {error}
                        </p>
                    )}
                </div>

                <div>
                    <textarea
                        value={comment}
                        onChange={(e) => setComment(e.target.value)}
                        maxLength={1000}
                        rows={4}
                        placeholder="Describe the trip (optional)"
                        className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                    />
                    <p className="text-right text-xs text-muted-foreground">
                        {comment.length}/1000
                    </p>
                </div>

                <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={cancel} disabled={saving}>
                        Cancel
                    </Button>
                    <Button onClick={save} disabled={saving || rating < 1}>
                        {saving ? 'Saving…' : 'Save'}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
