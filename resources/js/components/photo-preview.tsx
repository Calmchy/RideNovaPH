// Wrap a profile picture so clicking it opens a big preview. With no photo (initials only) it renders as-is.
import type { ReactNode } from 'react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';

export default function PhotoPreview({
    src,
    name,
    children,
}: {
    /** The full photo. Null/empty = nothing to preview. */
    src: string | null | undefined;
    name: string;
    /** The small avatar the person clicks. */
    children: ReactNode;
}) {
    if (!src) {
        return <>{children}</>;
    }

    return (
        <Dialog>
            <DialogTrigger asChild>
                <button
                    type="button"
                    aria-label={`View ${name}'s profile picture full size`}
                    className="cursor-zoom-in rounded-full focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                >
                    {children}
                </button>
            </DialogTrigger>
            <DialogContent className="max-h-[90vh] gap-0 overflow-hidden p-0 sm:max-w-xl">
                <div className="border-b px-5 py-3 pr-12">
                    <DialogTitle className="text-sm">{name}</DialogTitle>
                    <DialogDescription className="sr-only">
                        Profile picture preview. Press Esc or the X button to
                        close.
                    </DialogDescription>
                </div>
                <div className="overflow-auto bg-black/80">
                    <img
                        src={src}
                        alt={`${name}'s profile picture`}
                        className="mx-auto max-h-[75vh] w-auto max-w-full object-contain"
                    />
                </div>
            </DialogContent>
        </Dialog>
    );
}
