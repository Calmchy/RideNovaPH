// Holographic hover for cards: a rainbow border and glow, a shimmering gradient that sweeps down over the card,
// and a small zoom. Use it as a class string (HOLO) on any rounded card, and render <HoloStyles /> once per page.
// The look is plain CSS in one place, so every card behaves the same. Reduced-motion users get no zoom or shimmer.

export const HOLO = 'holo-card';

const css = `
.holo-card {
  position: relative; isolation: isolate;
  transition: transform .35s ease, box-shadow .35s ease;
}
/* The shimmer: hidden at rest, slides down and fades in on hover. */
.holo-card::before {
  content: ''; position: absolute; inset: 0; z-index: 1; border-radius: inherit; pointer-events: none;
  background: linear-gradient(115deg,
    transparent 15%, rgba(0, 255, 255, .20) 30%, rgba(255, 0, 200, .17) 42%,
    rgba(255, 230, 0, .17) 54%, rgba(0, 255, 140, .17) 66%, transparent 85%);
  background-size: 260% 260%; background-position: 0% 0%;
  opacity: 0; transform: translateY(-14%);
  transition: opacity .35s ease, transform .55s ease, background-position .9s ease;
}
/* The colourful border: a rainbow ring cut out with a mask. */
.holo-card::after {
  content: ''; position: absolute; inset: -1px; z-index: 2; border-radius: inherit; padding: 2px; pointer-events: none;
  background: linear-gradient(135deg, #00ffff, #ff00c8, #ffe600, #00ff8c, #00ffff);
  background-size: 300% 300%;
  -webkit-mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
  -webkit-mask-composite: xor; mask-composite: exclude;
  opacity: 0; transition: opacity .3s ease;
}
.holo-card:hover {
  z-index: 10; transform: scale(1.04);
  box-shadow: 0 0 22px rgba(0, 255, 255, .45), 0 0 44px rgba(255, 0, 200, .25), 0 12px 32px rgba(0, 0, 0, .4);
}
.holo-card:hover::before { opacity: 1; transform: translateY(0); background-position: 100% 100%; }
.holo-card:hover::after { opacity: 1; animation: holo-border 3s linear infinite; }
@keyframes holo-border { to { background-position: 300% 300%; } }
@media (prefers-reduced-motion: reduce) {
  .holo-card, .holo-card::before { transition: opacity .2s; }
  .holo-card:hover { transform: none; }
  .holo-card:hover::before { transform: none; }
  .holo-card:hover::after { animation: none; }
}
`;

export function HoloStyles() {
    return <style>{css}</style>;
}
