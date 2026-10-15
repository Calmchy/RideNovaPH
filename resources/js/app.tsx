import { createInertiaApp } from '@inertiajs/react';
import ChatbotWidget from '@/components/chatbot-widget';
import { Toaster } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { initializeTheme } from '@/hooks/use-appearance';
import AdminLayout from '@/layouts/admin-layout';
import AppLayout from '@/layouts/app-layout';
import AuthLayout from '@/layouts/auth-layout';
import DriverLayout from '@/layouts/driver-layout';
import SettingsLayout from '@/layouts/settings/layout';

const appName = import.meta.env.VITE_APP_NAME || 'Laravel';

createInertiaApp({
    title: (title) => (title ? `${title} - ${appName}` : appName),
    layout: (name) => {
        switch (true) {
            case name === 'welcome' || name.startsWith('rides/'):
                return null; // public pages bring their own header
            case name.startsWith('admin/'):
                return AdminLayout; // dark sidebar shell for the admin panel
            case name.startsWith('driver/'):
                return [AppLayout, DriverLayout];
            case name === 'transactions/receipt':
                return AppLayout;
            case name.startsWith('auth/'):
                return AuthLayout;
            case name.startsWith('settings/'):
                return [AppLayout, SettingsLayout];
            default:
                return AppLayout;
        }
    },
    strictMode: true,
    withApp(app) {
        return (
            <TooltipProvider delayDuration={0}>
                {app}
                <Toaster />
                {/* Nova chatbot on every page (guests included) */}
                <ChatbotWidget />
            </TooltipProvider>
        );
    },
    progress: {
        color: '#007f9e',
    },
});

// This will set light / dark mode on load...
initializeTheme();
