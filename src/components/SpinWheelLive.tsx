'use client';

import React, { useRef, useEffect, useState } from 'react';
import confetti from 'canvas-confetti';
import { Volume2, VolumeX, RefreshCw } from 'lucide-react';

interface Player {
  id: string;
  name: string;
}

interface SpinWheelLiveProps {
  players: Player[];
  isAllowedToSpin: boolean;
  isSpinningRemote: boolean;
  targetAngleRemote: number | null;
  winnerName: string | null;
  onLocalSpinTrigger: (targetAngle: number, winnerName: string) => void;
  onSpinEnd: () => void;
}

const FRICTION = 0.992; // Constant friction for predictable geometric stopping

export const SpinWheelLive: React.FC<SpinWheelLiveProps> = ({
  players,
  isAllowedToSpin,
  isSpinningRemote,
  targetAngleRemote,
  winnerName,
  onLocalSpinTrigger,
  onSpinEnd,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isSpinning, setIsSpinning] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [pointerFlick, setPointerFlick] = useState(false);

  // Audio Context for haptic sounds
  const audioContextRef = useRef<AudioContext | null>(null);

  // Rotation states
  const rotationRef = useRef(0);
  const angularVelocityRef = useRef(0);
  const lastTickAngleRef = useRef(0);

  // Dragging states
  const isDraggingRef = useRef(false);
  const lastAngleRef = useRef(0);
  const lastTimeRef = useRef(0);
  const velocityTrackerRef = useRef<number[]>([]);

  const getAudioContext = () => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (audioContextRef.current.state === 'suspended') {
      audioContextRef.current.resume();
    }
    return audioContextRef.current;
  };

  const playTickSound = (frequencyMultiplier = 1) => {
    if (!soundEnabled) return;
    try {
      const ctx = getAudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(600 * frequencyMultiplier, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(100 * frequencyMultiplier, ctx.currentTime + 0.05);

      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.05);

      osc.start();
      osc.stop(ctx.currentTime + 0.06);
    } catch (e) {
      // Ignored audio context blocks
    }
  };

  const playWinSound = () => {
    if (!soundEnabled) return;
    try {
      const ctx = getAudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.type = 'sine';
      osc.frequency.setValueAtTime(440, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.3);

      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);

      osc.start();
      osc.stop(ctx.currentTime + 0.6);
    } catch (e) {
      // Ignored
    }
  };

  const segmentColors = [
    '#ff3b30', // red
    '#ff9500', // orange
    '#ffcc00', // yellow
    '#34c759', // green
    '#007aff', // blue
    '#5856d6', // purple
    '#af52de', // violet
    '#ff2d55', // pink
  ];

  // Draw wheel function
  const drawWheel = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const size = 350; // logical size
    
    if (canvas.width !== size * dpr || canvas.height !== size * dpr) {
      canvas.width = size * dpr;
      canvas.height = size * dpr;
      canvas.style.width = `${size}px`;
      canvas.style.height = `${size}px`;
    }
    
    ctx.save();
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, size, size);

    const center = size / 2;
    const radius = center - 16;

    const items = players.length > 0 ? players.map(p => p.name) : ['Esperando...'];
    const sliceAngle = (2 * Math.PI) / items.length;

    // 1. Draw outer ring
    ctx.beginPath();
    ctx.arc(center, center, radius + 8, 0, 2 * Math.PI);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.fill();
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.stroke();

    // 2. Draw segments
    items.forEach((name, i) => {
      ctx.save();
      const angle = rotationRef.current + i * sliceAngle;

      ctx.beginPath();
      ctx.moveTo(center, center);
      ctx.arc(center, center, radius, angle, angle + sliceAngle);
      ctx.closePath();

      const grad = ctx.createRadialGradient(center, center, center * 0.1, center, center, radius);
      const baseColor = segmentColors[i % segmentColors.length];
      grad.addColorStop(0, 'rgba(255, 255, 255, 0.2)');
      grad.addColorStop(0.6, baseColor + 'c0');
      grad.addColorStop(1, baseColor);

      ctx.fillStyle = grad;
      ctx.fill();

      ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
      ctx.lineWidth = 1;
      ctx.stroke();

      // Text label
      ctx.translate(center, center);
      ctx.rotate(angle + sliceAngle / 2);
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';

      ctx.shadowColor = 'rgba(0, 0, 0, 0.4)';
      ctx.shadowBlur = 4;
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 13px system-ui, -apple-system, sans-serif';
      
      const truncated = name.length > 14 ? name.substring(0, 11) + '..' : name;
      ctx.fillText(truncated, radius - 20, 0);
      ctx.restore();
    });

    // 3. Central Cap
    ctx.beginPath();
    ctx.arc(center, center, 32, 0, 2 * Math.PI);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.lineWidth = 1.5;
    ctx.fill();
    ctx.stroke();
    
    ctx.beginPath();
    ctx.arc(center, center, 24, 0, 2 * Math.PI);
    const centerGrad = ctx.createRadialGradient(center - 5, center - 5, 2, center, center, 24);
    centerGrad.addColorStop(0, '#ffffff');
    centerGrad.addColorStop(1, '#cccccc');
    ctx.fillStyle = centerGrad;
    ctx.fill();

    // Blue core
    ctx.beginPath();
    ctx.arc(center, center, 8, 0, 2 * Math.PI);
    const innerGrad = ctx.createRadialGradient(center - 2, center - 2, 1, center, center, 8);
    innerGrad.addColorStop(0, '#007aff');
    innerGrad.addColorStop(1, '#0040dd');
    ctx.fillStyle = innerGrad;
    ctx.fill();
    
    ctx.restore();
  };

  // Synchronize remote spin events
  useEffect(() => {
    if (isSpinningRemote && !isSpinning && targetAngleRemote !== null) {
      // Start a spin synced to the target angle!
      setIsSpinning(true);
      
      // Calculate how much we need to rotate to stop at targetAngleRemote
      let currentMod = rotationRef.current % (2 * Math.PI);
      if (currentMod < 0) currentMod += 2 * Math.PI;

      let targetMod = targetAngleRemote % (2 * Math.PI);
      if (targetMod < 0) targetMod += 2 * Math.PI;

      let diff = targetMod - currentMod;
      if (diff < 0) diff += 2 * Math.PI;

      // Add full spin rounds (at least 6 spins) for optimal visual effect
      const totalRotation = diff + 6 * 2 * Math.PI;
      angularVelocityRef.current = totalRotation * (1 - FRICTION);
      
      getAudioContext();
    }
  }, [isSpinningRemote, targetAngleRemote]);

  // Spin physics animation loop
  useEffect(() => {
    let animId: number;

    const animate = () => {
      if (!isDraggingRef.current) {
        if (angularVelocityRef.current > 0.002) {
          rotationRef.current += angularVelocityRef.current;
          angularVelocityRef.current *= FRICTION; // Constant deceleration

          // Play clicks
          const itemsCount = players.length > 0 ? players.length : 1;
          const segmentAngle = (2 * Math.PI) / itemsCount;
          const progress = rotationRef.current / segmentAngle;
          
          if (Math.floor(progress) !== Math.floor(lastTickAngleRef.current)) {
            playTickSound(Math.min(1.5, 0.6 + angularVelocityRef.current * 3));
            lastTickAngleRef.current = progress;
            setPointerFlick(true);
            setTimeout(() => setPointerFlick(false), 50);
          }

          drawWheel();
          animId = requestAnimationFrame(animate);
        } else if (isSpinning) {
          setIsSpinning(false);
          angularVelocityRef.current = 0;
          
          // Confetti celebration
          confetti({
            particleCount: 100,
            spread: 70,
            origin: { y: 0.6 }
          });
          playWinSound();
          onSpinEnd();
        }
      }
    };

    if (isSpinning && !isDraggingRef.current) {
      animId = requestAnimationFrame(animate);
    }

    return () => cancelAnimationFrame(animId);
  }, [isSpinning, players]);

  // Initial draw and changes in players
  useEffect(() => {
    drawWheel();
  }, [players]);

  // Calculate winner name based on stop angle
  const getWinnerForAngle = (angle: number): string => {
    if (players.length === 0) return '';
    let targetAngle = (1.5 * Math.PI - angle) % (2 * Math.PI);
    if (targetAngle < 0) targetAngle += 2 * Math.PI;

    const sectorAngle = (2 * Math.PI) / players.length;
    const index = Math.floor(targetAngle / sectorAngle) % players.length;
    return players[index].name;
  };

  const handleLocalSpin = () => {
    if (isSpinning || players.length === 0 || !isAllowedToSpin) return;

    // Pick a random target angle on the circle
    const randomStopAngle = Math.random() * 2 * Math.PI;
    const winner = getWinnerForAngle(randomStopAngle);

    // Notify parent to broadcast/record on server
    onLocalSpinTrigger(randomStopAngle, winner);
  };

  // Dragging event handlers helper
  const getCoordinatesFromEvent = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    let clientX = 0;
    let clientY = 0;

    if ('touches' in e) {
      if (e.touches.length === 0) return null;
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    return {
      x: clientX - centerX,
      y: clientY - centerY,
    };
  };

  const startDrag = (e: React.MouseEvent | React.TouchEvent) => {
    if (players.length === 0 || isSpinning || !isAllowedToSpin) return;
    
    const coords = getCoordinatesFromEvent(e);
    if (!coords) return;

    getAudioContext();
    const angle = Math.atan2(coords.y, coords.x);
    isDraggingRef.current = true;
    lastAngleRef.current = angle;
    lastTimeRef.current = performance.now();
    velocityTrackerRef.current = [];
  };

  const moveDrag = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDraggingRef.current) return;

    const coords = getCoordinatesFromEvent(e);
    if (!coords) return;

    const currentAngle = Math.atan2(coords.y, coords.x);
    let delta = currentAngle - lastAngleRef.current;

    if (delta > Math.PI) delta -= 2 * Math.PI;
    if (delta < -Math.PI) delta += 2 * Math.PI;

    rotationRef.current += delta;

    const now = performance.now();
    const dt = now - lastTimeRef.current;
    if (dt > 0) {
      velocityTrackerRef.current.push(delta / dt);
      if (velocityTrackerRef.current.length > 5) {
        velocityTrackerRef.current.shift();
      }
    }

    const itemsCount = players.length > 0 ? players.length : 1;
    const segmentAngle = (2 * Math.PI) / itemsCount;
    const progress = rotationRef.current / segmentAngle;
    
    if (Math.floor(progress) !== Math.floor(lastTickAngleRef.current)) {
      playTickSound(0.8);
      lastTickAngleRef.current = progress;
      setPointerFlick(true);
      setTimeout(() => setPointerFlick(false), 50);
    }

    drawWheel();

    lastAngleRef.current = currentAngle;
    lastTimeRef.current = now;
  };

  const endDrag = () => {
    if (!isDraggingRef.current) return;
    isDraggingRef.current = false;

    const track = velocityTrackerRef.current;
    if (track.length > 0) {
      const avgVelocityMs = track.reduce((a, b) => a + b, 0) / track.length;
      const avgVelocityFrame = avgVelocityMs * 16.66;
      
      if (Math.abs(avgVelocityFrame) > 0.005) {
        // Drag-to-spin triggered! Calculate final rotation angle
        let speedBoost = Math.min(Math.max(avgVelocityFrame * 1.5, -0.9), 0.9);
        
        // Final landing calculation using geometric sequence decay:
        // stop = current + velocity * F / (1 - F)
        let finalRotationOffset = speedBoost * FRICTION / (1 - FRICTION);
        
        // Force at least 1 full turn (2 * Math.PI) to trigger a valid draw
        const minRotation = 2 * Math.PI;
        if (Math.abs(finalRotationOffset) < minRotation) {
          const direction = finalRotationOffset >= 0 ? 1 : -1;
          finalRotationOffset = direction * minRotation;
          // Recalculate speedBoost to match the exact minRotation:
          speedBoost = (finalRotationOffset * (1 - FRICTION)) / FRICTION;
        }

        const targetStopAngle = (rotationRef.current + finalRotationOffset) % (2 * Math.PI);
        const winner = getWinnerForAngle(targetStopAngle);

        onLocalSpinTrigger(targetStopAngle, winner);
        return;
      }
    }

    // If drag released without significant speed, do NOT trigger a draw.
    // Just snap/stay in place and redraw.
    drawWheel();
  };

  return (
    <div className="flex flex-col items-center gap-5 select-none w-full max-w-[370px] mx-auto">
      <div className="flex justify-between items-center w-full px-4">
        <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
          Enlace de Ruleta Activo
        </span>
        <button
          onClick={() => setSoundEnabled(!soundEnabled)}
          className="p-2 rounded-xl bg-slate-900/60 border border-slate-800 text-slate-400 hover:text-white transition"
        >
          {soundEnabled ? <Volume2 size={15} /> : <VolumeX size={15} />}
        </button>
      </div>

      {/* Canvas container with pointer indicator */}
      <div className="relative p-2 flex items-center justify-center w-full max-w-[350px] mx-auto">
        {/* CSS 3D Glassliquid container border shadow */}
        <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-white/10 to-white/40 dark:from-white/5 dark:to-white/10 border border-white/30 dark:border-white/10 shadow-[inset_0_4px_16px_rgba(255,255,255,0.4),0_24px_48px_-12px_rgba(0,0,0,0.15)] pointer-events-none" />
        
        {/* Sleek fixed arrow pointing down from the top */}
        <div 
          className="absolute z-35" 
          style={{
            top: '8px',
            left: '50%',
            transform: pointerFlick ? 'translateX(-50%) rotate(-18deg)' : 'translateX(-50%) rotate(0deg)',
            transformOrigin: '50% 0%',
            transition: pointerFlick ? 'none' : 'transform 0.15s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
            filter: 'drop-shadow(0 6px 12px rgba(255, 59, 48, 0.5))',
            pointerEvents: 'none'
          }}
        >
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 21L3 9H9V3H15V9H21L12 21Z" fill="url(#live-pointer-grad)" stroke="#ffffff" strokeWidth="2.5" strokeLinejoin="round"/>
            <defs>
              <linearGradient id="live-pointer-grad" x1="12" y1="3" x2="12" y2="21" gradientUnits="userSpaceOnUse">
                <stop stopColor="#ff453a" />
                <stop offset="1" stopColor="#ff2d55" />
              </linearGradient>
            </defs>
          </svg>
        </div>

        <canvas
          ref={canvasRef}
          width={350}
          height={350}
          className={`relative z-10 ${isAllowedToSpin && !isSpinning ? 'cursor-grab active:cursor-grabbing' : 'cursor-not-allowed'}`}
          style={{
            maxWidth: '100%',
            height: 'auto',
            touchAction: 'none',
          }}
          onMouseDown={isAllowedToSpin ? startDrag : undefined}
          onMouseMove={isAllowedToSpin ? moveDrag : undefined}
          onMouseUp={isAllowedToSpin ? endDrag : undefined}
          onMouseLeave={isAllowedToSpin ? endDrag : undefined}
          onTouchStart={isAllowedToSpin ? startDrag : undefined}
          onTouchMove={isAllowedToSpin ? moveDrag : undefined}
          onTouchEnd={isAllowedToSpin ? endDrag : undefined}
        />

        {/* Center Button */}
        <button
          disabled={isSpinning || players.length === 0 || !isAllowedToSpin}
          onClick={handleLocalSpin}
          className={`absolute z-20 w-14 h-14 rounded-full flex items-center justify-center font-extrabold text-[11px] border border-white/20 shadow-xl transition-all ${
            isSpinning || players.length === 0 || !isAllowedToSpin
              ? 'bg-slate-800/80 text-slate-500 cursor-not-allowed'
              : 'bg-white hover:bg-slate-100 text-slate-900 active:scale-95'
          }`}
        >
          {isSpinning ? <RefreshCw size={18} className="animate-spin" /> : 'GIRAR'}
        </button>
      </div>

      {/* Winner Overlay Panel */}
      {winnerName && !isSpinning && (
        <div className="glass w-full p-4 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 text-center shadow-xl">
          <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-400">
            ¡Ganador Sorteado!
          </span>
          <h3 className="text-xl font-extrabold text-white mt-1">
            {winnerName}
          </h3>
        </div>
      )}
    </div>
  );
};
