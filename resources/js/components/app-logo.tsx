import AppLogoIcon from '@/components/app-logo-icon';

/** Brand mark: deep tile with a sand icon, then the wordmark (RideNova in ink, PH in ocean). */
export default function AppLogo() {
    return (
        <>
            <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-deep text-sand">
                <AppLogoIcon className="size-5 fill-current" />
            </div>
            <div className="ml-1 grid flex-1 text-left text-sm">
                <span className="mb-0.5 truncate font-serif text-lg leading-tight font-semibold">
                    RideNova
                    <span className="text-ocean dark:text-foam">PH</span>
                </span>
            </div>
        </>
    );
}
