import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';

interface AnimatedBackgroundProps {
  children: React.ReactNode;
  color?: string;
  glow?: boolean;
  particleCountOverride?: number | null;
  showBlobs?: boolean;
}

const AnimatedBackground: React.FC<AnimatedBackgroundProps> = ({
  children,
  color = '59,130,246', // Tailwind blue
  glow = true,
  particleCountOverride = null,
  showBlobs = true
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    let animationFrameId: number;
    let particles: Array<{
      x: number;
      y: number;
      size: number;
      speedX: number;
      speedY: number;
      life: number;
      opacity: number;
      hue: number;
    }> = [];

    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    const createParticle = (x: number, y: number) => ({
      x,
      y,
      size: Math.random() * 2 + 1,
      speedX: Math.random() * 2 - 1,
      speedY: Math.random() * 2 - 1,
      life: Math.random() * 0.5 + 0.5,
      opacity: Math.random() * 0.5 + 0.3,
      hue: 210 + Math.random() * 30 // Slight hue variation
    });

    const initParticles = () => {
      particles = [];
      const baseCount = Math.floor((canvas.width * canvas.height) / (window.innerWidth < 768 ? 30000 : 15000));
      const particleCount = particleCountOverride ?? Math.min(baseCount, 100);
      
      for (let i = 0; i < particleCount; i++) {
        particles.push(createParticle(
          Math.random() * canvas.width,
          Math.random() * canvas.height
        ));
      }
    };

    const drawParticle = (p: typeof particles[0]) => {
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      if (glow) {
        ctx.shadowColor = `rgba(${color}, ${p.opacity})`;
        ctx.shadowBlur = 10;
      } else {
        ctx.shadowBlur = 0;
      }
      ctx.fillStyle = `hsla(${p.hue}, 100%, 60%, ${p.opacity * p.life})`;
      ctx.fill();
    };

    const drawConnections = () => {
      const connectionDistance = 150;

      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const distance = Math.sqrt(dx * dx + dy * dy);

          if (distance < connectionDistance) {
            const intensity = 1 - distance / connectionDistance;
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.strokeStyle = `rgba(${color}, ${0.15 * intensity})`;
            ctx.lineWidth = intensity * 1.2;
            ctx.stroke();
          }
        }
      }
    };

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      particles.forEach((p, i) => {
        p.x += p.speedX;
        p.y += p.speedY;
        p.life -= 0.001;

        // Edge bounce
        if (p.x < 0 || p.x > canvas.width) p.speedX *= -1;
        if (p.y < 0 || p.y > canvas.height) p.speedY *= -1;

        if (p.life <= 0) {
          particles[i] = createParticle(
            Math.random() * canvas.width,
            Math.random() * canvas.height
          );
        }

        drawParticle(p);
      });

      drawConnections();
      animationFrameId = requestAnimationFrame(animate);
    };

    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      setMousePos({ x, y });

      particles.forEach(p => {
        const dx = x - p.x;
        const dy = y - p.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const maxDist = 100;

        if (dist < maxDist) {
          const force = (maxDist - dist) / maxDist;
          p.speedX -= (dx / dist) * force * 0.5;
          p.speedY -= (dy / dist) * force * 0.5;
        }
      });
    };

    resizeCanvas();
    initParticles();
    animate();

    window.addEventListener('resize', () => {
      resizeCanvas();
      initParticles();
    });
    canvas.addEventListener('mousemove', handleMouseMove);

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', resizeCanvas);
      canvas.removeEventListener('mousemove', handleMouseMove);
    };
  }, [color, glow, particleCountOverride]);

  return (
    <div className="min-h-screen relative overflow-hidden bg-gradient-to-br from-gray-900 via-gray-800 to-blue-900">
      {/* Optional Parallax Glow Layer */}
      <div
        className="absolute inset-0 pointer-events-none z-0"
        style={{
          transform: `translate(${mousePos.x * 0.01}px, ${mousePos.y * 0.01}px)`,
          background: 'radial-gradient(circle at center, rgba(255,255,255,0.01), transparent)',
        }}
      />

      {/* Glowy floating blobs */}
      {showBlobs && (
        <>
          <div className="absolute w-[30rem] h-[30rem] bg-blue-500/10 rounded-full blur-3xl top-[20%] left-[10%] animate-pulse z-0" />
          <div className="absolute w-[25rem] h-[25rem] bg-pink-500/10 rounded-full blur-3xl bottom-[10%] right-[15%] animate-pulse z-0" />
        </>
      )}

      {/* Fade-in Canvas */}
      <motion.canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full"
        style={{ filter: 'blur(1px)' }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1.5, ease: 'easeOut' }}
      />

      {/* Page content */}
      <div className="relative z-10">{children}</div>
    </div>
  );
};

export default AnimatedBackground;