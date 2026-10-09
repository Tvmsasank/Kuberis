import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function KuberisPreloader({ onFinish }) {
  const [isRevealed, setIsRevealed] = useState(false);
  const [isDone, setIsDone] = useState(false);

  const containerRef = useRef(null);
  const svgRef = useRef(null);
  const tracePathRef = useRef(null);
  const canvasRef = useRef(null);

  const leadCoinRef = useRef(null);
  const note1Ref = useRef(null);
  const note2Ref = useRef(null);

  const particlesRef = useRef([]);
  const animFrameIdRef = useRef(null);
  const startTimeRef = useRef(null);

  const ANIM_DURATION = 1500; // 1.5 seconds total trace duration

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const resizeCanvas = () => {
      if (!canvas || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      canvas.width = rect.width;
      canvas.height = rect.height;
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    const spawnSparks = (x, y) => {
      for (let i = 0; i < 4; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 3.5 + 1.5;
        particlesRef.current.push({
          x,
          y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - 1.2,
          size: Math.random() * 3 + 1.5,
          color: Math.random() > 0.4 ? '#FBBF24' : '#10B981',
          alpha: 1,
          life: 0.94
        });
      }
    };

    const updateParticles = () => {
      if (!ctx || !canvas) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const particles = particlesRef.current;

      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.alpha *= p.life;
        p.size *= 0.97;

        ctx.save();
        ctx.globalAlpha = p.alpha;
        ctx.fillStyle = p.color;
        ctx.shadowBlur = 8;
        ctx.shadowColor = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        if (p.alpha < 0.05) {
          particles.splice(i, 1);
        }
      }
    };

    const path = tracePathRef.current;
    if (!path) return;
    const totalLen = path.getTotalLength();
    path.style.strokeDasharray = `${totalLen}`;
    path.style.strokeDashoffset = `${totalLen}`;

    const animate = (timestamp) => {
      if (!startTimeRef.current) startTimeRef.current = timestamp;
      const elapsed = timestamp - startTimeRef.current;
      const progress = Math.min(1, elapsed / ANIM_DURATION);

      // Smooth Cubic Ease
      const ease = progress < 0.5
        ? 4 * progress * progress * progress
        : 1 - Math.pow(-2 * progress + 2, 3) / 2;

      const currentDist = ease * totalLen;
      path.style.strokeDashoffset = `${totalLen - currentDist}`;

      const svg = svgRef.current;
      const container = containerRef.current;
      if (svg && container) {
        const svgRect = svg.getBoundingClientRect();
        const containerRect = container.getBoundingClientRect();
        const scaleX = svgRect.width / 900;
        const scaleY = svgRect.height / 240;

        // Lead Gold Coin position
        const pt = path.getPointAtLength(currentDist);
        const coinX = (svgRect.left - containerRect.left) + pt.x * scaleX;
        const coinY = (svgRect.top - containerRect.top) + pt.y * scaleY;

        if (leadCoinRef.current) {
          leadCoinRef.current.style.transform = `translate(${coinX}px, ${coinY}px)`;
        }

        spawnSparks(coinX, coinY);

        // Trailing ₹500 banknote
        if (note1Ref.current) {
          const ptNote1 = path.getPointAtLength(Math.max(0, currentDist - 40));
          const note1X = (svgRect.left - containerRect.left) + ptNote1.x * scaleX;
          const note1Y = (svgRect.top - containerRect.top) + ptNote1.y * scaleY;
          note1Ref.current.style.transform = `translate(${note1X}px, ${note1Y}px)`;
        }

        // Trailing ₹200 banknote
        if (note2Ref.current) {
          const ptNote2 = path.getPointAtLength(Math.max(0, currentDist - 75));
          const note2X = (svgRect.left - containerRect.left) + ptNote2.x * scaleX;
          const note2Y = (svgRect.top - containerRect.top) + ptNote2.y * scaleY;
          note2Ref.current.style.transform = `translate(${note2X}px, ${note2Y}px)`;
        }
      }

      updateParticles();

      if (progress < 1) {
        animFrameIdRef.current = requestAnimationFrame(animate);
      } else {
        // Complete & Reveal
        setIsRevealed(true);

        // Burst sparks at the final letter
        if (leadCoinRef.current && containerRef.current) {
          const coinRect = leadCoinRef.current.getBoundingClientRect();
          const contRect = containerRef.current.getBoundingClientRect();
          for (let b = 0; b < 30; b++) {
            spawnSparks(coinRect.left - contRect.left + 20, coinRect.top - contRect.top + 20);
          }
        }

        // Fade out floating money entities
        setTimeout(() => {
          if (leadCoinRef.current) leadCoinRef.current.style.opacity = '0';
          if (note1Ref.current) note1Ref.current.style.opacity = '0';
          if (note2Ref.current) note2Ref.current.style.opacity = '0';
        }, 200);

        // Fluid dissolve into the application
        setTimeout(() => {
          setIsDone(true);
          if (onFinish) onFinish();
        }, 900);
      }
    };

    animFrameIdRef.current = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      if (animFrameIdRef.current) cancelAnimationFrame(animFrameIdRef.current);
    };
  }, [onFinish]);

  if (isDone) return null;

  return (
    <AnimatePresence>
      <motion.div
        className="kuberis-preloader-backdrop"
        initial={{ opacity: 1 }}
        exit={{ opacity: 0, scale: 1.03, filter: 'blur(8px)' }}
        transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 999999,
          background: '#030812',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
          padding: '20px'
        }}
      >
        {/* Dynamic Ambient Liquid Mesh */}
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden' }}>
          <div
            style={{
              position: 'absolute',
              width: '560px',
              height: '560px',
              borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(16, 185, 129, 0.4) 0%, transparent 70%)',
              filter: 'blur(80px)',
              top: '-15%',
              left: '10%'
            }}
          />
          <div
            style={{
              position: 'absolute',
              width: '500px',
              height: '500px',
              borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(245, 158, 11, 0.35) 0%, transparent 70%)',
              filter: 'blur(80px)',
              bottom: '-15%',
              right: '15%'
            }}
          />
        </div>

        {/* Central Stage Card */}
        <div
          ref={containerRef}
          style={{
            position: 'relative',
            width: '100%',
            maxWidth: '880px',
            borderRadius: '28px',
            background: 'rgba(10, 25, 47, 0.65)',
            backdropFilter: 'blur(32px) saturate(190%)',
            WebkitBackdropFilter: 'blur(32px) saturate(190%)',
            border: '1px solid rgba(255, 255, 255, 0.14)',
            boxShadow: 'inset 0 1px 2px rgba(255, 255, 255, 0.4), 0 30px 90px -20px rgba(0, 0, 0, 0.85), 0 0 50px rgba(16, 185, 129, 0.15)',
            padding: '36px 20px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden'
          }}
        >
          {/* Particle Canvas */}
          <canvas
            ref={canvasRef}
            style={{
              position: 'absolute',
              inset: 0,
              pointerEvents: 'none',
              zIndex: 80
            }}
          />

          {/* Responsive SVG Stage */}
          <div style={{ position: 'relative', width: '100%', maxWidth: '780px', aspectRatio: '900 / 240' }}>
            <svg
              ref={svgRef}
              viewBox="0 0 900 240"
              style={{ width: '100%', height: '100%', overflow: 'visible' }}
            >
              <defs>
                {/* Money Gold to Cyber Emerald Gradient */}
                <linearGradient id="preloaderMoneyGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#F59E0B" />
                  <stop offset="35%" stopColor="#FCD34D" />
                  <stop offset="70%" stopColor="#10B981" />
                  <stop offset="100%" stopColor="#34D399" />
                </linearGradient>

                {/* Enhanced Solid Text Fill */}
                <linearGradient id="preloaderTextGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#FFFFFF" />
                  <stop offset="25%" stopColor="#FEF08A" />
                  <stop offset="60%" stopColor="#F59E0B" />
                  <stop offset="100%" stopColor="#10B981" />
                </linearGradient>

                <filter id="preloaderGlow" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="8" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>

              {/* Precise Centerline Path for K - U - B - E - R - I - S */}
              {/* DIMS OUT COMPLETELY when text reveals to eliminate ugly double lines */}
              <g
                style={{
                  opacity: isRevealed ? 0.08 : 1,
                  transition: 'opacity 0.6s cubic-bezier(0.16, 1, 0.3, 1)'
                }}
              >
                {/* Subtle Background Guide Track */}
                <path
                  d="
                    M 85,180 L 85,60 M 85,120 L 145,60 M 110,118 L 150,180
                    M 195,60 L 195,145 C 195,175 245,175 245,145 L 245,60
                    M 295,180 L 295,60 L 335,60 C 360,60 360,110 335,110 L 295,110 L 340,110 C 365,110 365,180 340,180 Z
                    M 405,60 L 465,60 M 405,60 L 405,180 L 465,180 M 405,120 L 450,120
                    M 515,180 L 515,60 L 555,60 C 580,60 580,115 555,115 L 515,115 M 540,115 L 585,180
                    M 635,60 L 635,180
                    M 745,75 C 730,60 695,60 685,85 C 675,110 745,125 740,155 C 735,180 700,185 680,170
                  "
                  fill="none"
                  stroke="rgba(255, 255, 255, 0.04)"
                  strokeWidth="3.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />

                {/* Active Money Trace Stroke */}
                <path
                  ref={tracePathRef}
                  d="
                    M 85,180 L 85,60 M 85,120 L 145,60 M 110,118 L 150,180
                    M 195,60 L 195,145 C 195,175 245,175 245,145 L 245,60
                    M 295,180 L 295,60 L 335,60 C 360,60 360,110 335,110 L 295,110 L 340,110 C 365,110 365,180 340,180 Z
                    M 405,60 L 465,60 M 405,60 L 405,180 L 465,180 M 405,120 L 450,120
                    M 515,180 L 515,60 L 555,60 C 580,60 580,115 555,115 L 515,115 M 540,115 L 585,180
                    M 635,60 L 635,180
                    M 745,75 C 730,60 695,60 685,85 C 675,110 745,125 740,155 C 735,180 700,185 680,170
                  "
                  fill="none"
                  stroke="url(#preloaderMoneyGrad)"
                  strokeWidth="5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  style={{
                    filter: 'drop-shadow(0 0 10px #F59E0B) drop-shadow(0 0 20px #10B981)'
                  }}
                />
              </g>

              {/* Solid Illuminated Typography (Enhanced Neo-Luxe) */}
              <text
                x="450"
                y="152"
                textAnchor="middle"
                fontFamily="'Plus Jakarta Sans', system-ui, -apple-system, sans-serif"
                fontWeight="900"
                fontSize="106"
                letterSpacing="18"
                fill="url(#preloaderTextGrad)"
                filter="url(#preloaderGlow)"
                style={{
                  opacity: isRevealed ? 1 : 0,
                  transform: isRevealed ? 'scale(1)' : 'scale(0.96)',
                  transformOrigin: 'center',
                  transition: 'opacity 0.6s cubic-bezier(0.16, 1, 0.3, 1), transform 0.6s cubic-bezier(0.16, 1, 0.3, 1)',
                  pointerEvents: 'none'
                }}
              >
                KUBERIS
              </text>
            </svg>

            {/* Traveling Physical 3D Gold Coin */}
            <div
              ref={leadCoinRef}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                transform: 'translate(-50%, -50%)',
                pointerEvents: 'none',
                zIndex: 100,
                willChange: 'transform',
                transition: 'opacity 0.5s ease'
              }}
            >
              <div
                style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '50%',
                  background: 'radial-gradient(circle at 35% 35%, #FFFBEB 0%, #FBBF24 35%, #D97706 70%, #78350F 100%)',
                  boxShadow: '0 0 24px rgba(245, 158, 11, 0.8), inset 0 2px 3px rgba(255, 255, 255, 0.8), inset 0 -2px 3px rgba(0, 0, 0, 0.6)',
                  border: '2px solid #FDE68A',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: '900',
                  color: '#78350F',
                  fontSize: '21px',
                  animation: 'coinTumble 1.4s linear infinite'
                }}
              >
                ₹
              </div>
            </div>

            {/* Trailing ₹500 Emerald Banknote */}
            <div
              ref={note1Ref}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                transform: 'translate(-50%, -50%)',
                width: '44px',
                height: '24px',
                borderRadius: '4px',
                background: 'linear-gradient(135deg, #059669 0%, #10B981 60%, #34D399 100%)',
                border: '1px solid rgba(255, 255, 255, 0.4)',
                boxShadow: '0 4px 14px rgba(16, 185, 129, 0.6), inset 0 1px 1px rgba(255, 255, 255, 0.5)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '2px 4px',
                fontSize: '9px',
                fontWeight: '900',
                color: '#064E3B',
                pointerEvents: 'none',
                zIndex: 95,
                transition: 'opacity 0.5s ease',
                animation: 'noteWobble 1.2s ease-in-out infinite alternate'
              }}
            >
              <span>₹</span>
              <span>500</span>
            </div>

            {/* Trailing ₹200 Saffron Banknote */}
            <div
              ref={note2Ref}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                transform: 'translate(-50%, -50%)',
                width: '44px',
                height: '24px',
                borderRadius: '4px',
                background: 'linear-gradient(135deg, #B45309 0%, #F59E0B 70%, #FCD34D 100%)',
                border: '1px solid rgba(255, 255, 255, 0.4)',
                boxShadow: '0 4px 14px rgba(245, 158, 11, 0.6), inset 0 1px 1px rgba(255, 255, 255, 0.5)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '2px 4px',
                fontSize: '9px',
                fontWeight: '900',
                color: '#451A03',
                pointerEvents: 'none',
                zIndex: 94,
                transition: 'opacity 0.5s ease',
                animation: 'noteWobble 1.2s ease-in-out infinite alternate-reverse'
              }}
            >
              <span>₹</span>
              <span>200</span>
            </div>
          </div>

          {/* Subtitle Tagline */}
          <div
            style={{
              marginTop: '16px',
              fontSize: '12.5px',
              fontWeight: '800',
              color: '#38BDF8',
              letterSpacing: '2.5px',
              textTransform: 'uppercase',
              opacity: isRevealed ? 1 : 0,
              transform: isRevealed ? 'translateY(0)' : 'translateY(6px)',
              transition: 'all 0.5s cubic-bezier(0.16, 1, 0.3, 1)',
              textAlign: 'center'
            }}
          >
            The Autonomous Wealth OS
          </div>
        </div>

        {/* Global Keyframes for Tumble & Wobble */}
        <style>{`
          @keyframes coinTumble {
            0% { transform: scaleX(1) rotate(0deg); }
            25% { transform: scaleX(0.2) rotate(15deg); }
            50% { transform: scaleX(1) rotate(0deg); }
            75% { transform: scaleX(0.2) rotate(-15deg); }
            100% { transform: scaleX(1) rotate(0deg); }
          }
          @keyframes noteWobble {
            0% { transform: translate(-50%, -50%) rotate(-12deg) scale(0.95); }
            100% { transform: translate(-50%, -50%) rotate(16deg) scale(1.05); }
          }
        `}</style>
      </motion.div>
    </AnimatePresence>
  );
}
