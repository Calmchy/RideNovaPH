// A card with the "glassmorphic tile shine" hover: a glow, flickering tiles and border lines drawn in.
// The CSS lives in resources/css/app.css (.shine-card). Use it on a few cards, not on huge grids.
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export default function ShineCard({
    as: Tag = 'div',
    className,
    children,
}: {
    as?: 'div' | 'li' | 'article' | 'aside';
    className?: string;
    children: ReactNode;
}) {
    return (
        <Tag className={cn('shine-card rounded-2xl border bg-card', className)}>
            <span className="shine" aria-hidden="true" />
            <span className="background" aria-hidden="true">
                {Array.from({ length: 10 }, (_, i) => (
                    <span key={i} className={`tile tile-${i + 1}`} />
                ))}
            </span>
            <span className="line line-1" aria-hidden="true" />
            <span className="line line-2" aria-hidden="true" />
            {children}
        </Tag>
    );
}
