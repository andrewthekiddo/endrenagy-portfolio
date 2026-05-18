"use client";

import { useEffect, useRef, useState, useCallback } from "react";

// ─── constants ───────────────────────────────────────────────────────────────

const YEARS = [2020, 2021, 2022, 2023, 2024, 2025, 2026];

// Precomputed speed lines (no Math.random in render → no hydration mismatch)
const SPEED_LINES = Array.from({ length: 28 }, (_, i) => ({
  top:      ((i * 19) % 97) + 1,           // % of container height
  width:    25 + ((i * 37) % 65),          // % of container width
  opacity:  0.06 + ((i * 13) % 22) / 100,
  delay:    (i * 11) % 180,               // ms
  duration: 200 + (i * 17) % 200,         // ms
}));

// Cards per year: 6 top + 6 bottom = 12 placeholder cards
const CARDS_PER_ROW = 6;

// ─── sub-components ──────────────────────────────────────────────────────────

function SpeedLines({ active }: { active: boolean }) {
  return (
    <div
      className="absolute inset-0 pointer-events-none overflow-hidden"
      style={{ zIndex: 20 }}
      aria-hidden
    >
      {SPEED_LINES.map((line, i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            left: 0,
            top: `${line.top}%`,
            height: "1px",
            background: "white",
            opacity: active ? line.opacity : 0,
            width: active ? `${line.width}%` : "0%",
            transition: active
              ? `width ${line.duration}ms ease-out ${line.delay}ms, opacity ${line.duration}ms ease-out ${line.delay}ms`
              : "width 0ms, opacity 150ms ease",
          }}
        />
      ))}
    </div>
  );
}

function TiltCard({ children, style }: { children?: React.ReactNode; style?: React.CSSProperties }) {
  const ref = useRef<HTMLDivElement>(null);

  const onMove = (e: React.MouseEvent) => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width  - 0.5;
    const y = (e.clientY - r.top)  / r.height - 0.5;
    el.style.transform = `perspective(600px) rotateY(${x * 14}deg) rotateX(${-y * 14}deg) scale(1.04)`;
  };

  const onLeave = () => {
    if (ref.current) ref.current.style.transform = "perspective(600px) rotateY(0deg) rotateX(0deg) scale(1)";
  };

  return (
    <div
      ref={ref}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      style={{
        flexShrink: 0,
        width: 260,
        height: 162,
        borderRadius: 16,
        border: "1.5px solid rgba(255,255,255,0.18)",
        background: "#080808",
        transition: "transform 200ms ease, border-color 200ms ease",
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        ...style,
      }}
    >
      {children}
    </div>
  );
}

// ─── rocket scroll ────────────────────────────────────────────────────────────

function rocketScrollTo(el: HTMLElement, targetX: number, onDone: () => void) {
  const startX = el.scrollLeft;
  const dist   = targetX - startX;
  if (dist === 0) { onDone(); return; }
  const duration = Math.min(900, 400 + Math.abs(dist) * 0.12);
  let start: number | null = null;

  // Rocket easing: fast out, gentle in
  const ease = (t: number) => t < 0.5
    ? 4 * t * t * t
    : 1 - Math.pow(-2 * t + 2, 3) / 2;

  function step(ts: number) {
    if (!start) start = ts;
    const t = Math.min((ts - start) / duration, 1);
    el.scrollLeft = startX + dist * ease(t);
    if (t < 1) requestAnimationFrame(step);
    else onDone();
  }
  requestAnimationFrame(step);
}

// ─── main component ───────────────────────────────────────────────────────────

export default function Timeline() {
  const sectionRef  = useRef<HTMLDivElement>(null);
  const scrollRef   = useRef<HTMLDivElement>(null);
  const panelRefs   = useRef<(HTMLDivElement | null)[]>([]);

  const [visible,       setVisible]       = useState(false);
  const [activeYear,    setActiveYear]    = useState(YEARS[0]);
  const [transitioning, setTransitioning] = useState(false);

  // Intersection observer — trigger entrance animation
  useEffect(() => {
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) setVisible(true); },
      { threshold: 0.2 }
    );
    if (sectionRef.current) obs.observe(sectionRef.current);
    return () => obs.disconnect();
  }, []);

  const goToYear = useCallback((year: number) => {
    if (transitioning || year === activeYear) return;
    const idx = YEARS.indexOf(year);
    const panel = panelRefs.current[idx];
    const scroll = scrollRef.current;
    if (!panel || !scroll) return;

    setTransitioning(true);
    setActiveYear(year);

    rocketScrollTo(scroll, panel.offsetLeft, () => {
      setTimeout(() => setTransitioning(false), 200);
    });
  }, [transitioning, activeYear]);

  return (
    <section ref={sectionRef} className="relative py-24 overflow-hidden">

      {/* ── FOLLOW MY JOURNEY heading ── */}
      <div className="px-16 mb-16">
        <h2
          className="font-display font-extrabold leading-none mb-6"
          style={{
            fontSize: "clamp(3rem, 7vw, 7rem)",
            opacity: visible ? 1 : 0,
            transform: visible ? "translateY(0)" : "translateY(40px)",
            transition: "opacity 700ms ease, transform 700ms ease",
          }}
        >
          FOLLOW MY JOURNEY
        </h2>

        {/* Arrow */}
        <svg
          width="100%" height="32" viewBox="0 0 1000 32"
          preserveAspectRatio="none"
          style={{
            display: "block",
            opacity: visible ? 1 : 0,
            transition: "opacity 600ms ease 300ms",
          }}
        >
          <defs>
            <linearGradient id="ag" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#5468E0" />
              <stop offset="100%" stopColor="#56B4F0" />
            </linearGradient>
            <marker id="ah" markerWidth="10" markerHeight="7" refX="10" refY="3.5" orient="auto">
              <polygon points="0 0, 10 3.5, 0 7" fill="url(#ag)" />
            </marker>
          </defs>
          <line x1="0" y1="16" x2="985" y2="16"
            stroke="url(#ag)" strokeWidth="3" markerEnd="url(#ah)"
            style={{
              strokeDasharray: 1000,
              strokeDashoffset: visible ? 0 : 1000,
              transition: "stroke-dashoffset 1000ms cubic-bezier(0.4,0,0.2,1) 200ms",
            }}
          />
        </svg>
      </div>

      {/* ── Year nav ── */}
      <div
        className="px-16 mb-8 flex items-center gap-2"
        style={{
          opacity: visible ? 1 : 0,
          transition: "opacity 500ms ease 500ms",
        }}
      >
        {YEARS.map((year) => (
          <button
            key={year}
            onClick={() => goToYear(year)}
            className="px-4 py-1.5 rounded-full text-sm font-sans font-semibold transition-all duration-250"
            style={
              activeYear === year
                ? { background: "linear-gradient(135deg,#5468E0,#56B4F0)", color: "#fff" }
                : { background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.45)" }
            }
          >
            {year}
          </button>
        ))}
      </div>

      {/* ── Horizontal scroll panel ── */}
      <div
        className="relative"
        style={{
          opacity: visible ? 1 : 0,
          transition: "opacity 500ms ease 600ms",
        }}
      >
        {/* Speed lines */}
        <SpeedLines active={transitioning} />

        {/* Scroll container */}
        <div
          ref={scrollRef}
          style={{
            overflowX: "hidden",
            overflowY: "visible",
            display: "flex",
            scrollBehavior: "auto",
            paddingBottom: "8px",
          }}
        >
          {YEARS.map((year, yi) => (
            <div
              key={year}
              ref={(el) => { panelRefs.current[yi] = el; }}
              style={{
                flexShrink: 0,
                width: "100vw",
                paddingLeft: 64,
                paddingRight: 64,
                paddingTop: 8,
                paddingBottom: 40,
                position: "relative",
              }}
            >
              {/* Year label */}
              <p className="text-[11px] font-sans font-medium tracking-widest text-white/25 mb-6 uppercase">
                {year}
              </p>

              {/* Two staggered rows */}
              <div style={{ position: "relative", height: 400 }}>

                {/* Row 1 — top */}
                <div
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    display: "flex",
                    gap: 20,
                  }}
                >
                  {Array.from({ length: CARDS_PER_ROW }).map((_, i) => (
                    <TiltCard key={`top-${i}`} />
                  ))}
                </div>

                {/* Row 2 — bottom, offset right by half card + half gap */}
                <div
                  style={{
                    position: "absolute",
                    bottom: 0,
                    left: 140,        // 260/2 + 20/2 = 140px offset
                    display: "flex",
                    gap: 20,
                  }}
                >
                  {Array.from({ length: CARDS_PER_ROW }).map((_, i) => (
                    <TiltCard key={`bot-${i}`} />
                  ))}
                </div>

              </div>
            </div>
          ))}
        </div>
      </div>

    </section>
  );
}
