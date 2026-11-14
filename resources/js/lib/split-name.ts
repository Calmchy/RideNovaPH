/** Account names are saved as "First M. Last". Split that back into name boxes; anything else is left blank. */
export function splitName(full: string | null | undefined) {
    const blank = { last: '', first: '', middle: '', ext: '' };
    const t = (full ?? '').trim().split(/\s+/).filter(Boolean);

    if (t.length === 2) {
        return { ...blank, first: t[0], last: t[1] };
    }

    if (t.length >= 3 && /^[A-Za-z]\.?$/.test(t[1])) {
        return {
            ...blank,
            first: t[0],
            middle: t[1].replace('.', '').toUpperCase(),
            last: t.slice(2).join(' '),
        };
    }

    return blank;
}
