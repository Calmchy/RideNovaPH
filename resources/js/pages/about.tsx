import { Head } from '@inertiajs/react';
import { PlaceholderPattern } from '@/components/ui/placeholder-pattern';
import { CarTaxiFront , Folder, LayoutGrid, Menu, Search, Info } from 'lucide-react';
import { about } from '@/routes';

export default function About() {
    return (
        <>

        </>
    );
}

About.layout = {
    breadcrumbs: [
        {
            title: 'About',
            href: about(),
        },
    ],
};
