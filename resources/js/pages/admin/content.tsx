// Admin > Content: homepage/dashboard slideshow banners and the announcements (exam schedules) board.
import { Head, router, useForm } from '@inertiajs/react';
import { Eye, EyeOff, Pencil, Trash2 } from 'lucide-react';
import { useState } from 'react';
import {
    EmptyState,
    Field,
    inputCls,
    PageHeader,
    Panel,
    ReasonDialog,
} from '@/components/kit';
import { fmtDate, StatusBadge } from '@/components/lux';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';

type Props = {
    banners: {
        id: number;
        title: string;
        caption: string | null;
        link_url: string | null;
        is_active: boolean;
        display_order?: number;
        image_url: string;
    }[];
    announcements: {
        id: number;
        title: string;
        body: string;
        category: string;
        category_id: number;
        city_id: number | null;
        city: string | null;
        exam_date: string | null;
        is_published: boolean;
    }[];
    categories: { id: number; name: string }[];
    cities: { id: number; name: string }[];
};

export default function AdminContent({
    banners,
    announcements,
    categories,
    cities,
}: Props) {
    const banner = useForm<{
        title: string;
        caption: string;
        link_url: string;
        image: File | null;
    }>({ title: '', caption: '', link_url: '', image: null });
    const note = useForm({
        category_id: '',
        city_id: '',
        title: '',
        body: '',
        exam_date: '',
    });

    // Which item is being edited (null = the form is in "add" mode), and which confirm dialog is open.
    const [editBanner, setEditBanner] = useState<number | null>(null);
    const [editNote, setEditNote] = useState<number | null>(null);
    const [confirm, setConfirm] = useState<'banner' | 'note' | null>(null);

    /** Load a banner into the form so it can be changed after posting. */
    const startEditBanner = (b: Props['banners'][number]) => {
        setEditBanner(b.id);
        banner.setData({
            title: b.title,
            caption: b.caption ?? '',
            link_url: b.link_url ?? '',
            image: null,
        });
        banner.clearErrors();
    };
    const cancelBanner = () => {
        setEditBanner(null);
        banner.reset();
        banner.clearErrors();
    };

    /** Load an announcement into the form. */
    const startEditNote = (a: Props['announcements'][number]) => {
        setEditNote(a.id);
        note.setData({
            category_id: String(a.category_id),
            city_id: a.city_id ? String(a.city_id) : '',
            title: a.title,
            body: a.body,
            exam_date: a.exam_date ?? '',
        });
        note.clearErrors();
    };
    const cancelNote = () => {
        setEditNote(null);
        note.reset();
        note.clearErrors();
    };

    /** Runs only AFTER the admin confirms in the dialog. */
    const saveBanner = () => {
        const done = {
            forceFormData: true,
            preserveScroll: true,
            onSuccess: () => cancelBanner(),
        };
        // Edit = POST /admin/banners/{id} (image optional). Add = POST /admin/banners.
        banner.post(
            editBanner ? `/admin/banners/${editBanner}` : '/admin/banners',
            done,
        );
    };
    const saveNote = () => {
        const done = { preserveScroll: true, onSuccess: () => cancelNote() };

        if (editNote) {
            note.put(`/admin/announcements/${editNote}`, done);
        } else {
            note.post('/admin/announcements', done);
        }
    };

    return (
        <>
            <Head title="Content" />
            <PageHeader
                title="Content"
                description="What visitors see in the slideshow and the announcements board."
            />

            <div className="grid gap-6 lg:grid-cols-[1fr_22rem]">
                <Panel title="Slideshow banners">
                    {banners.length ? (
                        <ul className="divide-y">
                            {banners.map((b) => (
                                <li
                                    key={b.id}
                                    className="flex items-center gap-4 p-4"
                                >
                                    <img
                                        src={b.image_url}
                                        alt=""
                                        className="h-14 w-24 rounded-lg object-cover"
                                        loading="lazy"
                                    />
                                    <div className="min-w-0 flex-1">
                                        <p className="truncate font-medium">
                                            {b.title}
                                        </p>
                                        <p className="truncate text-xs text-muted-foreground">
                                            {b.caption}
                                        </p>
                                    </div>
                                    <StatusBadge
                                        status={b.is_active ? 'active' : 'void'}
                                    />
                                    <Button
                                        size="icon"
                                        variant="ghost"
                                        aria-label="Edit banner"
                                        onClick={() => startEditBanner(b)}
                                    >
                                        <Pencil />
                                    </Button>
                                    <Button
                                        size="icon"
                                        variant="ghost"
                                        aria-label={
                                            b.is_active
                                                ? 'Hide banner'
                                                : 'Show banner'
                                        }
                                        onClick={() =>
                                            router.patch(
                                                `/admin/banners/${b.id}`,
                                                {},
                                                { preserveScroll: true },
                                            )
                                        }
                                    >
                                        {b.is_active ? <EyeOff /> : <Eye />}
                                    </Button>
                                    <ReasonDialog
                                        title="Delete this banner?"
                                        askReason={false}
                                        confirmLabel="Delete"
                                        destructive
                                        onConfirm={() =>
                                            router.delete(
                                                `/admin/banners/${b.id}`,
                                                { preserveScroll: true },
                                            )
                                        }
                                        trigger={
                                            <Button
                                                size="icon"
                                                variant="ghost"
                                                aria-label="Delete banner"
                                            >
                                                <Trash2 />
                                            </Button>
                                        }
                                    />
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <div className="p-5">
                            <EmptyState>
                                No banners yet. The dashboard shows default
                                slides until you add one.
                            </EmptyState>
                        </div>
                    )}
                </Panel>
                <Panel
                    title={editBanner ? 'Edit banner' : 'Add a banner'}
                    className="h-fit"
                >
                    <form
                        onSubmit={(e) => {
                            e.preventDefault();
                            setConfirm('banner'); // ask first, save on confirm
                        }}
                        className="grid gap-4 p-5"
                    >
                        <Field label="Title" error={banner.errors.title}>
                            <input
                                required
                                maxLength={100}
                                value={banner.data.title}
                                onChange={(e) =>
                                    banner.setData('title', e.target.value)
                                }
                                className={inputCls}
                            />
                        </Field>
                        <Field label="Caption" error={banner.errors.caption}>
                            <input
                                maxLength={255}
                                value={banner.data.caption}
                                onChange={(e) =>
                                    banner.setData('caption', e.target.value)
                                }
                                className={inputCls}
                            />
                        </Field>
                        <Field
                            label="Link (on this site)"
                            hint="e.g. /bookings?tab=find"
                            error={banner.errors.link_url}
                        >
                            <input
                                value={banner.data.link_url}
                                onChange={(e) =>
                                    banner.setData('link_url', e.target.value)
                                }
                                className={inputCls}
                            />
                        </Field>
                        <Field
                            label="Image (JPG, PNG, WebP · max 5 MB)"
                            error={banner.errors.image}
                        >
                            <input
                                required={!editBanner}
                                type="file"
                                accept="image/jpeg,image/png,image/webp"
                                onChange={(e) =>
                                    banner.setData(
                                        'image',
                                        e.target.files?.[0] ?? null,
                                    )
                                }
                                className={inputCls}
                            />
                        </Field>
                        {editBanner && (
                            <p className="text-xs text-muted-foreground">
                                Leave the image empty to keep the current one.
                            </p>
                        )}
                        <div className="flex gap-2">
                            <Button type="submit" disabled={banner.processing}>
                                {editBanner ? 'Save changes' : 'Add banner'}
                            </Button>
                            {editBanner && (
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={cancelBanner}
                                >
                                    Cancel
                                </Button>
                            )}
                        </div>
                    </form>
                </Panel>
            </div>

            <div className="grid gap-6 lg:grid-cols-[1fr_22rem]">
                <Panel title="Announcements & exam schedules">
                    {announcements.length ? (
                        <ul className="divide-y">
                            {announcements.map((a) => (
                                <li
                                    key={a.id}
                                    className="flex items-center gap-3 p-4"
                                >
                                    <div className="min-w-0 flex-1">
                                        <p className="truncate font-medium">
                                            {a.title}
                                        </p>
                                        <p className="text-xs text-muted-foreground">
                                            {[
                                                a.category,
                                                a.city,
                                                a.exam_date &&
                                                    fmtDate(a.exam_date),
                                            ]
                                                .filter(Boolean)
                                                .join(' · ')}
                                        </p>
                                    </div>
                                    <StatusBadge
                                        status={
                                            a.is_published ? 'active' : 'void'
                                        }
                                    />
                                    <Button
                                        size="icon"
                                        variant="ghost"
                                        aria-label="Edit announcement"
                                        onClick={() => startEditNote(a)}
                                    >
                                        <Pencil />
                                    </Button>
                                    <Button
                                        size="icon"
                                        variant="ghost"
                                        aria-label={
                                            a.is_published
                                                ? 'Unpublish'
                                                : 'Publish'
                                        }
                                        onClick={() =>
                                            router.patch(
                                                `/admin/announcements/${a.id}`,
                                                {},
                                                { preserveScroll: true },
                                            )
                                        }
                                    >
                                        {a.is_published ? <EyeOff /> : <Eye />}
                                    </Button>
                                    <ReasonDialog
                                        title="Delete this announcement?"
                                        askReason={false}
                                        confirmLabel="Delete"
                                        destructive
                                        onConfirm={() =>
                                            router.delete(
                                                `/admin/announcements/${a.id}`,
                                                { preserveScroll: true },
                                            )
                                        }
                                        trigger={
                                            <Button
                                                size="icon"
                                                variant="ghost"
                                                aria-label="Delete announcement"
                                            >
                                                <Trash2 />
                                            </Button>
                                        }
                                    />
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <div className="p-5">
                            <EmptyState>No announcements.</EmptyState>
                        </div>
                    )}
                </Panel>
                <Panel
                    title={
                        editNote ? 'Edit announcement' : 'Post an announcement'
                    }
                    className="h-fit"
                >
                    <form
                        onSubmit={(e) => {
                            e.preventDefault();
                            setConfirm('note'); // ask first, post on confirm
                        }}
                        className="grid gap-4 p-5"
                    >
                        <Field label="Category" error={note.errors.category_id}>
                            <select
                                required
                                value={note.data.category_id}
                                onChange={(e) =>
                                    note.setData('category_id', e.target.value)
                                }
                                className={inputCls}
                            >
                                <option value="">Choose…</option>
                                {categories.map((c) => (
                                    <option key={c.id} value={c.id}>
                                        {c.name}
                                    </option>
                                ))}
                            </select>
                        </Field>
                        <Field
                            label="City (optional)"
                            error={note.errors.city_id}
                        >
                            <select
                                value={note.data.city_id}
                                onChange={(e) =>
                                    note.setData('city_id', e.target.value)
                                }
                                className={inputCls}
                            >
                                <option value="">—</option>
                                {cities.map((c) => (
                                    <option key={c.id} value={c.id}>
                                        {c.name}
                                    </option>
                                ))}
                            </select>
                        </Field>
                        <Field label="Title" error={note.errors.title}>
                            <input
                                required
                                maxLength={150}
                                value={note.data.title}
                                onChange={(e) =>
                                    note.setData('title', e.target.value)
                                }
                                className={inputCls}
                            />
                        </Field>
                        <Field label="Details" error={note.errors.body}>
                            <textarea
                                required
                                rows={3}
                                maxLength={2000}
                                value={note.data.body}
                                onChange={(e) =>
                                    note.setData('body', e.target.value)
                                }
                                className={inputCls}
                            />
                        </Field>
                        <Field
                            label="Exam / event date"
                            error={note.errors.exam_date}
                        >
                            <input
                                type="date"
                                value={note.data.exam_date}
                                onChange={(e) =>
                                    note.setData('exam_date', e.target.value)
                                }
                                className={inputCls}
                            />
                        </Field>
                        <div className="flex gap-2">
                            <Button type="submit" disabled={note.processing}>
                                {editNote ? 'Save changes' : 'Post'}
                            </Button>
                            {editNote && (
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={cancelNote}
                                >
                                    Cancel
                                </Button>
                            )}
                        </div>
                    </form>
                </Panel>
            </div>

            {/* Confirmation shown before anything is posted or saved. */}
            <Dialog
                open={confirm !== null}
                onOpenChange={(o) => !o && setConfirm(null)}
            >
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>
                            {confirm === 'banner'
                                ? editBanner
                                    ? 'Save changes to this banner?'
                                    : 'Post this banner?'
                                : editNote
                                  ? 'Save changes to this announcement?'
                                  : 'Post this announcement?'}
                        </DialogTitle>
                        <DialogDescription>
                            {confirm === 'banner'
                                ? 'The slideshow on the dashboard updates right away.'
                                : 'It becomes visible to all users on the announcements board.'}
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => setConfirm(null)}
                        >
                            Back
                        </Button>
                        <Button
                            type="button"
                            onClick={() => {
                                if (confirm === 'banner') {
saveBanner();
}

                                if (confirm === 'note') {
saveNote();
}

                                setConfirm(null);
                            }}
                        >
                            {(confirm === 'banner' ? editBanner : editNote)
                                ? 'Save'
                                : 'Yes, post it'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
