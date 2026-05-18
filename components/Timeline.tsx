"use client";

import { useEffect, useRef, useState } from "react";
import { usePageTransition } from "./TransitionProvider";

const YEARS = [2020, 2021, 2022, 2023, 2024, 2025, 2026];

export default function Timeline() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const { triggerTransition } = usePageTransition();

  useEffect(() => {
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) setVisible(true); },
      { threshold: 0.2 }
    );
    if (sectionRef.current) obs.observe(sectionRef.current);
    return () => obs.disconnect();
  }, []);

  return (
    <section ref={sectionRef} className="relative py-24 overflow-hidden">

      {/* Heading */}
      <div className="px-16 mb-16">
        <h2
          className="font-display font-extrabold leading-none mb-6"
          style={{
            fontSize:   "clamp(3rem, 7vw, 7rem)",
            opacity:    visible ? 1 : 0,
            transform:  visible ? "translateY(0)" : "translateY(40px)",
            transition: "opacity 700ms ease, transform 700ms ease",
          }}
        >
          FOLLOW MY JOURNEY
        </h2>

        {/* Animated arrow */}
        <svg
          width="100%" height="32" viewBox="0 0 1000 32"
          preserveAspectRatio="none"
          style={{
            display:    "block",
            opacity:    visible ? 1 : 0,
            transition: "opacity 600ms ease 300ms",
          }}
        >
          <defs>
            <linearGradient id="ag" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%"   stopColor="#5468E0" />
              <stop offset="100%" stopColor="#56B4F0" />
            </linearGradient>
            <marker id="ah" markerWidth="10" markerHeight="7" refX="10" refY="3.5" orient="auto">
              <polygon points="0 0, 10 3.5, 0 7" fill="url(#ag)" />
            </marker>
          </defs>
          <line
            x1="0" y1="16" x2="985" y2="16"
            stroke="url(#ag)" strokeWidth="3" markerEnd="url(#ah)"
            style={{
              strokeDasharray:  1000,
              strokeDashoffset: visible ? 0 : 1000,
              transition:       "stroke-dashoffset 1000ms cubic-bezier(0.4,0,0.2,1) 200ms",
            }}
          />
        </svg>
      </div>

      {/* Year pills */}
      <div
        className="px-16 flex items-center gap-3 flex-wrap"
        style={{
          opacity:    visible ? 1 : 0,
          transition: "opacity 500ms ease 600ms",
        }}
      >
        {YEARS.map((year, i) => (
          <button
            key={year}
            onClick={() => triggerTransition(`/${year}`)}
            style={{
              padding:    "12px 32px",
              borderRadius: 999,
              fontSize:   "clamp(0.9rem, 2vw, 1.1rem)",
              fontFamily: "var(--font-syne)",
              fontWeight: 800,
              border:     "1.5px solid rgba(255,255,255,0.12)",
              background: "rgba(255,255,255,0.04)",
              color:      "rgba(255,255,255,0.6)",
              cursor:     "pointer",
              transition: "all 220ms ease",
              opacity:    visible ? 1 : 0,
              transform:  visible ? "translateY(0)" : "translateY(20px)",
              transitionDelay: `${700 + i * 60}ms`,
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background =
                "linear-gradient(135deg,#5468E0,#56B4F0)";
              (e.currentTarget as HTMLButtonElement).style.color = "#fff";
              (e.currentTarget as HTMLButtonElement).style.borderColor = "transparent";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background =
                "rgba(255,255,255,0.04)";
              (e.currentTarget as HTMLButtonElement).style.color =
                "rgba(255,255,255,0.6)";
              (e.currentTarget as HTMLButtonElement).style.borderColor =
                "rgba(255,255,255,0.12)";
            }}
          >
            {year}
          </button>
        ))}
      </div>

    </section>
  );
}
