import type { ImgHTMLAttributes } from 'react';

export default function AppLogoIcon(
    props: ImgHTMLAttributes<HTMLImageElement>,
) {
    return (
        <img
            {...props}
            src="/carpull1.png"
            alt="Pull-A-Part logo"
            className={`object-contain ${props.className ?? ''}`}
        />
    );
}
