import { useEffect, useRef } from 'react';

interface Particle {
  x: number;
  y: number;
  r: number;
  vx: number;
  vy: number;
  rot: number;
  vr: number;
  kind: 'dust' | 'petal';
  alpha: number;
  phase: number;
}

/** Nền: bụi vàng lấp lánh và cánh hoa rơi nhẹ. */
export function Ambient() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current!;
    const ctx = canvas.getContext('2d')!;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let w = 0;
    let h = 0;
    let raf = 0;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let particles: Particle[] = [];

    const spawn = (initial: boolean): Particle => {
      const petal = Math.random() < 0.28;
      return {
        x: Math.random() * w,
        y: initial ? Math.random() * h : -20,
        r: petal ? 4 + Math.random() * 5 : 0.6 + Math.random() * 1.6,
        vx: (Math.random() - 0.5) * 0.25,
        vy: petal ? 0.25 + Math.random() * 0.45 : 0.05 + Math.random() * 0.2,
        rot: Math.random() * Math.PI * 2,
        vr: (Math.random() - 0.5) * 0.02,
        kind: petal ? 'petal' : 'dust',
        alpha: petal ? 0.18 + Math.random() * 0.25 : 0.25 + Math.random() * 0.6,
        phase: Math.random() * Math.PI * 2,
      };
    };

    const resize = () => {
      w = window.innerWidth;
      h = window.innerHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const count = Math.round(Math.min(90, (w * h) / 16000));
      particles = Array.from({ length: count }, () => spawn(true));
    };

    const drawPetal = (p: Particle) => {
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.scale(1, 0.6 + 0.4 * Math.sin(p.phase));
      const g = ctx.createLinearGradient(-p.r, 0, p.r, 0);
      g.addColorStop(0, `rgba(240, 180, 190, ${p.alpha})`);
      g.addColorStop(1, `rgba(255, 220, 215, ${p.alpha * 0.6})`);
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(0, -p.r);
      ctx.bezierCurveTo(p.r, -p.r, p.r, p.r * 0.6, 0, p.r);
      ctx.bezierCurveTo(-p.r, p.r * 0.6, -p.r, -p.r, 0, -p.r);
      ctx.fill();
      ctx.restore();
    };

    const frame = (t: number) => {
      ctx.clearRect(0, 0, w, h);
      for (const p of particles) {
        p.phase += 0.015;
        p.x += p.vx + Math.sin(p.phase) * (p.kind === 'petal' ? 0.35 : 0.08);
        p.y += p.vy;
        p.rot += p.vr;
        if (p.y > h + 20 || p.x < -30 || p.x > w + 30) Object.assign(p, spawn(false));
        if (p.kind === 'dust') {
          const tw = 0.55 + 0.45 * Math.sin(t / 700 + p.phase * 3);
          ctx.beginPath();
          ctx.fillStyle = `rgba(236, 205, 150, ${p.alpha * tw})`;
          ctx.shadowColor = 'rgba(236, 205, 150, 0.8)';
          ctx.shadowBlur = 6;
          ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
          ctx.fill();
          ctx.shadowBlur = 0;
        } else {
          drawPetal(p);
        }
      }
      raf = requestAnimationFrame(frame);
    };

    resize();
    window.addEventListener('resize', resize);
    if (reduce) frame(0);
    else raf = requestAnimationFrame(frame);
    if (reduce) cancelAnimationFrame(raf);

    const onVis = () => {
      cancelAnimationFrame(raf);
      if (!document.hidden && !reduce) raf = requestAnimationFrame(frame);
    };
    document.addEventListener('visibilitychange', onVis);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, []);

  return (
    <div className="ambient" aria-hidden>
      <div className="ambient__orb ambient__orb--1" />
      <div className="ambient__orb ambient__orb--2" />
      <div className="ambient__orb ambient__orb--3" />
      <canvas ref={ref} className="ambient__canvas" />
      <div className="ambient__grain" />
    </div>
  );
}
