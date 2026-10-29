// "Slide to confirm" control: the user must drag the handle all the way across, so a stray tap or
// click can never trigger a sensitive action (like marking a booking as paid).
// Works with mouse, touch and pen (pointer events) and with the keyboard (Arrow keys on the handle).
import { ChevronsRight, Check } from 'lucide-react';
import { useRef, useState } from 'react';
import type { PointerEvent, KeyboardEvent } from 'react';
import { cn } from '@/lib/utils';

const HANDLE = 48; // px, handle width
const THRESHOLD = 0.92; // how far (0..1) counts as "slid all the way"

export default function SlideToConfirm({
    label,
    onConfirm,
    className,
}: {
    label: string;
    /** Called once the slide completes. Call `reset()` if the request fails so the user can retry. */
    onConfirm: (reset: () => void) => void;
    className?: string;
}) {
    const track = useRef<HTMLDivElement>(null);
    const startX = useRef(0); // pointer x when the drag began, minus the handle's start offset
    const [p, setP] = useState(0); // progress 0..1 (state, so rendering never reads a ref)
    const [dragging, setDragging] = useState(false);
    const [done, setDone] = useState(false);

    /** Pixels the handle can travel (track width minus handle and padding). Only used inside handlers. */
    const travel = () => Math.max((track.current?.clientWidth ?? 0) - HANDLE - 8, 1);

    const reset = () => {
        setDone(false);
        setP(0);
    };

    const finish = () => {
        setDone(true);
        setP(1);
        onConfirm(reset);
    };

    const onDown = (e: PointerEvent<HTMLButtonElement>) => {
        if (done) {
            return;
        }

        e.currentTarget.setPointerCapture(e.pointerId);
        startX.current = e.clientX - p * travel();
        setDragging(true);
    };

    const onMove = (e: PointerEvent<HTMLButtonElement>) => {
        if (dragging) {
            setP(Math.min(Math.max((e.clientX - startX.current) / travel(), 0), 1));
        }
    };

    const onUp = () => {
        if (!dragging) {
            return;
        }

        setDragging(false);

        if (p >= THRESHOLD) {
            finish();
        } else {
            setP(0); // not far enough: snap back, nothing happens
        }
    };

    // Keyboard users: Right arrow nudges the handle, reaching the end confirms; Left/Escape backs off.
    const onKey = (e: KeyboardEvent<HTMLButtonElement>) => {
        if (done) {
            return;
        }

        if (e.key === 'ArrowRight') {
            e.preventDefault();
            const next = Math.min(p + 0.25, 1);
            setP(next);

            if (next >= THRESHOLD) {
                finish();
            }
        } else if (e.key === 'ArrowLeft' || e.key === 'Escape') {
            e.preventDefault();
            setP(0);
        }
    };

    // Handle position as CSS so no ref is read while rendering.
    const left = `calc(4px + (100% - ${HANDLE + 8}px) * ${p})`;

    return (
        <div
            ref={track}
            className={cn(
                'relative h-14 w-full max-w-xs touch-none rounded-full border border-ocean/40 bg-ocean/10 p-1 select-none',
                className,
            )}
        >
            {/* Fill behind the handle grows as you slide */}
            <div
                className="absolute inset-y-1 left-1 rounded-full bg-ocean/30"
                style={{ width: `calc(${HANDLE}px + (100% - ${HANDLE + 8}px) * ${p})` }}
            />
            <span
                className="pointer-events-none absolute inset-0 flex items-center justify-center pl-10 text-sm font-medium"
                style={{ opacity: 1 - p }}
            >
                {done ? 'Recording…' : label}
            </span>
            <button
                type="button"
                role="slider"
                aria-label={`${label}. Drag right, or press the right arrow key, to confirm.`}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={Math.round(p * 100)}
                disabled={done}
                onPointerDown={onDown}
                onPointerMove={onMove}
                onPointerUp={onUp}
                onPointerCancel={onUp}
                onKeyDown={onKey}
                style={{
                    width: HANDLE,
                    left,
                    transition: dragging ? 'none' : 'left 0.2s ease',
                }}
                className="absolute inset-y-1 grid cursor-grab place-items-center rounded-full bg-ocean text-white shadow active:cursor-grabbing"
            >
                {done ? (
                    <Check className="size-5" />
                ) : (
                    <ChevronsRight className="size-5" />
                )}
            </button>
        </div>
    );
}
