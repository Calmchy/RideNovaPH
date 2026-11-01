// "The Team Behind RideNova PH" card: a two-layer sliding hover effect.
// At rest the photo slide covers the text slide; on hover (or keyboard focus / tap) the photo slides up and
// the text slides down into view. The admin gets a pencil to change the picture and description.
import { useForm, usePage } from '@inertiajs/react';
import { Pencil, UserRound } from 'lucide-react';
import { useState } from 'react';
import { Field, inputCls } from '@/components/kit';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';

export type TeamMember = {
    id: number;
    name: string;
    role_title: string;
    description: string | null;
    photo: string | null;
};

function EditDialog({
    m,
    open,
    onOpenChange,
}: {
    m: TeamMember;
    open: boolean;
    onOpenChange: (o: boolean) => void;
}) {
    const form = useForm<{
        name: string;
        role_title: string;
        description: string;
        photo: File | null;
        remove_photo: boolean;
    }>({
        name: m.name,
        role_title: m.role_title,
        description: m.description ?? '',
        photo: null,
        remove_photo: false,
    });
    const [preview, setPreview] = useState<string | null>(null);
    const shown = form.data.remove_photo ? null : (preview ?? m.photo);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle>Edit team card</DialogTitle>
                    <DialogDescription>
                        Change the picture and the text shown on the About
                        page.
                    </DialogDescription>
                </DialogHeader>
                <form
                    className="grid gap-4"
                    onSubmit={(e) => {
                        e.preventDefault();
                        form.post(`/admin/team/${m.id}`, {
                            forceFormData: true,
                            preserveScroll: true,
                            onSuccess: () => onOpenChange(false),
                        });
                    }}
                >
                    <div className="flex items-center gap-4">
                        <span className="grid size-20 shrink-0 place-items-center overflow-hidden rounded-full bg-ocean text-white">
                            {shown ? (
                                <img
                                    src={shown}
                                    alt=""
                                    className="size-full object-cover"
                                />
                            ) : (
                                <UserRound className="size-9" />
                            )}
                        </span>
                        <div className="grid gap-2 text-sm">
                            <input
                                type="file"
                                accept="image/jpeg,image/png,image/webp"
                                aria-label="New picture"
                                onChange={(e) => {
                                    const file = e.target.files?.[0] ?? null;
                                    form.setData((d) => ({
                                        ...d,
                                        photo: file,
                                        remove_photo: false,
                                    }));
                                    setPreview(
                                        file ? URL.createObjectURL(file) : null,
                                    );
                                }}
                            />
                            <span className="text-xs text-muted-foreground">
                                JPG, PNG or WEBP, up to 3 MB.
                            </span>
                            {m.photo && !form.data.photo && (
                                <label className="flex items-center gap-2">
                                    <input
                                        type="checkbox"
                                        checked={form.data.remove_photo}
                                        onChange={(e) =>
                                            form.setData(
                                                'remove_photo',
                                                e.target.checked,
                                            )
                                        }
                                        className="size-4"
                                    />
                                    Remove current picture
                                </label>
                            )}
                        </div>
                    </div>
                    {form.errors.photo && (
                        <p role="alert" className="text-sm text-destructive">
                            {form.errors.photo}
                        </p>
                    )}
                    <Field label="Name *" error={form.errors.name}>
                        <input
                            required
                            maxLength={120}
                            value={form.data.name}
                            onChange={(e) =>
                                form.setData('name', e.target.value)
                            }
                            className={inputCls}
                        />
                    </Field>
                    <Field label="Role *" error={form.errors.role_title}>
                        <input
                            required
                            maxLength={120}
                            value={form.data.role_title}
                            onChange={(e) =>
                                form.setData('role_title', e.target.value)
                            }
                            className={inputCls}
                        />
                    </Field>
                    <Field
                        label="Description"
                        error={form.errors.description}
                        hint={`${form.data.description.length}/400`}
                    >
                        <textarea
                            rows={4}
                            maxLength={400}
                            value={form.data.description}
                            onChange={(e) =>
                                form.setData('description', e.target.value)
                            }
                            className={inputCls}
                        />
                    </Field>
                    <DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => onOpenChange(false)}
                        >
                            Cancel
                        </Button>
                        <Button type="submit" disabled={form.processing}>
                            {form.processing ? 'Saving…' : 'Save'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}

export default function TeamCard({ m }: { m: TeamMember }) {
    const isAdmin = Boolean(
        (usePage().props as { auth?: { isAdmin?: boolean } }).auth?.isAdmin,
    );
    const [editing, setEditing] = useState(false);

        return (
        <div className="group relative mx-auto -my-8 h-[29rem] w-full max-w-xs">
            {/* Photo slide: keeps its full size, only moves up on hover */}
            <div
                tabIndex={0}
                aria-label={`${m.name}, ${m.role_title}`}
                className="absolute inset-x-0 top-0 z-10 h-[20rem] translate-y-[4.5rem] overflow-hidden rounded-t-2xl bg-ocean transition-transform duration-200 ease-out outline-none group-focus-within:translate-y-0 group-hover:translate-y-0"
            >
                {m.photo ? (
                    <img
                        src={m.photo}
                        alt={m.name}
                        className="size-full object-cover"
                    />
                ) : (
                    <span className="grid size-full place-items-center text-white">
                        <UserRound className="size-20" strokeWidth={1.25} />
                    </span>
                )}
            </div>

            {/* Text slide: hidden behind the photo, slides down to the bottom on hover */}
            <div className="absolute inset-x-0 top-[20rem] h-[9rem] -translate-y-[4.5rem] rounded-b-2xl border bg-card px-5 pt-4 pb-8 text-center shadow-xl transition-transform duration-800 ease-out group-focus-within:translate-y-0 group-hover:translate-y-0">
                <h3 className="font-serif text-xl">{m.name}</h3>
                <p className="text-xs font-semibold tracking-wide text-ocean uppercase">
                    {m.role_title}
                </p>
                <p className="mt-2 line-clamp-2 text-sm leading-5 text-muted-foreground">
                    {m.description}
                </p>
                <span className="absolute bottom-3 left-1/2 h-1 w-8 -translate-x-1/2 rounded bg-coral" />
            </div>

            {isAdmin && (
                <>
                    <button
                        type="button"
                        onClick={() => setEditing(true)}
                        aria-label={`Edit ${m.name}`}
                        className="absolute top-2 right-2 z-20 grid size-9 place-items-center rounded-full bg-card/90 text-foreground shadow transition hover:bg-card focus-visible:ring-2 focus-visible:ring-ocean focus-visible:outline-none"
                    >
                        <Pencil className="size-4" />
                    </button>
                    {editing && (
                        <EditDialog
                            m={m}
                            open={editing}
                            onOpenChange={setEditing}
                        />
                    )}
                </>
            )}
        </div>
    );
}
