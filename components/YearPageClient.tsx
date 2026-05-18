"use client";

import { useRef } from "react";
import { usePageTransition } from "./TransitionProvider";

const YEARS = [2020, 2021, 2022, 2023, 2024, 2025, 2026];
const CARDS_PER_ROW = 10;

function TiltCard({ style }: { style?: React.CSSProperties }) {
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
    if (ref.current)
      ref.current.style.transform = "perspective(600px) rotateY(0deg) rotateX(0deg) scale(1)";
  };

  return (
    <div
      ref={ref}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      style={{
        flexShrink:    0,
        width:         260,
        height:        162,
        borderRadius:  16,
        border:        "1.5px solid rgba(255,255,255,0.12)",
        background:    "#080808",
        transition:    "transform 200ms ease, border-color 200ms ease",
        cursor:        "pointer",
        ...style,
      }}
    />
  );
}

export default function YearPageClient({ year }: { year: number }) {
  const { triggerTransition } = usePageTransition();

  // Width of the scroll canvas: 10 cards × 280px + offset 140px + padding
  const canvasW = CARDS_PER_ROW * 280 + 140 + 128;

  return (
    <main
      style={{
        height:     "100vh",
        overflow:   "hidden",
        paddingTop: 56,
        display:    "flex",
        flexDirection: "column",
      }}
    >
      {/* Header */}
      <div
        style={{
          display:         "flex",
          alignItems:      "flex-start",
          justifyContent:  "space-between",
          padding:         "28px 64px 0",
          flexShrink:      0,
        }}
      >
        {/* Giant year */}
        <h1
          style={{
            fontFamily:  "var(--font-syne)",
            fontWeight:  800,
            fontSize:    "clamp(5rem, 14vw, 13rem)",
            lineHeight:  1,
            color:       "white",
            userSelect:  "none",
          }}
        >
          {year}
        </h1>

        {/* Year nav */}
        <div
          style={{
            display:    "flex",
            gap:        8,
            alignItems: "center",
            paddingTop: 20,
          }}
        >
          {YEARS.map((y) => (
            <button
              key={y}
              onClick={() => triggerTransition(`/${y}`)}
              style={{
                padding:       "6px 16px",
                borderRadius:  999,
                fontSize:      13,
                fontFamily:    "var(--font-inter)",
                fontWeight:    600,
                cursor:        "pointer",
                border:        "none",
                background:    y === year
                  ? "linear-gradient(135deg,#5468E0,#56B4F0)"
                  : "rgba(255,255,255,0.06)",
                color:         y === year ? "#fff" : "rgba(255,255,255,0.4)",
                transition:    "all 200ms ease",
              }}
            >
              {y}
            </button>
          ))}
        </div>
      </div>

      {/* Horizontal scroll area */}
      <div
        style={{
          flex:         1,
          overflowX:    "auto",
          overflowY:    "hidden",
          paddingLeft:  64,
          paddingRight: 64,
          paddingBottom: 40,
          position:     "relative",
        }}
      >
        {/* Scroll canvas */}
        <div
          style={{
            position:  "relative",
            width:     canvasW,
            height:    "100%",
            minHeight: 380,
          }}
        >
          {/* Row 1 — top */}
          <div
            style={{
              position: "absolute",
              top:      0,
              left:     0,
              display:  "flex",
              gap:      20,
              alignItems: "flex-start",
              paddingTop: 24,
            }}
          >
            {Array.from({ length: CARDS_PER_ROW }).map((_, i) => (
              <TiltCard key={i} />
            ))}
          </div>

          {/* Row 2 — bottom, offset right */}
          <div
            style={{
              position: "absolute",
              bottom:   0,
              left:     140,
              display:  "flex",
              gap:      20,
              alignItems: "flex-end",
              paddingBottom: 24,
            }}
          >
            {Array.from({ length: CARDS_PER_ROW }).map((_, i) => (
              <TiltCard key={i} />
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
