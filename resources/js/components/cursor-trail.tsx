// A soft glow that follows the mouse and leaves a fading trail of light behind it.
// Purely decorative: it ignores the mouse (pointer-events-none), is skipped on touch screens and for people
// who asked for reduced motion, and stops drawing as soon as the mouse stops and the tracks have faded.
import { useEffect, useRef } from 'react';

type Stamp = { x: number; y: number; a: number; born: number };

const STEP = 5; // px of travel between two light dots
const LIFE = 900; // ms a dot of light stays visible

export default function CursorTrail() {
    const ref = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = ref.current;

        // Skip only on real touch screens (no mouse to follow).
        if (!canvas || window.matchMedia('(pointer: coarse)').matches) {
            return;
        }

        const ctx = canvas.getContext('2d');

        if (!ctx) {
            return;
        }

        let w = 0;
        let h = 0;
        const resize = () => {
            const dpr = window.devicePixelRatio || 1;
            w = window.innerWidth;
            h = window.innerHeight;
            canvas.width = w * dpr;
            canvas.height = h * dpr;
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        };
        resize();

        const stamps: Stamp[] = [];
        let tx = -999; // where the mouse is
        let ty = -999;
        let gx = -999; // the glow eases toward it
        let gy = -999;
        let lx = 0; // last stamp position
        let ly = 0;
        let hasLast = false;
        let active = 0; // timestamp until which the glow stays on
        let raf = 0;

        const draw = (now: number) => {
            raf = 0;
            ctx.clearRect(0, 0, w, h);
            const dark = document.documentElement.classList.contains('dark');

            // Light trail: soft dots that shrink and fade, glowing where they overlap.
            while (stamps.length && now - stamps[0].born > LIFE) {
                stamps.shift();
            }

            ctx.globalCompositeOperation = dark ? 'lighter' : 'source-over';

            for (const s of stamps) {
                const life = 1 - (now - s.born) / LIFE;
                const r = 6 + 22 * life;
                const g = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, r);
                g.addColorStop(0, `rgba(120, 220, 255, ${0.3 * life})`);
                g.addColorStop(1, 'rgba(0, 160, 200, 0)');
                ctx.fillStyle = g;
                ctx.fillRect(s.x - r, s.y - r, r * 2, r * 2);
            }

            ctx.globalCompositeOperation = 'source-over';

            // Glow
            gx += (tx - gx) * 0.2;
            gy += (ty - gy) * 0.2;
            const glowOn = now < active;

            if (glowOn) {
                const g = ctx.createRadialGradient(gx, gy, 0, gx, gy, 130);
                g.addColorStop(0, dark ? 'rgba(0,160,200,0.16)' : 'rgba(0,140,180,0.12)');
                g.addColorStop(0.5, dark ? 'rgba(0,160,200,0.05)' : 'rgba(0,140,180,0.04)');
                g.addColorStop(1, 'rgba(0,160,200,0)');
                ctx.fillStyle = g;
                ctx.fillRect(gx - 130, gy - 130, 260, 260);
            }

            if (stamps.length || glowOn) {
                raf = requestAnimationFrame(draw);
            }
        };

        const kick = () => {
            if (!raf) {
                raf = requestAnimationFrame(draw);
            }
        };

        const move = (e: MouseEvent) => {
            tx = e.clientX;
            ty = e.clientY;
            const now = performance.now();
            active = now + 700;

            if (!hasLast) {
                gx = tx;
                gy = ty;
                lx = tx;
                ly = ty;
                hasLast = true;
            }

            const dx = tx - lx;
            const dy = ty - ly;

            if (Math.hypot(dx, dy) >= STEP) {
                stamps.push({ x: tx, y: ty, a: Math.atan2(dy, dx), born: now });
                lx = tx;
                ly = ty;
            }

            kick();
        };

        const leave = () => {
            active = 0;
            hasLast = false;
            kick();
        };

        window.addEventListener('mousemove', move, { passive: true });
        document.addEventListener('mouseleave', leave);
        window.addEventListener('resize', resize);

        return () => {
            window.removeEventListener('mousemove', move);
            document.removeEventListener('mouseleave', leave);
            window.removeEventListener('resize', resize);
            cancelAnimationFrame(raf);
        };
    }, []);

    return (
        <canvas
            ref={ref}
            aria-hidden="true"
            className="pointer-events-none fixed inset-0 z-30 size-full"
        />
    );
}
