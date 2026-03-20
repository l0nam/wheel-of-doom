"use client";

import { useRef, useState, useEffect, useCallback } from "react";

// 12 sectors alternating ДА/НЕТ
const SECTORS = [
  { label: "ДА",  isYes: true  },
  { label: "НЕТ", isYes: false },
  { label: "ДА",  isYes: true  },
  { label: "НЕТ", isYes: false },
  { label: "ДА",  isYes: true  },
  { label: "НЕТ", isYes: false },
  { label: "ДА",  isYes: true  },
  { label: "НЕТ", isYes: false },
  { label: "ДА",  isYes: true  },
  { label: "НЕТ", isYes: false },
  { label: "ДА",  isYes: true  },
  { label: "НЕТ", isYes: false },
];

const NUM = SECTORS.length;
const SECTOR_DEG = 360 / NUM;

type Phase = "idle" | "buildup" | "spinning" | "slowdown" | "suspense" | "result";

interface Particle {
  id: number; x: number; y: number;
  color: string; size: number;
  tx: number; ty: number; duration: number;
}
interface Star {
  id: number; x: number; y: number;
  size: number; duration: number; minOpacity: number;
}

function drawWheel(
  canvas: HTMLCanvasElement,
  rotation: number,
  speed: number,
  suspensePulse: number
) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const S = canvas.width;
  const cx = S / 2, cy = S / 2;
  const R = S / 2 - 6;
  const intensity = Math.min(speed / 22, 1);

  ctx.clearRect(0, 0, S, S);

  // outer halo
  const haloColor = intensity > 0.5
    ? `rgba(255,60,0,${0.15 + intensity * 0.4 + suspensePulse * 0.3})`
    : `rgba(201,168,76,${0.2 + intensity * 0.3 + suspensePulse * 0.2})`;
  const halo = ctx.createRadialGradient(cx, cy, R * 0.7, cx, cy, R + 35);
  halo.addColorStop(0, "transparent");
  halo.addColorStop(0.6, haloColor);
  halo.addColorStop(1, "transparent");
  ctx.beginPath(); ctx.arc(cx, cy, R + 35, 0, Math.PI * 2);
  ctx.fillStyle = halo; ctx.fill();

  // sectors
  for (let i = 0; i < NUM; i++) {
    const a0 = ((rotation + i * SECTOR_DEG - 90) * Math.PI) / 180;
    const a1 = ((rotation + (i + 1) * SECTOR_DEG - 90) * Math.PI) / 180;
    const sec = SECTORS[i];

    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, R);
    if (sec.isYes) {
      g.addColorStop(0, "#2d1800"); g.addColorStop(0.55, "#4f2d00"); g.addColorStop(1, "#7a4800");
    } else {
      g.addColorStop(0, "#1e0000"); g.addColorStop(0.55, "#420000"); g.addColorStop(1, "#6e0000");
    }
    ctx.beginPath(); ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, R, a0, a1); ctx.closePath();
    ctx.fillStyle = g; ctx.fill();

    if (intensity > 0.2) {
      ctx.beginPath(); ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, R, a0, a1); ctx.closePath();
      ctx.strokeStyle = sec.isYes
        ? `rgba(255,200,0,${intensity * 0.3})`
        : `rgba(255,30,30,${intensity * 0.3})`;
      ctx.lineWidth = 14; ctx.stroke();
    }

    ctx.beginPath(); ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, R, a0, a1); ctx.closePath();
    ctx.strokeStyle = `rgba(201,168,76,${0.5 + intensity * 0.4 + suspensePulse * 0.3})`;
    ctx.lineWidth = 1.5; ctx.stroke();

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(a0 + (SECTOR_DEG / 2 * Math.PI) / 180);
    ctx.shadowColor = sec.isYes ? "#ffd700" : "#cc0000";
    ctx.shadowBlur = 6 + intensity * 14 + suspensePulse * 22;
    ctx.font = `900 ${Math.floor(S * 0.062)}px 'Cinzel Decorative', serif`;
    ctx.fillStyle = sec.isYes ? "#ffd700" : "#ff4040";
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText(sec.label, R * 0.67, 0);
    ctx.restore();
  }

  // rim dots
  for (let i = 0; i < NUM * 2; i++) {
    const a = ((rotation + i * (360 / (NUM * 2)) - 90) * Math.PI) / 180;
    const dx = cx + (R - 9) * Math.cos(a);
    const dy = cy + (R - 9) * Math.sin(a);
    ctx.beginPath(); ctx.arc(dx, dy, 3.5, 0, Math.PI * 2);
    ctx.fillStyle = i % 2 === 0 ? "#ffd700" : "#a07820";
    ctx.shadowColor = "#ffd700";
    ctx.shadowBlur = 4 + intensity * 10 + suspensePulse * 16;
    ctx.fill();
  }
  ctx.shadowBlur = 0;

  // outer ring
  ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2);
  ctx.strokeStyle = `rgba(201,168,76,${0.7 + intensity * 0.3 + suspensePulse * 0.3})`;
  ctx.lineWidth = 3;
  ctx.shadowColor = `rgba(255,215,0,${intensity + suspensePulse * 0.8})`;
  ctx.shadowBlur = 10 + intensity * 25 + suspensePulse * 40;
  ctx.stroke(); ctx.shadowBlur = 0;

  // center hub
  const hg = ctx.createRadialGradient(cx, cy, 0, cx, cy, R * 0.13);
  hg.addColorStop(0, "#fffbe0"); hg.addColorStop(0.4, "#ffd700");
  hg.addColorStop(0.8, "#b8860b"); hg.addColorStop(1, "#7a5c00");
  ctx.beginPath(); ctx.arc(cx, cy, R * 0.13, 0, Math.PI * 2);
  ctx.fillStyle = hg;
  ctx.shadowColor = "rgba(255,220,0,0.95)";
  ctx.shadowBlur = 18 + intensity * 28 + suspensePulse * 32;
  ctx.fill();
  ctx.strokeStyle = "#ffd700"; ctx.lineWidth = 2.5; ctx.stroke();
  ctx.shadowBlur = 0;
}

export default function WheelOfDoom() {
  const canvasRef        = useRef<HTMLCanvasElement>(null);
  const rafRef           = useRef<number>(0);
  const rotRef           = useRef<number>(0);
  const speedRef         = useRef<number>(0);
  const phaseRef         = useRef<Phase>("idle");
  const targetRotRef     = useRef<number>(0);
  const trueResultRef    = useRef<boolean>(false);
  const suspensePulseRef = useRef<number>(0);
  const suspenseDirRef   = useRef<number>(1);
  const msgIntervalRef   = useRef<ReturnType<typeof setInterval> | null>(null);

  const [phase, setPhase]               = useState<Phase>("idle");
  const [result, setResult]             = useState<boolean | null>(null);
  const [particles, setParticles]       = useState<Particle[]>([]);
  const [stars, setStars]               = useState<Star[]>([]);
  const [shaking, setShaking]           = useState(false);
  const [lightningOn, setLightning]     = useState(false);
  const [showResult, setShowResult]     = useState(false);
  const [canvasSize, setCanvasSize]     = useState(460);
  const [tensionLevel, setTensionLevel] = useState(0);
  const [suspenseMsg, setSuspenseMsg]   = useState("");

  const MSGS = [
    "СУДЬБА КОЛЕБЛЕТСЯ...",
    "ЕЩЁ НЕ ВРЕМЯ ЗНАТЬ...",
    "ВСЕЛЕННАЯ ДУМАЕТ...",
    "НИТИ РОКА НАТЯНУТЫ...",
    "ПОЧТИ... ПОЧТИ...",
    "БОГИ МОЛЧАТ...",
    "МГНОВЕНИЕ РЕШАЕТ ВСЁ...",
  ];

  // init stars + resize
  useEffect(() => {
    setStars(Array.from({ length: 160 }, (_, i) => ({
      id: i, x: Math.random() * 100, y: Math.random() * 100,
      size: Math.random() * 2.5 + 0.4,
      duration: Math.random() * 4 + 2,
      minOpacity: Math.random() * 0.25 + 0.08,
    })));
    const resize = () => {
      const vmin = Math.min(window.innerWidth, window.innerHeight);
      setCanvasSize(Math.min(Math.floor(vmin * 0.50), 470));
    };
    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, []);

  // idle draw loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let id: number;
    const tick = () => {
      if (phaseRef.current === "idle" || phaseRef.current === "result") {
        drawWheel(canvas, rotRef.current % 360, 0, 0);
      }
      id = requestAnimationFrame(tick);
    };
    id = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(id);
  }, [canvasSize]);

  const triggerReveal = useCallback((isYes: boolean) => {
    phaseRef.current = "result";
    setPhase("result");
    setResult(isYes);
    setSuspenseMsg("");
    setTensionLevel(0);

    // triple flash
    [0, 180, 360].forEach((delay) => {
      setTimeout(() => {
        setLightning(true);
        setTimeout(() => setLightning(false), 90);
      }, delay);
    });

    setShaking(true);
    setTimeout(() => setShaking(false), 900);

    spawnParticles(isYes, 140);
    setTimeout(() => setShowResult(true), 380);
  }, []);

  const spawnParticles = (isYes: boolean, count: number) => {
    const colors = isYes
      ? ["#ffd700", "#ffb300", "#ff8c00", "#fffacd", "#ffa500", "#fff8dc"]
      : ["#cc0000", "#ff1a1a", "#8b0000", "#ff4444", "#5c0000", "#ff6666"];
    const cx = window.innerWidth / 2, cy = window.innerHeight / 2;
    setParticles(Array.from({ length: count }, (_, i) => {
      const angle = Math.random() * Math.PI * 2;
      const dist = 150 + Math.random() * 520;
      return {
        id: Date.now() + i, x: cx, y: cy,
        color: colors[Math.floor(Math.random() * colors.length)],
        size: Math.random() * 11 + 3,
        tx: Math.cos(angle) * dist, ty: Math.sin(angle) * dist,
        duration: Math.random() * 1.8 + 0.7,
      };
    }));
    setTimeout(() => setParticles([]), 4500);
  };

  const spin = useCallback(() => {
    if (phaseRef.current !== "idle" && phaseRef.current !== "result") return;

    // clear old
    cancelAnimationFrame(rafRef.current);
    if (msgIntervalRef.current) clearInterval(msgIntervalRef.current);
    setShowResult(false);
    setResult(null);
    setParticles([]);
    setTensionLevel(0);
    setSuspenseMsg("");

    // decide true result
    const willBeYes = Math.random() < 0.5;
    trueResultRef.current = willBeYes;

    // Wheel lands on OPPOSITE sector so displayed result ≠ wheel position
    const oppIdx = SECTORS.findIndex((s) => s.isYes === !willBeYes);
    const sectorCenter = oppIdx * SECTOR_DEG + SECTOR_DEG / 2;
    // We need: (360 - rotFinal % 360) % 360 = sectorCenter
    // → rotFinal % 360 = (360 - sectorCenter + 360) % 360
    const wantedMod = (360 - sectorCenter + 360) % 360;
    const currentMod = ((rotRef.current % 360) + 360) % 360;
    const diff = (wantedMod - currentMod + 360) % 360;
    const fullSpins = (6 + Math.floor(Math.random() * 5)) * 360;
    targetRotRef.current = rotRef.current + fullSpins + diff;

    phaseRef.current = "buildup";
    setPhase("buildup");
    speedRef.current = 1;
    suspensePulseRef.current = 0;
    suspenseDirRef.current = 1;

    const spinMs = 3200 + Math.random() * 2800;

    setTimeout(() => { if (phaseRef.current === "buildup") { phaseRef.current = "spinning"; setPhase("spinning"); } }, 500);
    setTimeout(() => { if (phaseRef.current === "spinning") { phaseRef.current = "slowdown"; setPhase("slowdown"); } }, 500 + spinMs);
    setTimeout(() => setTensionLevel(1), 500 + spinMs + 600);
    setTimeout(() => setTensionLevel(2), 500 + spinMs + 1600);
    setTimeout(() => setTensionLevel(3), 500 + spinMs + 2800);

    let msgIdx = 0;
    msgIntervalRef.current = setInterval(() => {
      const p = phaseRef.current;
      if (p === "slowdown" || p === "suspense") {
        setSuspenseMsg(MSGS[msgIdx % MSGS.length]);
        msgIdx++;
      } else if (p === "result") {
        if (msgIntervalRef.current) clearInterval(msgIntervalRef.current);
      }
    }, 1000);

    const loop = () => {
      const p = phaseRef.current;
      if (p === "result") return;

      if (p === "buildup") {
        speedRef.current = Math.min(speedRef.current + 0.35, 5);
      } else if (p === "spinning") {
        speedRef.current = Math.min(speedRef.current + 0.65, 24);
      } else if (p === "slowdown" || p === "suspense") {
        const remaining = targetRotRef.current - rotRef.current;
        if (remaining > 0.3 && speedRef.current > 0.03) {
          const progress = Math.max(0, Math.min(1, 1 - remaining / (fullSpins * 0.35)));
          const decay = 0.989 - progress * 0.016;
          speedRef.current = Math.max(speedRef.current * decay, 0.03);

          if (speedRef.current < 1.0 && p !== "suspense") {
            phaseRef.current = "suspense";
            setPhase("suspense");
          }

          suspensePulseRef.current += 0.06 * suspenseDirRef.current;
          if (suspensePulseRef.current >= 1) suspenseDirRef.current = -1;
          if (suspensePulseRef.current <= 0) suspenseDirRef.current = 1;
        } else {
          rotRef.current = targetRotRef.current;
          speedRef.current = 0;
          const canvas = canvasRef.current;
          if (canvas) drawWheel(canvas, rotRef.current % 360, 0, 0);
          if (msgIntervalRef.current) clearInterval(msgIntervalRef.current);
          triggerReveal(trueResultRef.current);
          return;
        }
      }

      rotRef.current += speedRef.current;
      const canvas = canvasRef.current;
      if (canvas) {
        drawWheel(
          canvas,
          rotRef.current % 360,
          speedRef.current,
          p === "suspense" ? suspensePulseRef.current : 0
        );
      }
      rafRef.current = requestAnimationFrame(loop);
    };

    rafRef.current = requestAnimationFrame(loop);
  }, [triggerReveal]);

  const reset = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    if (msgIntervalRef.current) clearInterval(msgIntervalRef.current);
    setShowResult(false);
    setResult(null);
    setParticles([]);
    setTensionLevel(0);
    setSuspenseMsg("");
    setShaking(false);
    phaseRef.current = "idle";
    setPhase("idle");
    speedRef.current = 0;
    suspensePulseRef.current = 0;
  }, []);

  const isActive = phase !== "idle" && phase !== "result";
  const isSuspense = phase === "suspense";
  const isSlowing = phase === "slowdown" || phase === "suspense";

  return (
    <div className={`relative w-screen h-screen flex flex-col items-center justify-center overflow-hidden bg-black ${shaking ? "screen-shake" : ""}`}>

      {/* Stars */}
      <div className="stars">
        {stars.map((s) => (
          <div key={s.id} className="star" style={{
            left: `${s.x}%`, top: `${s.y}%`,
            width: s.size, height: s.size,
            "--duration": `${s.duration}s`,
            "--min-opacity": s.minOpacity,
          } as React.CSSProperties} />
        ))}
      </div>

      {/* Atmosphere */}
      <div className="fog" style={{ opacity: 0.4 + tensionLevel * 0.18 }} />
      <div className="vignette" style={{ opacity: 0.5 + tensionLevel * 0.15 }} />
      <div className="scanlines" />

      {/* Suspense bg pulse */}
      {isSuspense && (
        <div className="fixed inset-0 pointer-events-none" style={{
          zIndex: 2,
          background: "radial-gradient(ellipse 55% 55% at 50% 50%, rgba(139,0,0,0.1) 0%, transparent 70%)",
          animation: "tensionPulse 0.38s ease-in-out infinite alternate",
        }} />
      )}

      {/* Lightning */}
      {lightningOn && <div className="lightning" />}

      {/* Particles */}
      {particles.map((p) => (
        <div key={p.id} className="particle" style={{
          left: p.x, top: p.y, width: p.size, height: p.size,
          background: p.color,
          boxShadow: `0 0 ${p.size * 2}px ${p.color}, 0 0 ${p.size * 4}px ${p.color}66`,
          "--tx": `${p.tx}px`, "--ty": `${p.ty}px`, "--duration": `${p.duration}s`,
        } as React.CSSProperties} />
      ))}

      {/* ── Centred content column ── */}
      <div className="relative z-10 flex flex-col items-center justify-center gap-4 w-full select-none"
        style={{ maxWidth: canvasSize + 80 }}>

        {/* Title */}
        <div className="flex flex-col items-center gap-1 text-center w-full">
          <h1 className="title-main" style={{
            textShadow: tensionLevel >= 2
              ? `0 0 ${20 + tensionLevel * 14}px rgba(201,168,76,0.9), 0 0 60px rgba(255,69,0,${tensionLevel * 0.28})`
              : undefined,
          }}>КОЛЕСО РОКА</h1>
          <p className="subtitle">вращай — и судьба решит за тебя</p>
          <div className="ornament mt-1">⸻ ✦ ⸻</div>
        </div>

        {/* Wheel */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: "100%" }}>
          <div className="wheel-container"
            style={{ width: canvasSize + 60, height: canvasSize + 60, flexShrink: 0 }}>

            <div className={`tension-ring ${isActive ? "active" : ""}`}
              style={{
                width: canvasSize + 16, height: canvasSize + 16, left: 22, top: 22,
                ...(isSuspense ? {
                  boxShadow: `0 0 ${40 + tensionLevel * 18}px rgba(255,69,0,${0.55 + tensionLevel * 0.1}), 0 0 90px rgba(200,0,0,0.25)`,
                } : {}),
              }} />

            <div className={`wheel-glow ${isActive ? "wheel-spinning" : ""}`}
              style={{ width: canvasSize, height: canvasSize, left: 30, top: 30 }} />

            <div className="wheel-pointer" style={{ top: 6 }} />

            <canvas ref={canvasRef} width={canvasSize} height={canvasSize}
              style={{ display: "block", margin: "30px auto 0" }} />
          </div>
        </div>

        {/* Suspense message slot */}
        <div style={{ height: 26, display: "flex", alignItems: "center", justifyContent: "center", width: "100%" }}>
          {suspenseMsg && isSuspense && (
            <p style={{
              fontFamily: "'Cinzel', serif",
              fontSize: "0.75rem",
              letterSpacing: "0.38em",
              textTransform: "uppercase",
              color: `rgba(255,${Math.max(0, 80 - tensionLevel * 25)},0,0.95)`,
              animation: "fogPulse 0.3s ease-in-out infinite alternate",
              textShadow: "0 0 12px rgba(255,40,0,0.8)",
              textAlign: "center",
            }}>{suspenseMsg}</p>
          )}
        </div>

        {/* CTA button */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
          {phase === "idle" && (
            <button className="spin-btn" onClick={spin}>✦ ВРАЩАТЬ КОЛЕСО ✦</button>
          )}
          {(phase === "buildup" || phase === "spinning") && (
            <>
              <button className="spin-btn" disabled>⚡ КРУТИТСЯ...</button>
              <p style={{ fontFamily: "'Cinzel',serif", fontSize: "0.7rem", letterSpacing: "0.38em",
                color: "rgba(201,168,76,0.55)", textTransform: "uppercase" }}>
                СУДЬБА ПЛЕТЁТ НИТ РОКА
              </p>
            </>
          )}
          {isSlowing && (
            <button className="spin-btn" disabled style={{
              background: tensionLevel >= 2
                ? "linear-gradient(135deg,#3a0000 0%,#8b0000 40%,#cc2200 60%,#8b0000 80%,#3a0000 100%)"
                : undefined,
              borderColor: tensionLevel >= 2 ? "#cc0000" : undefined,
              color: tensionLevel >= 2 ? "#ff5555" : undefined,
            }}>
              {tensionLevel >= 3 ? "⚡ РЕШАЕТСЯ..." : "🔥 ЗАМЕДЛЯЕТСЯ..."}
            </button>
          )}
          {phase === "result" && (
            <button className="spin-btn" onClick={reset}
              style={{ fontSize: "0.85rem", padding: "12px 36px" }}>
              ↺ СПРОСИТЬ СНОВА
            </button>
          )}
        </div>

      </div>

      {/* Result overlay */}
      {showResult && result !== null && (
        <div className="result-overlay" onClick={reset} style={{ cursor: "pointer" }}>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14 }}>
            <div className={`result-text ${result ? "result-yes" : "result-no"}`}>
              {result ? "ДА" : "НЕТ"}
            </div>
            <p style={{
              fontFamily: "'Cinzel',serif", fontSize: "0.75rem", letterSpacing: "0.42em",
              color: "rgba(232,220,200,0.45)", textTransform: "uppercase",
              animation: "fogPulse 2s ease-in-out infinite alternate",
            }}>нажми, чтобы спросить снова</p>
          </div>
        </div>
      )}
    </div>
  );
}
