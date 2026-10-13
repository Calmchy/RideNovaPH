import { router } from '@inertiajs/react';
import { useEffect } from 'react';
import { toast } from 'sonner';
import type { FlashToast } from '@/types/ui';

export function useFlashToast(): void {
    // Business-rule errors (not tied to a form field) arrive as validation errors under these keys,
    // e.g. "A completed booking can't be cancelled". Field errors stay inline in their forms.
    useEffect(() => {
        return router.on('error', (event) => {
            const errors = (event as CustomEvent).detail?.errors as
                Record<string, string> | undefined;
            const key = ['status', 'trip', 'refund'].find((k) => errors?.[k]);

            if (key && errors) {
                toast.error(errors[key]);
            }
        });
    }, []);

    useEffect(() => {
        return router.on('flash', (event) => {
            const flash = (event as CustomEvent).detail?.flash;
            const data = flash?.toast as FlashToast | undefined;

            if (!data) {
                return;
            }

            toast[data.type](data.message);
        });
    }, []);
}
