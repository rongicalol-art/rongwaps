import { motion } from 'motion/react';

interface ConfettiParticle {
  id: number;
  x: number;
  y: number;
  rotation: number;
  color: string;
  size: number;
  delay: number;
  shape: 'rect' | 'circle';
}

const CONFETTI_PIECES: ConfettiParticle[] = [
  { id: 1, x: -115, y: -80, rotation: 45, color: '#0284c7', size: 8, delay: 0.04, shape: 'rect' },
  { id: 2, x: 115, y: -75, rotation: -30, color: '#ea580c', size: 9, delay: 0.08, shape: 'circle' },
  { id: 3, x: -85, y: -140, rotation: 60, color: '#58cc02', size: 8, delay: 0.12, shape: 'rect' },
  { id: 4, x: 90, y: -130, rotation: -45, color: '#ffc800', size: 9, delay: 0.06, shape: 'rect' },
  { id: 5, x: -135, y: 15, rotation: 25, color: '#ff4b4b', size: 7, delay: 0.14, shape: 'circle' },
  { id: 6, x: 135, y: 20, rotation: -20, color: '#0284c7', size: 8, delay: 0.1, shape: 'rect' },
  { id: 7, x: -50, y: -160, rotation: 80, color: '#ea580c', size: 8, delay: 0.15, shape: 'circle' },
  { id: 8, x: 55, y: -155, rotation: -60, color: '#58cc02', size: 9, delay: 0.09, shape: 'rect' },
  { id: 9, x: -125, y: 90, rotation: 35, color: '#ffc800', size: 7, delay: 0.17, shape: 'rect' },
  { id: 10, x: 120, y: 95, rotation: -40, color: '#58cc02', size: 8, delay: 0.13, shape: 'circle' },
  { id: 11, x: -25, y: -175, rotation: 15, color: '#0284c7', size: 8, delay: 0.11, shape: 'rect' },
  { id: 12, x: 30, y: -170, rotation: -10, color: '#ea580c', size: 8, delay: 0.12, shape: 'rect' },
];

export function ConfettiBurst() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-visible" aria-hidden="true">
      {CONFETTI_PIECES.map((p) => (
        <motion.div
          key={p.id}
          initial={{ opacity: 0, scale: 0, x: 0, y: 0 }}
          animate={{
            opacity: [0, 1, 1, 0],
            scale: [0, 1.2, 1, 0.6],
            x: p.x,
            y: p.y,
            rotate: p.rotation,
          }}
          transition={{
            duration: 1.3,
            delay: p.delay,
            ease: [0.16, 1, 0.3, 1],
          }}
          style={{
            position: 'absolute',
            top: '20%',
            left: '50%',
            width: p.size,
            height: p.shape === 'rect' ? p.size * 1.5 : p.size,
            backgroundColor: p.color,
            borderRadius: p.shape === 'circle' ? '9999px' : '3px',
          }}
        />
      ))}
    </div>
  );
}
