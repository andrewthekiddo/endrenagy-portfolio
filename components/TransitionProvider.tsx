"use client";

import { createContext, useContext, useRef, useState, useCallback, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";

interface Ctx {
  triggerTransition: (href: string) => void;
}

const TransitionCtx = createContext<Ctx>({ triggerTransition: () => {} });

export function usePageTransition() {
  return useContext(TransitionCtx);
}

// Precomputed speed lines — no Math.random
const LINES = Array.from({ length: 50 }, (_, i) => ({
  top:     ((i * 19) % 97) + 1.5,
  width:   15 + ((i * 41) % 75),
  opacity: 0.04 + ((i * 17) % 28) / 100,
  delay:   (i * 9) % 130,
}));

type Phase = "idle" | "covering" | "covered" | "revealing";

export function TransitionProvider({ children }: { children: React.ReactNode }) {
  const router    = useRouter();
  const pathname  = usePathname();
  const [phase, setPhase] = useState<Phase>("idle");
  const phaseRef  = useRef<Phase>("idle");
  const prevPath  = useRef(pathname);
  const pending   = useRef<string | null>(null);

  const setP = (p: Phase) => { phaseRef.current = p; setPhase(p); };

  // When pathname changes → new page is ready → start reveal
  useEffect(() => {
    if (pathname !== prevPath.current) {
      prevPath.current = pathname;
      if (phaseRef.current === "covered") {
        // Two rAF frames so new page content has painted
        requestAnimationFrame(() => requestAnimationFrame(() => {
          setP("revealing");
          setTimeout(() => setP("idle"), 520);
        }));
      }
    }
  }, [pathname]);

  const triggerTransition = useCallback((href: string) => {
    if (href === pathname || phaseRef.current !== "idle") return;
    pending.current = href;
    setP("covering");
    setTimeout(() => {
      setP("covered");
      if (pending.current) router.push(pending.current);
    }, 290);
  }, [pathname, router]);

  // Overlay position
  const transform =
    phase === "idle"      ? "translateX(100%)" :
    phase === "covering"  ? "translateX(0%)"   :
    phase === "covered"   ? "translateX(0%)"   :
                            "translateX(-100%)";

  const transition =
    phase === "covering"  ? "transform 290ms cubic-bezier(0.9,0,0.15,1)" :
    phase === "revealing" ? "transform 520ms cubic-bezier(0.85,0,0.15,1)" :
                            "none";

  const linesOn = phase === "covering" || phase === "covered";

  return (
    <TransitionCtx.Provider value={{ triggerTransition }}>
      {children}

      {/* Full-screen transition overlay */}
      <div
        aria-hidden
        style={{
          position:      "fixed",
          inset:         0,
          zIndex:        9998,
          background:    "#080808",
          transform,
          transition,
          pointerEvents: phase === "idle" ? "none" : "all",
          overflow:      "hidden",
        }}
      >
        {LINES.map((l, i) => (
          <div
            key={i}
            style={{
              position:   "absolute",
              left:       0,
              top:        `${l.top}%`,
              height:     "1px",
              background: "white",
              opacity:    linesOn ? l.opacity : 0,
              width:      linesOn ? `${l.width}%` : "0%",
              transition: linesOn
                ? `width 240ms ease-out ${l.delay}ms, opacity 240ms ease-out ${l.delay}ms`
                : "none",
            }}
          />
        ))}
      </div>
    </TransitionCtx.Provider>
  );
}
