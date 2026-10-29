// One review with the author's avatar + name, stars, comment and date.
import { fmtDate, Stars } from '@/components/lux';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useInitials } from '@/hooks/use-initials';

export default function ReviewCard({
    name,
    role,
    rating,
    comment,
    at,
}: {
    name: string;
    role?: string;
    rating: number;
    comment: string | null;
    at: string | null;
}) {
    const initials = useInitials();

    return (
        <article className="flex gap-3 rounded-xl border bg-card p-4">
            <Avatar className="size-10 shrink-0">
                <AvatarFallback className="bg-ocean font-semibold text-white">
                    {initials(name)}
                </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center justify-between gap-x-3 text-sm">
                    <p className="font-medium">
                        {name}
                        {role && (
                            <span className="ml-2 text-xs font-normal text-muted-foreground">
                                {role}
                            </span>
                        )}
                    </p>
                    {at && (
                        <span className="text-xs text-muted-foreground">
                            {fmtDate(at)}
                        </span>
                    )}
                </div>
                <Stars value={rating} />
                {comment ? (
                    <p className="mt-1 text-sm whitespace-pre-line">{comment}</p>
                ) : (
                    <p className="mt-1 text-sm italic text-muted-foreground">
                        Left a rating without a written comment.
                    </p>
                )}
            </div>
        </article>
    );
}
