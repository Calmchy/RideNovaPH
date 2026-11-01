// Glowing gradient glass card (after Kodplay's CodePen). Everything lives in this one file.
//  - two skewed gradient layers sit behind a frosted-glass panel (backdrop-filter);
//  - on hover the skew straightens, the layers spread and a blurred glow appears;
//  - two glass orbs fade in at the corners, and the whole card floats slowly up and down.
import type { ReactNode } from 'react';

const css = `
.glow-hero { position: relative; isolation: isolate; border-radius: 1.5rem; animation: glow-float 6s ease-in-out infinite; }
.glow-hero::before, .glow-hero::after {
  content: ''; position: absolute; z-index: 0; border-radius: 1.5rem;
  top: -14px; bottom: -14px; left: 36px; right: 36px;
  background: linear-gradient(315deg, var(--brand-ocean), var(--brand-coral));
  transform: skewX(6deg);
  transition: top .5s, bottom .5s, left .5s, right .5s, transform .5s;
}
.glow-hero::after { filter: blur(30px); opacity: .85; }
.glow-hero:hover::before, .glow-hero:hover::after {
  top: -8px; bottom: -8px; left: -8px; right: -8px; transform: skewX(0deg);
}
.glow-hero__glass {
  position: relative; z-index: 2; overflow: hidden; border-radius: 1.5rem;
  background: rgba(3, 40, 52, 0.62);
  -webkit-backdrop-filter: blur(16px); backdrop-filter: blur(16px);
  border: 1px solid rgba(255, 255, 255, 0.14);
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.35);
}
.glow-hero__orb {
  position: absolute; z-index: 3; width: 90px; height: 90px; border-radius: 50%; pointer-events: none;
  background: rgba(255, 255, 255, 0.12);
  -webkit-backdrop-filter: blur(10px); backdrop-filter: blur(10px);
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.25);
  opacity: 0; transition: opacity .5s, transform .5s;
}
.glow-hero__orb--a { top: 0; left: 0; transform: translate(-30%, -30%) scale(.6); }
.glow-hero__orb--b { bottom: 0; right: 0; width: 70px; height: 70px; transform: translate(30%, 30%) scale(.6); }
.glow-hero:hover .glow-hero__orb { opacity: 1; animation: glow-orb 4s ease-in-out infinite; }
.glow-hero:hover .glow-hero__orb--a { transform: translate(-45%, -45%) scale(1); }
.glow-hero:hover .glow-hero__orb--b { transform: translate(45%, 45%) scale(1); animation-delay: -2s; }
@keyframes glow-float { 0%, 100% { transform: translateY(-6px); } 50% { transform: translateY(6px); } }
@keyframes glow-orb { 0%, 100% { margin: 0; } 50% { margin: 10px; } }
@media (prefers-reduced-motion: reduce) {
  .glow-hero, .glow-hero__orb { animation: none !important; }
}
`;

export default function GlowHero({ children }: { children: ReactNode }) {
    return (
        <header className="glow-hero">
            <style>{css}</style>
            <span className="glow-hero__orb glow-hero__orb--a" />
            <span className="glow-hero__orb glow-hero__orb--b" />
            <div className="glow-hero__glass p-8 text-foam md:p-14">
                {children}
            </div>
        </header>
    );
}
