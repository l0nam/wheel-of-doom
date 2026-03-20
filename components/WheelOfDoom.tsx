"use client";

import { useRef, useState, useEffect, useCallback } from "react";

// 12 sectors: alternating YES/NO with 6 each
const SECTORS = [
  { label: "ДА", isYes: true },
  { label: "НЕТ", isYes: false },
  { label: "ДА", isYes: true },
  { label: "НЕТ", isYes: false },
  { label: "ДА", isYes: true },
  { label: "НЕТ", isYes: false },
  { label: "ДА", isYes: true },
  { label: "НЕТ", isYes: false },
  { label: "ДА", isYes: true },
  { label: "НЕТ", isYes: false },
  { label: "ДА", isYes: true },
  { label: "НЕТ", isYes: false },
];

const NUM = SECTORS.length;
const SECTOR_ANGLE = 360 / NUM;

type Phase = "idle" | "spinning" | "slowdown" | "result";

interface Particle {
  id: number;
  x: number;
  y: number;
  color: string;
  size: number;
  tx: number;
  ty: number;
  duration: number;
}

interface Star {
  id: number;
  x: number;
  y: number;
  size: number;
  duration: number;
  minOpacity: number;
}

function drawWheel(canvas: HTMLCanvasElement, rotation: number, phase: Phase, spinSpeed: number) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const size = canvas.width;
  const cx = size / 2;
  const cy = size / 2;
  const r = size / 2 - 4;

  ctx.clearRect(0, 0, size, size);

  const intensity = Math.min(spinSpeed / 25, 1);

  // Outer glow ring
  const outerGlow = ctx.createRadialGradient(cx, cy, r - 10, cx, cy, r + 20);
  outerGlow.addColorStop(0, `rgba(201,168,76,${0.3 + intensity * 0.5})`);
  outerGlow.addColorStop(0.5, `rgba(255,69,0,${intensity * 0.4})`);
  outerGlow.addColorStop(1, "transparent");
  ctx.beginPath();
  ctx.arc(cx, cy, r + 20, 0, Math.PI * 2);
  ctx.fillStyle = outerGlow;
  ctx.fill();

  // Draw sectors
  for (let i = 0; i < NUM; i++) {
    const startAngle = ((rotation + i * SECTOR_ANGLE - 90) * Math.PI) / 180;
    const endAngle = ((rotation + (i + 1) * SECTOR_ANGLE - 90) * Math.PI) / 180;
    const sector = SECTORS[i];

    // Sector fill
    const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
    if (sector.isYes) {
      grad.addColorStop(0, "#2a1a00");
      grad.addColorStop(0.5, "#4a2800");
      grad.addColorStop(1, "#6b3800");
    } else {
      grad.addColorStop(0, "#1a0000");
      grad.addColorStop(0.5, "#3a0000");
      grad.addColorStop(1, "#5a0000");
    }

    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, r, startAngle, endAngle);
    ctx.closePath();
    ctx.fillStyle = grad;
    ctx.fill();

    // Sector border
    ctx.strokeStyle = `rgba(201,168,76,${0.6 + intensity * 0.4})`;
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Inner glow on sector edge (spinning effect)
    if (intensity > 0.3) {
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, r, startAngle, endAngle);
      ctx.closePath();
      ctx.strokeStyle = sector.isYes
        ? `rgba(255,215,0,${intensity * 0.3})`
        : `rgba(255,0,0,${intensity * 0.3})`;
      ctx.lineWidth = 8;
      ctx.stroke();
    }

    // Label
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(startAngle + (SECTOR_ANGLE * Math.PI) / 180 / 2);
    const labelR = r * 0.68;

    // Text glow
    ctx.shadowColor = sector.isYes ? "#ffd700" : "#cc0000";
    ctx.shadowBlur = 8 + intensity * 12;

    ctx.font = `900 ${Math.floor(size * 0.065)}px 'Cinzel Decorative', serif`;
    ctx.fillStyle = sector.isYes ? "#ffd700" : "#ff4444";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(sector.label, labelR, 0);
    ctx.restore();
  }

  // Center hub
  const hubGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r * 0.12);
  hubGrad.addColorStop(0, "#fff8e0");
  hubGrad.addColorStop(0.3, "#ffd700");
  hubGrad.addColorStop(0.7, "#c9a84c");
  hubGrad.addColorStop(1, "#8b6914");
  ctx.beginPath();
  ctx.arc(cx, cy, r * 0.12, 0, Math.PI * 2);
  ctx.fillStyle = hubGrad;
  ctx.shadowColor = "rgba(255,215,0,0.9)";
  ctx.shadowBlur = 20 + intensity * 30;
  ctx.fill();

  ctx.beginPath();
  ctx.arc(cx, cy, r * 0.12, 0, Math.PI * 2);
  ctx.strokeStyle = "#ffd700";
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.shadowBlur = 0;

  // Outer decorative ring
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.strokeStyle = `rgba(201,168,76,${0.7 + intensity * 0.3})`;
  ctx.lineWidth = 3;
  ctx.shadowColor = `rgba(255,215,0,${intensity})`;
  ctx.shadowBlur = intensity * 20;
  ctx.stroke();
  ctx.shadowBlur = 0;

  // Decorative dots on rim
  for (let i = 0; i < NUM * 2; i++) {
    const angle = ((rotation * 0.5 + i * (360 / (NUM * 2)) - 90) * Math.PI) / 180;
    const dx = cx + (r - 8) * Math.cos(angle);
    const dy = cy + (r - 8) * Math.sin(angle);
    ctx.beginPath();
    ctx.arc(dx, dy, 3, 0, Math.PI * 2);
    ctx.fillStyle = i % 2 === 0 ? "#ffd700" : "#c9a84c";
    ctx.shadowColor = "#ffd700";
    ctx.shadowBlur = 4 + intensity * 8;
    ctx.fill();
  }
  ctx.shadowBlur = 0;
}

export default function WheelOfDoom() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameRef = useRef<number>(0);
  const rotationRef = useRef<number>(0);
  const speedRef = useRef<number>(0);
  const phaseRef = useRef<Phase>("idle");
  const targetRotationRef = useRef<number>(0);

  const [phase, setPhase] = useState<Phase>("idle");
  const [result, setResult] = useState<boolean | null>(null);
  const [particles, setParticles] = useState<Particle[]>([]);
  const [stars, setStars] = useState<Star[]>([]);
  const [shaking, setShaking] = useState(false);
  const [lightning, setLightning] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const [canvasSize, setCanvasSize] = useState(480);

  // Generate stars
  useEffect(() => {
    const s: Star[] = Array.from({ length: 120 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 2.5 + 0.5,
      duration: Math.random() * 4 + 2,
      minOpacity: Math.random() * 0.3 + 0.1,
    }));
    setStars(s);

    const updateSize = () => {
      const vmin = Math.min(window.innerWidth, window.innerHeight);
      setCanvasSize(Math.min(Math.floor(vmin * 0.55), 500));
    };
    updateSize();
    window.addEventListener("resize", updateSize);
    return () => window.removeEventListener("resize", updateSize);
  }, []);

  // Draw loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const loop = () => {
      const p = phaseRef.current;
      const speed = speedRef.current;
      rotationRef.current += speed;

      if (p === "spinning") {
        // accelerate to max speed
        speedRef.current = Math.min(speed + 0.8, 28);
      } else if (p === "slowdown") {
        // dramatic slowdown
        const diff = targetRotationRef.current - rotationRef.current;
        if (diff > 0.3) {
          // ease out with tension
          const factor = Math.max(0.97, 0.995 - Math.pow(1 - diff / 1440, 3) * 0.03);
          speedRef.current = speed * factor;
          if (speedRef.current < 0.05) speedRef.current = 0;
        } else {
          speedRef.current = 0;
          rotationRef.current = targetRotationRef.current;
          phaseRef.current = "result";
        }
      }

      drawWheel(canvas, rotationRef.current % 360, phaseRef.current, speedRef.current);

      if (phaseRef.current !== "result") {
        animFrameRef.current = requestAnimationFrame(loop);
      } else {
        // Trigger result sequence
        handleResultReveal();
      }
    };

    animFrameRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animFrameRef.current);
  }, [canvasSize]);

  const handleResultReveal = useCallback(() => {
    // Figure out which sector the pointer (top) lands on
    const normalizedAngle = ((rotationRef.current % 360) + 360) % 360;
    const pointerAngle = (360 - normalizedAngle + 90) % 360;
    const sectorIndex = Math.floor(pointerAngle / SECTOR_ANGLE) % NUM;
    const isYes = SECTORS[sectorIndex].isYes;

    setResult(isYes);
    setPhase("result");
    phaseRef.current = "result";

    // Screen flash
    setLightning(true);
    setTimeout(() => setLightning(false), 200);

    // Screen shake
    setShaking(true);
    setTimeout(() => setShaking(false), 700);

    // Particles
    spawnParticles(isYes);

    // Show result text
    setTimeout(() => setShowResult(true), 300);
  }, []);

  const spawnParticles = (isYes: boolean) => {
    const colors = isYes
      ? ["#ffd700", "#ffb300", "#ff8c00", "#fffacd", "#ffa500"]
      : ["#cc0000", "#ff0000", "#8b0000", "#ff4444", "#660000"];

    const cx = window.innerWidth / 2;
    const cy = window.innerHeight / 2;

    const newParticles: Particle[] = Array.from({ length: 80 }, (_, i) => {
      const angle = (Math.random() * 360 * Math.PI) / 180;
      const dist = 200 + Math.random() * 400;
      return {
        id: Date.now() + i,
        x: cx,
        y: cy,
        color: colors[Math.floor(Math.random() * colors.length)],
        size: Math.random() * 8 + 3,
        tx: Math.cos(angle) * dist,
        ty: Math.sin(angle) * dist,
        duration: Math.random() * 1.5 + 0.8,
      };
    });

    setParticles(newParticles);
    setTimeout(() => setParticles([]), 3000);
  };

  const spin = () => {
    if (phase === "spinning" || phase === "slowdown") return;

    // Reset
    setShowResult(false);
    setResult(null);
    setParticles([]);
    phaseRef.current = "spinning";
    setPhase("spinning");
    speedRef.current = 2;

    // Decide final result and target rotation
    const willBeYes = Math.random() > 0.5;
    const targetSector = willBeYes
      ? SECTORS.findIndex((s) => s.isYes)
      : SECTORS.findIndex((s) => !s.isYes);

    // Spin 5–9 full rotations then land on target sector
    const extraSpins = (5 + Math.floor(Math.random() * 4)) * 360;
    const sectorCenter = targetSector * SECTOR_ANGLE + SECTOR_ANGLE / 2;
    const target = rotationRef.current + extraSpins + (360 - ((rotationRef.current + sectorCenter) % 360));
    targetRotationRef.current = target;

    // After 3–5 seconds start slowdown
    const spinDuration = 3000 + Math.random() * 2000;
    setTimeout(() => {
      phaseRef.current = "slowdown";
      setPhase("slowdown");
    }, spinDuration);

    // Restart animation loop
    cancelAnimationFrame(animFrameRef.current);
    const canvas = canvasRef.current;
    if (!canvas) return;

    const loop = () => {
      const p = phaseRef.current;
      rotationRef.current += speedRef.current;

      if (p === "spinning") {
        speedRef.current = Math.min(speedRef.current + 0.8, 28);
      } else if (p === "slowdown") {
        const diff = targetRotationRef.current - rotationRef.current;
        if (diff > 0.5 && speedRef.current > 0.05) {
          const t = Math.max(0, Math.min(1, 1 - diff / 1440));
          speedRef.current = speedRef.current * (0.99 - t * 0.02);
        } else {
          rotationRef.current = targetRotationRef.current;
          speedRef.current = 0;
          phaseRef.current = "result";
          drawWheel(canvas, rotationRef.current % 360, "result", 0);
          handleResultReveal();
          return;
        }
      }

      drawWheel(canvas, rotationRef.current % 360, p, speedRef.current);
      animFrameRef.current = requestAnimationFrame(loop);
    };

    animFrameRef.current = requestAnimationFrame(loop);
  };

  const reset = () => {
    setShowResult(false);
    setResult(null);
    setPhase("idle");
    phaseRef.current = "idle";
    setParticles([]);
    speedRef.current = 0;

    const canvas = canvasRef.current;
    if (canvas) drawWheel(canvas, rotationRef.current % 360, "idle", 0);
  };

  const isSpinning = phase === "spinning" || phase === "slowdown";

  return (
    <div className={`relative w-full h-screen flex flex-col items-center justify-center overflow-hidden bg-black ${shaking ? "screen-shake" : ""}`}>
      {/* Starfield */}
      <div className="stars">
        {stars.map((s) => (
          <div
            key={s.id}
            className="star"
            style={{
              left: `${s.x}%`,
              top: `${s.y}%`,
              width: s.size,
              height: s.size,
              "--duration": `${s.duration}s`,
              "--min-opacity": s.minOpacity,
            } as React.CSSProperties}
          />
        ))}
      </div>

      {/* Atmosphere layers */}
      <div className="fog" />
      <div className="vignette" />
      <div className="scanlines" />

      {/* Lightning flash */}
      {lightning && <div className="lightning" />}

      {/* Particles */}
      {particles.map((p) => (
        <div
          key={p.id}
          className="particle"
          style={{
            left: p.x,
            top: p.y,
            width: p.size,
            height: p.size,
            background: p.color,
            boxShadow: `0 0 ${p.size * 2}px ${p.color}`,
            "--tx": `${p.tx}px`,
            "--ty": `${p.ty}px`,
            "--duration": `${p.duration}s`,
          } as React.CSSProperties}
        />
      ))}

      {/* Main content */}
      <div className="relative z-10 flex flex-col items-center gap-6 select-none">
        {/* Title */}
        <div className="flex flex-col items-center gap-1 mb-2">
          <h1 className="title-main">КОЛЕСО РОКА</h1>
          <p className="subtitle">вращай — и судьба решит за тебя</p>
          <div className="ornament mt-1">⸻ ✦ ⸻</div>
        </div>

        {/* Wheel */}
        <div className="wheel-container" style={{ width: canvasSize + 60, height: canvasSize + 60 }}>
          {/* Tension ring */}
          <div className={`tension-ring ${isSpinning ? "active" : ""}`} style={{ width: canvasSize + 16, height: canvasSize + 16, left: 22, top: 22 }} />

          {/* Glow */}
          <div className={`wheel-glow ${isSpinning ? "wheel-spinning" : ""}`} style={{ width: canvasSize, height: canvasSize, left: 30, top: 30 }} />

          {/* Pointer */}
          <div className="wheel-pointer" style={{ top: 6 }} />

          {/* Canvas */}
          <canvas
            ref={canvasRef}
            width={canvasSize}
            height={canvasSize}
            style={{ display: "block", margin: "30px auto 0" }}
          />
        </div>

        {/* Button / Result */}
        {phase !== "result" ? (
          <div className="flex flex-col items-center gap-3 mt-2">
            <button
              className="spin-btn"
              onClick={spin}
              disabled={isSpinning}
            >
              {isSpinning ? (phase === "slowdown" ? "⚡ РЕШАЕТСЯ..." : "⚡ КРУТИТСЯ...") : "✦ ВРАЩАТЬ КОЛЕСО ✦"}
            </button>
            {isSpinning && (
              <p className="subtitle" style={{ color: "rgba(255,69,0,0.8)", animation: "fogPulse 0.4s ease-in-out infinite alternate" }}>
                СУДЬБА ПЛЕТЁТ НИТ...
              </p>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center gap-4 mt-2">
            <button
              className="spin-btn"
              onClick={reset}
              style={{ fontSize: "0.85rem", padding: "12px 32px" }}
            >
              ↺ СПРОСИТЬ СНОВА
            </button>
          </div>
        )}
      </div>

      {/* Result overlay */}
      {showResult && result !== null && (
        <div className="result-overlay">
          <div className={`result-text ${result ? "result-yes" : "result-no"}`}>
            {result ? "ДА" : "НЕТ"}
          </div>
        </div>
      )}
    </div>
  );
}
