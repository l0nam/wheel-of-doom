"use client";

import { useEffect, useRef, useState, useCallback } from "react";

// ─── types ────────────────────────────────────────────────────────────────────
type Phase = "idle" | "weighing" | "suspense" | "result";

interface Dot {
  id: number;
  tx: number; ty: number;
  color: string; size: number;
  duration: number;
}

// ─── physics constants ────────────────────────────────────────────────────────
const IDLE_AMPLITUDE  = 2;
const MAX_TILT        = 22;
const WEIGH_SPEED     = 0.002;
const SUSPENSE_DAMP   = 0.94;
const SETTLE_SPEED    = 0.006;

// ─── canvas helpers ───────────────────────────────────────────────────────────
function drawScales(
  canvas: HTMLCanvasElement,
  tilt: number,          // degrees, positive = right side down
  phase: Phase,
  result: boolean | null,
  pulseT: number         // 0‥1 for suspense pulse
) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const W = canvas.width, H = canvas.height;
  ctx.clearRect(0, 0, W, H);

  const cx = W / 2;
  const pivotY = H * 0.28;
  const armLen = W * 0.36;
  const tiltRad = (tilt * Math.PI) / 180;

  // ── colour tokens ──
  const isResult = phase === "result";
  const dimCol    = "#2a2a2a";
  const chainCol  = "#252525";
  const armCol    = isResult && result !== null
    ? (result ? "rgba(220,220,220,0.9)" : "rgba(160,40,35,0.85)") : "#333";
  const dishGlow  = isResult && result !== null
    ? (result ? "rgba(240,240,240," : "rgba(192,57,43,") : "rgba(255,255,255,";

  // ── suspense pulse alpha ──
  const pa = 0.08 + pulseT * 0.14;

  // ── central pillar ──
  const pillarH = pivotY * 0.82;
  const pillarW = 2;
  ctx.strokeStyle = dimCol;
  ctx.lineWidth = pillarW;
  ctx.beginPath();
  ctx.moveTo(cx, pivotY + 6);
  ctx.lineTo(cx, pivotY + pillarH);
  ctx.stroke();

  // base ornament
  const baseY = pivotY + pillarH;
  ctx.strokeStyle = dimCol;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(cx - 22, baseY);
  ctx.lineTo(cx + 22, baseY);
  ctx.stroke();
  // tiny tick marks
  [-22, -11, 0, 11, 22].forEach(x => {
    ctx.beginPath();
    ctx.moveTo(cx + x, baseY);
    ctx.lineTo(cx + x, baseY + 5);
    ctx.stroke();
  });

  // ── pivot dot ──
  ctx.beginPath();
  ctx.arc(cx, pivotY, 4, 0, Math.PI * 2);
  ctx.fillStyle = isResult ? armCol : "#3a3a3a";
  ctx.fill();

  // ── arm (beam) ──
  const leftX  = cx - Math.cos(tiltRad) * armLen;
  const leftY  = pivotY - Math.sin(tiltRad) * armLen;
  const rightX = cx + Math.cos(tiltRad) * armLen;
  const rightY = pivotY + Math.sin(tiltRad) * armLen;

  ctx.strokeStyle = armCol;
  ctx.lineWidth = 1.5;
  ctx.shadowColor = isResult ? armCol : "transparent";
  ctx.shadowBlur  = isResult ? 12 : 0;
  ctx.beginPath();
  ctx.moveTo(leftX, leftY);
  ctx.lineTo(rightX, rightY);
  ctx.stroke();
  ctx.shadowBlur = 0;

  // ── chains + dishes ──
  const chainLen = H * 0.22;
  const dishR    = W * 0.115;
  const dishH    = dishR * 0.28;

  [
    { x: leftX,  y: leftY,  side: "left",  isYes: true  },
    { x: rightX, y: rightY, side: "right", isYes: false },
  ].forEach(({ x, y, isYes }) => {
    const dishCY = y + chainLen;

    // chain (3 segments)
    for (let i = 0; i < 3; i++) {
      const t0 = i / 3, t1 = (i + 1) / 3;
      ctx.strokeStyle = chainCol;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x, y + chainLen * t0);
      ctx.lineTo(x, y + chainLen * t1);
      ctx.stroke();
      // chain link dot
      ctx.beginPath();
      ctx.arc(x, y + chainLen * t0, 1.2, 0, Math.PI * 2);
      ctx.fillStyle = "#303030";
      ctx.fill();
    }

    // dish shadow / glow
    const isActive = isResult && (isYes === result);
    if (isActive) {
      ctx.beginPath();
      ctx.ellipse(x, dishCY + dishH * 0.5, dishR * 1.1, dishH * 0.8, 0, 0, Math.PI * 2);
      ctx.fillStyle = isYes
        ? `rgba(240,240,240,0.06)` : `rgba(192,57,43,0.1)`;
      ctx.fill();
    }

    // suspense glow on both dishes
    if (phase === "suspense") {
      ctx.beginPath();
      ctx.ellipse(x, dishCY + dishH * 0.5, dishR * 1.05, dishH * 0.75, 0, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255,255,255,${pa})`;
      ctx.fill();
    }

    // dish shape (elliptic arc)
    ctx.beginPath();
    ctx.ellipse(x, dishCY + dishH * 0.5, dishR, dishH, 0, 0, Math.PI);
    ctx.strokeStyle = isActive
      ? (isYes ? "rgba(220,220,220,0.85)" : "rgba(192,57,43,0.9)")
      : (phase === "weighing" || phase === "suspense" ? "#3a3a3a" : "#282828");
    ctx.lineWidth = 1.5;
    ctx.shadowColor = isActive
      ? (isYes ? "rgba(255,255,255,0.5)" : "rgba(220,60,50,0.6)")
      : "transparent";
    ctx.shadowBlur = isActive ? 18 : 0;
    ctx.stroke();
    ctx.shadowBlur = 0;

    // dish rim line
    ctx.beginPath();
    ctx.moveTo(x - dishR, dishCY + dishH * 0.5);
    ctx.lineTo(x + dishR, dishCY + dishH * 0.5);
    ctx.strokeStyle = isActive
      ? (isYes ? "rgba(220,220,220,0.5)" : "rgba(192,57,43,0.5)")
      : "#222";
    ctx.lineWidth = 1;
    ctx.stroke();

    // label inside dish
    const label = isYes ? "ДА" : "НЕТ";
    ctx.font = `300 ${Math.floor(W * 0.048)}px 'DM Mono', monospace`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = isActive
      ? (isYes ? "rgba(240,240,240,0.9)" : "rgba(220,80,70,0.95)")
      : (phase === "weighing" || phase === "suspense" ? "#3a3a3a" : "#252525");
    ctx.shadowColor = isActive
      ? (isYes ? "rgba(255,255,255,0.6)" : "rgba(220,60,50,0.7)")
      : "transparent";
    ctx.shadowBlur = isActive ? 14 : 0;
    ctx.fillText(label, x, dishCY + dishH * 0.5 + 1);
    ctx.shadowBlur = 0;
  });
}

// ─── component ────────────────────────────────────────────────────────────────
export default function ScalesOfFate() {
  const canvasRef   = useRef<HTMLCanvasElement>(null);
  const rafRef      = useRef<number>(0);
  const tiltRef     = useRef<number>(0);
  const velRef      = useRef<number>(0);
  const timeRef     = useRef<number>(0);
  const phaseRef    = useRef<Phase>("idle");
  const resultRef   = useRef<boolean>(false);
  const pulseRef    = useRef<number>(0);
  const pulseDirRef = useRef<number>(1);

  const [phase, setPhase]         = useState<Phase>("idle");
  const [result, setResult]       = useState<boolean | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [flash, setFlash]         = useState<string | null>(null);
  const [dots, setDots]           = useState<Dot[]>([]);
  const [canvasSize, setCanvasSize] = useState(420);
  const [statusText, setStatusText] = useState("");

  const STATUS = [
    "вселенная взвешивает...",
    "баланс нестабилен...",
    "чаши колеблются...",
    "момент истины близок...",
    "решение формируется...",
  ];

  // resize
  useEffect(() => {
    const resize = () => {
      const vmin = Math.min(window.innerWidth, window.innerHeight);
      setCanvasSize(Math.min(Math.floor(vmin * 0.56), 500));
    };
    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, []);

  // main animation loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    cancelAnimationFrame(rafRef.current);

    const tick = (ts: number) => {
      const dt = Math.min(ts - timeRef.current, 50);
      timeRef.current = ts;
      const p = phaseRef.current;

      if (p === "idle") {
        // gentle pendulum sway
        tiltRef.current = Math.sin(ts * 0.0008) * IDLE_AMPLITUDE;
      } else if (p === "weighing") {
        // faster erratic oscillation
        const osc = Math.sin(ts * WEIGH_SPEED) * 14
                  + Math.sin(ts * WEIGH_SPEED * 2.3) * 6
                  + Math.sin(ts * WEIGH_SPEED * 5.1) * 2.5;
        tiltRef.current = osc;
      } else if (p === "suspense") {
        // damp toward 0 then stall near 0
        velRef.current  *= SUSPENSE_DAMP;
        tiltRef.current += velRef.current * dt * 0.02;
        // pulse
        pulseRef.current += 0.04 * pulseDirRef.current;
        if (pulseRef.current >= 1) pulseDirRef.current = -1;
        if (pulseRef.current <= 0) pulseDirRef.current =  1;
      } else if (p === "result") {
        const target = resultRef.current ? -MAX_TILT : MAX_TILT;
        const diff   = target - tiltRef.current;
        tiltRef.current += diff * SETTLE_SPEED;
      }

      drawScales(
        canvas,
        tiltRef.current,
        phaseRef.current,
        result,
        pulseRef.current
      );

      rafRef.current = requestAnimationFrame(tick);
    };

    timeRef.current = performance.now();
    rafRef.current  = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [canvasSize, result]);

  // status text cycle
  const statusRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startStatusCycle = () => {
    let i = 0;
    setStatusText(STATUS[0]);
    statusRef.current = setInterval(() => {
      i = (i + 1) % STATUS.length;
      if (phaseRef.current === "weighing" || phaseRef.current === "suspense") {
        setStatusText(STATUS[i]);
      }
    }, 1100);
  };

  const stopStatusCycle = () => {
    if (statusRef.current) clearInterval(statusRef.current);
    setStatusText("");
  };

  // spawn dots
  const spawnDots = (isYes: boolean) => {
    const color = isYes ? "#e0e0e0" : "#c0392b";
    const cx = window.innerWidth / 2;
    const cy = window.innerHeight * 0.5;
    setDots(Array.from({ length: 55 }, (_, i) => {
      const angle = Math.random() * Math.PI * 2;
      const dist  = 80 + Math.random() * 380;
      return {
        id: Date.now() + i,
        tx: Math.cos(angle) * dist,
        ty: Math.sin(angle) * dist,
        color,
        size: Math.random() * 4 + 1.5,
        duration: Math.random() * 1.4 + 0.8,
      };
    }));
    setTimeout(() => setDots([]), 3000);
  };

  const triggerResult = useCallback((isYes: boolean) => {
    resultRef.current = isYes;
    phaseRef.current  = "result";
    setPhase("result");
    setResult(isYes);
    stopStatusCycle();

    setFlash(isYes ? "rgba(255,255,255,0.06)" : "rgba(192,57,43,0.08)");
    setTimeout(() => setFlash(null), 600);

    spawnDots(isYes);
    setTimeout(() => setShowResult(true), 500);
  }, []);

  const start = useCallback(() => {
    if (phaseRef.current !== "idle" && phaseRef.current !== "result") return;

    setShowResult(false);
    setResult(null);
    setDots([]);
    stopStatusCycle();
    velRef.current   = 10;
    pulseRef.current = 0;

    const isYes = Math.random() < 0.5;
    resultRef.current = isYes;

    phaseRef.current = "weighing";
    setPhase("weighing");
    startStatusCycle();

    // weighing → suspense
    const weighMs = 3000 + Math.random() * 2500;
    setTimeout(() => {
      if (phaseRef.current === "weighing") {
        phaseRef.current = "suspense";
        setPhase("suspense");
        velRef.current = tiltRef.current * 0.4;
      }
    }, weighMs);

    // suspense → result
    const suspenseMs = 1800 + Math.random() * 1400;
    setTimeout(() => {
      if (phaseRef.current === "suspense") {
        triggerResult(isYes);
      }
    }, weighMs + suspenseMs);
  }, [triggerResult]);

  const reset = useCallback(() => {
    setShowResult(false);
    setResult(null);
    setDots([]);
    stopStatusCycle();
    setStatusText("");
    phaseRef.current = "idle";
    setPhase("idle");
    tiltRef.current  = 0;
    velRef.current   = 0;
  }, []);

  const isActive = phase === "weighing" || phase === "suspense";

  return (
    <div className="relative w-screen h-screen flex flex-col items-center justify-center overflow-hidden"
      style={{ background: "var(--bg)" }}>

      {/* flash */}
      {flash && (
        <div className="flash" style={{ background: flash }} />
      )}

      {/* dots */}
      {dots.map(d => (
        <div key={d.id} style={{
          position: "fixed",
          left: "50%", top: "50%",
          width: d.size, height: d.size,
          borderRadius: "50%",
          background: d.color,
          pointerEvents: "none",
          zIndex: 80,
          animation: `dotFly ${d.duration}s ease-out forwards`,
          "--tx": `${d.tx}px`,
          "--ty": `${d.ty}px`,
        } as React.CSSProperties} />
      ))}

      {/* ── layout column ── */}
      <div style={{
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        gap: 0, width: "100%",
        maxWidth: canvasSize + 80,
        userSelect: "none",
      }}>

        {/* eyebrow */}
        <p style={{
          fontFamily: "'DM Mono', monospace",
          fontWeight: 300,
          fontSize: "0.62rem",
          letterSpacing: "0.45em",
          textTransform: "uppercase",
          color: "var(--text-soft)",
          marginBottom: 20,
        }}>весы судьбы</p>

        {/* canvas */}
        <canvas
          ref={canvasRef}
          width={canvasSize}
          height={canvasSize}
          style={{ display: "block" }}
        />

        {/* status text slot */}
        <div style={{ height: 22, marginTop: 4, display: "flex", alignItems: "center", justifyContent: "center" }}>
          {statusText && (
            <p style={{
              fontFamily: "'DM Mono', monospace",
              fontWeight: 300,
              fontSize: "0.63rem",
              letterSpacing: "0.3em",
              color: phase === "suspense" ? "rgba(200,200,200,0.55)" : "var(--text-soft)",
              textTransform: "lowercase",
              animation: phase === "suspense" ? "blink 0.9s ease-in-out infinite" : "none",
            }}>{statusText}</p>
          )}
        </div>

        {/* result text */}
        <div style={{ height: 72, display: "flex", alignItems: "center", justifyContent: "center", marginTop: 2 }}>
          {showResult && result !== null && (
            <p className="result-reveal" style={{
              fontFamily: "'Cormorant', serif",
              fontWeight: 300,
              fontStyle: "italic",
              fontSize: "clamp(3rem, 10vw, 5rem)",
              letterSpacing: "0.25em",
              color: result ? "var(--yes)" : "var(--no)",
              textShadow: result
                ? "0 0 40px rgba(255,255,255,0.25)"
                : "0 0 40px rgba(192,57,43,0.4)",
            }}>
              {result ? "да" : "нет"}
            </p>
          )}
        </div>

        {/* divider */}
        <div style={{
          width: 1, height: 32,
          background: "linear-gradient(to bottom, var(--border), transparent)",
          marginTop: 8,
        }} />

        {/* button */}
        <div style={{ marginTop: 16 }}>
          {(phase === "idle" || phase === "result") && (
            <button
              onClick={phase === "result" ? reset : start}
              style={{
                fontFamily: "'DM Mono', monospace",
                fontWeight: 400,
                fontSize: "0.72rem",
                letterSpacing: "0.35em",
                textTransform: "uppercase",
                color: "var(--text)",
                background: "transparent",
                border: "1px solid var(--border)",
                padding: "14px 36px",
                cursor: "pointer",
                transition: "border-color 0.25s, color 0.25s",
                outline: "none",
              }}
              onMouseEnter={e => {
                (e.target as HTMLButtonElement).style.borderColor = "#444";
                (e.target as HTMLButtonElement).style.color = "#fff";
              }}
              onMouseLeave={e => {
                (e.target as HTMLButtonElement).style.borderColor = "var(--border)";
                (e.target as HTMLButtonElement).style.color = "var(--text)";
              }}
            >
              {phase === "result" ? "спросить снова" : "взвесить"}
            </button>
          )}

          {isActive && (
            <div style={{
              fontFamily: "'DM Mono', monospace",
              fontWeight: 300,
              fontSize: "0.65rem",
              letterSpacing: "0.4em",
              color: "var(--text-soft)",
              textTransform: "uppercase",
              opacity: 0.5,
              textAlign: "center",
            }}>
              {phase === "suspense" ? "почти..." : "идёт взвешивание"}
            </div>
          )}
        </div>

      </div>
    </div>
  );
    }
