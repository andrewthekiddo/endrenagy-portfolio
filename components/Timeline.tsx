"use client";

import { useEffect, useRef, useState } from "react";

const years = [2020, 2021, 2022, 2023, 2024, 2025, 2026];

export default function Timeline() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setVisible(true); },
      { threshold: 0.25 }
    );
    if (sectionRef.current) observer.observe(sectionRef.current);
    return () => observer.disconnect();
  }, []);

  return (
    <section ref={sectionRef} className="px-16 py-24">

      {/* FOLLOW MY JOURNEY */}
      <div className="mb-16 overflow-hidden">
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

        {/* Blue arrow underline */}
        <div
          style={{
            opacity: visible ? 1 : 0,
            transition: "opacity 600ms ease 300ms",
          }}
        >
          <svg
            width="100%"
            height="32"
            viewBox="0 0 1000 32"
            preserveAspectRatio="none"
            style={{ display: "block" }}
          >
            <defs>
              <linearGradient id="arrow-grad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#5468E0" />
                <stop offset="100%" stopColor="#56B4F0" />
              </linearGradient>
              <marker
                id="arrowhead"
                markerWidth="10"
                markerHeight="7"
                refX="10"
                refY="3.5"
                orient="auto"
              >
                <polygon points="0 0, 10 3.5, 0 7" fill="url(#arrow-grad)" />
              </marker>
            </defs>
            <line
              x1="0" y1="16" x2="985" y2="16"
              stroke="url(#arrow-grad)"
              strokeWidth="3"
              markerEnd="url(#arrowhead)"
              style={{
                strokeDasharray: 1000,
                strokeDashoffset: visible ? 0 : 1000,
                transition: "stroke-dashoffset 1000ms cubic-bezier(0.4,0,0.2,1) 200ms",
              }}
            />
          </svg>
        </div>
      </div>

      {/* Timeline */}
      <div className="relative py-4">

        {/* Track */}
        <div className="absolute left-0 right-0" style={{ top: "10px", height: "2px", background: "rgba(255,255,255,0.1)" }}>
          <div
            style={{
              height: "100%",
              background: "rgba(255,255,255,0.25)",
              width: visible ? "100%" : "0%",
              transition: "width 1200ms cubic-bezier(0.4,0,0.2,1) 400ms",
            }}
          />
        </div>

        {/* Dots + labels */}
        <div className="relative flex justify-between">
          {years.map((year, i) => {
            const isLast = year === 2026;
            return (
              <div
                key={year}
                className="flex flex-col items-center"
                style={{
                  opacity: visible ? 1 : 0,
                  transform: visible ? "translateY(0)" : "translateY(12px)",
                  transition: `opacity 400ms ease ${600 + i * 80}ms, transform 400ms ease ${600 + i * 80}ms`,
                }}
              >
                <button
                  className="relative group"
                  style={{ width: 20, height: 20 }}
                  aria-label={`Year ${year}`}
                >
                  {/* Glow ring on hover */}
                  <span
                    className="absolute inset-0 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                    style={{
                      background: "linear-gradient(135deg, #5468E0, #56B4F0)",
                      filter: "blur(6px)",
                      transform: "scale(1.8)",
                    }}
                  />
                  {/* Dot */}
                  <span
                    className="absolute inset-0 rounded-full transition-transform duration-300 group-hover:scale-125"
                    style={{
                      background: isLast
                        ? "linear-gradient(135deg, #5468E0, #56B4F0)"
                        : "linear-gradient(135deg, #5468E0, #56B4F0)",
                      boxShadow: "0 0 10px #5468E066",
                    }}
                  />
                </button>

                <span
                  className="mt-4 text-xs font-sans font-medium tracking-widest"
                  style={{ color: isLast ? "#56B4F0" : "rgba(255,255,255,0.45)" }}
                >
                  {year}
                </span>
              </div>
            );
          })}
        </div>
      </div>

    </section>
  );
}
