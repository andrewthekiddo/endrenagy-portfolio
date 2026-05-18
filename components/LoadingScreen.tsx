"use client";

import { useEffect, useState } from "react";

const frames = ["EN", "//", "▓▓", "EN"];

export default function LoadingScreen() {
  const [frame, setFrame]     = useState(0);
  const [leaving, setLeaving] = useState(false);
  const [gone, setGone]       = useState(false);

  useEffect(() => {
    // Skip on revisits within the session
    if (sessionStorage.getItem("loaded")) { setGone(true); return; }

    let i = 0;
    const interval = setInterval(() => {
      i++;
      setFrame(i);
      if (i >= frames.length - 1) clearInterval(interval);
    }, 280);

    const leaveTimer = setTimeout(() => setLeaving(true), 1600);
    const goneTimer  = setTimeout(() => {
      setGone(true);
      sessionStorage.setItem("loaded", "1");
    }, 2300);

    return () => {
      clearInterval(interval);
      clearTimeout(leaveTimer);
      clearTimeout(goneTimer);
    };
  }, []);

  if (gone) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        background: "#080808",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        transition: "transform 700ms cubic-bezier(0.76,0,0.24,1), opacity 700ms ease",
        transform: leaving ? "translateY(-100%)" : "translateY(0)",
        opacity:   leaving ? 0 : 1,
        pointerEvents: leaving ? "none" : "all",
      }}
    >
      {/* Blue pill / logo mark */}
      <div
        style={{
          width: 120,
          height: 120,
          borderRadius: leaving ? "50%" : frame < 2 ? "24px" : "50%",
          background: "linear-gradient(160deg, #5468E0, #56B4F0)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          transition: "border-radius 300ms ease, transform 300ms ease",
          transform: leaving ? "scale(0.8)" : "scale(1)",
        }}
      >
        <span
          style={{
            fontFamily: "var(--font-syne), sans-serif",
            fontWeight: 800,
            fontSize: frame === 1 ? 36 : 34,
            color: "#080808",
            letterSpacing: frame === 1 ? "0.05em" : "0.02em",
            transition: "font-size 200ms ease, letter-spacing 200ms ease",
            userSelect: "none",
          }}
        >
          {frames[frame]}
        </span>
      </div>
    </div>
  );
}
