import { useEffect, useRef, useCallback } from 'react';
import { useWebRTCEngine } from '../../contexts/WebRTCContext';

// --- Particle definition ---
interface Particle {
  emoji: string;
  x: number;
  y: number;
  vx: number;        // horizontal drift velocity
  vy: number;        // vertical rise velocity (negative = upward)
  size: number;      // font size in px
  opacity: number;
  life: number;      // 0..1, decrements each frame
  decay: number;     // rate of life decay per frame
  wiggle: number;    // sine wiggle amplitude
  wiggleSpeed: number;
  phase: number;     // sine phase offset
}

// --- Constants ---
const DESKTOP_MAX_SIZE = 32;
const MOBILE_MAX_SIZE = 20;
const MOBILE_MAX_PARTICLES = 20;
const DESKTOP_MAX_PARTICLES = 80;
const FADE_OUT_TOP_RATIO = 0.15;     // fade out in top 15% of canvas
const FADE_OUT_BOTTOM_RATIO = 0.10;  // fade out in bottom 10% (near controls)

function isMobileDevice() {
  return typeof window !== 'undefined' && window.innerWidth < 768;
}

export default function ReactionLayer() {
  const engine = useWebRTCEngine();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const rafRef = useRef<number>(0);
  const isRunningRef = useRef(false);

  const maxSize = isMobileDevice() ? MOBILE_MAX_SIZE : DESKTOP_MAX_SIZE;
  const maxParticles = isMobileDevice() ? MOBILE_MAX_PARTICLES : DESKTOP_MAX_PARTICLES;

  // Spawn a new particle from the bottom-center area
  const spawnParticle = useCallback((emoji: string) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Enforce particle cap
    if (particlesRef.current.length >= maxParticles) {
      // Remove oldest particle to make room
      particlesRef.current.shift();
    }

    const w = canvas.width;
    const h = canvas.height;

    // Random size with 0.8-1.2 variation
    const sizeVariation = 0.8 + Math.random() * 0.4;
    const size = Math.round(maxSize * sizeVariation);

    // Spawn in the bottom 25%, spread across center 60% of width
    const spawnX = w * 0.2 + Math.random() * w * 0.6;
    const spawnY = h * 0.75 + Math.random() * h * 0.1;

    const particle: Particle = {
      emoji,
      x: spawnX,
      y: spawnY,
      vx: (Math.random() - 0.5) * 0.3,       // very slight horizontal drift
      vy: -(1.2 + Math.random() * 1.5),        // upward velocity
      size,
      opacity: 1,
      life: 1,
      decay: 0.003 + Math.random() * 0.002,   // ~3-4 seconds lifetime
      wiggle: 8 + Math.random() * 20,          // pixels of sine wiggle
      wiggleSpeed: 0.02 + Math.random() * 0.03,
      phase: Math.random() * Math.PI * 2,
    };

    particlesRef.current.push(particle);

    // Start the render loop if not already running
    if (!isRunningRef.current) {
      isRunningRef.current = true;
      rafRef.current = requestAnimationFrame(renderLoop);
    }
  }, [maxParticles, maxSize]);

  // --- Main render loop ---
  const renderLoop = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;

    // Clear
    ctx.clearRect(0, 0, w, h);

    const particles = particlesRef.current;
    const alive: Particle[] = [];

    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];

      // Update physics
      p.life -= p.decay;
      p.y += p.vy;
      p.x += p.vx + Math.sin(p.phase) * p.wiggle * 0.02;
      p.phase += p.wiggleSpeed;

      // Skip dead particles
      if (p.life <= 0 || p.y < -p.size) continue;

      // Calculate opacity: base life + edge fading
      let alpha = p.life;

      // Fade near top edge (pill margin)
      const topFadeZone = h * FADE_OUT_TOP_RATIO;
      if (p.y < topFadeZone) {
        alpha *= p.y / topFadeZone;
      }

      // Fade near bottom edge (control bar margin)
      const bottomFadeStart = h * (1 - FADE_OUT_BOTTOM_RATIO);
      if (p.y > bottomFadeStart) {
        alpha *= 1 - (p.y - bottomFadeStart) / (h * FADE_OUT_BOTTOM_RATIO);
      }

      alpha = Math.max(0, Math.min(1, alpha));
      if (alpha < 0.01) continue;

      p.opacity = alpha;

      // Draw emoji
      ctx.globalAlpha = alpha;
      ctx.font = `${p.size}px serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(p.emoji, p.x, p.y);

      alive.push(p);
    }

    ctx.globalAlpha = 1;
    particlesRef.current = alive;

    // Continue loop only if particles exist
    if (alive.length > 0) {
      rafRef.current = requestAnimationFrame(renderLoop);
    } else {
      isRunningRef.current = false;
    }
  }, []);

  // --- Resize handler ---
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      const ctx = canvas.getContext('2d');
      if (ctx) ctx.scale(dpr, dpr);
    };

    resize();
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, []);

  // --- Subscribe to engine reaction events ---
  useEffect(() => {
    const handleReaction = (data: { from: string; emoji: string }) => {
      spawnParticle(data.emoji);
    };
    return engine.on('reaction', handleReaction);
  }, [engine, spawnParticle]);

  // --- Cleanup on unmount ---
  useEffect(() => {
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none z-[60]"
      style={{ willChange: 'transform' }}
      aria-hidden="true"
    />
  );
}
