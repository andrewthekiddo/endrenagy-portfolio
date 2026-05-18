"use client";

import { useEffect, useRef, useState } from "react";

interface Slide {
  src: string;
  label?: string;
}

interface VideoSliderProps {
  slides: Slide[];
}

export default function VideoSlider({ slides }: VideoSliderProps) {
  const [current, setCurrent] = useState(0);
  const [prev, setPrev] = useState<number | null>(null);
  const [direction, setDirection] = useState<"left" | "right">("right");
  const [animating, setAnimating] = useState(false);
  const videoRefs = useRef<(HTMLVideoElement | null)[]>([]);

  const goTo = (index: number, dir: "left" | "right") => {
    if (animating || index === current) return;
    setDirection(dir);
    setPrev(current);
    setCurrent(index);
    setAnimating(true);
  };

  const next = () => goTo((current + 1) % slides.length, "right");
  const prev_ = () => goTo((current - 1 + slides.length) % slides.length, "left");

  useEffect(() => {
    if (animating) {
      const t = setTimeout(() => {
        setPrev(null);
        setAnimating(false);
      }, 600);
      return () => clearTimeout(t);
    }
  }, [animating]);

  // Play current, pause others
  useEffect(() => {
    videoRefs.current.forEach((vid, i) => {
      if (!vid) return;
      if (i === current) {
        vid.currentTime = 0;
        vid.play().catch(() => {});
      } else {
        vid.pause();
      }
    });
  }, [current]);

  // Keyboard nav
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") next();
      if (e.key === "ArrowLeft") prev_();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  });

  const getSlideStyle = (index: number): React.CSSProperties => {
    const isActive = index === current;
    const isPrev = index === prev;

    if (isActive && animating) {
      const enterFrom = direction === "right" ? "100%" : "-100%";
      return {
        position: "absolute",
        inset: 0,
        transform: `translateX(0)`,
        animation: `slideIn${direction === "right" ? "Right" : "Left"} 600ms cubic-bezier(0.76, 0, 0.24, 1) forwards`,
      };
    }
    if (isPrev && animating) {
      return {
        position: "absolute",
        inset: 0,
        animation: `slideOut${direction === "right" ? "Left" : "Right"} 600ms cubic-bezier(0.76, 0, 0.24, 1) forwards`,
      };
    }
    if (isActive) {
      return { position: "absolute", inset: 0, transform: "translateX(0)" };
    }
    return { position: "absolute", inset: 0, transform: "translateX(100%)", visibility: "hidden" };
  };

  return (
    <div className="relative w-full h-full select-none">
      {/* Slides */}
      <div className="relative w-full h-full overflow-hidden">
        <style>{`
          @keyframes slideInRight {
            from { transform: translateX(100%); }
            to   { transform: translateX(0); }
          }
          @keyframes slideInLeft {
            from { transform: translateX(-100%); }
            to   { transform: translateX(0); }
          }
          @keyframes slideOutLeft {
            from { transform: translateX(0); }
            to   { transform: translateX(-100%); }
          }
          @keyframes slideOutRight {
            from { transform: translateX(0); }
            to   { transform: translateX(100%); }
          }
        `}</style>

        {slides.map((slide, i) => (
          <div key={slide.src} style={getSlideStyle(i)}>
            <video
              ref={(el) => { videoRefs.current[i] = el; }}
              src={slide.src}
              loop
              muted
              playsInline
              autoPlay={i === 0}
              className="w-full h-full object-contain bg-black"
            />
          </div>
        ))}
      </div>

      {/* Prev arrow */}
      <button
        onClick={prev_}
        className="absolute left-4 top-1/2 -translate-y-1/2 z-10 w-10 h-10 flex items-center justify-center rounded-full bg-white/20 hover:bg-white/40 backdrop-blur-sm transition-all duration-200 text-white"
        aria-label="Previous"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M15 18l-6-6 6-6" />
        </svg>
      </button>

      {/* Next arrow */}
      <button
        onClick={next}
        className="absolute right-4 top-1/2 -translate-y-1/2 z-10 w-10 h-10 flex items-center justify-center rounded-full bg-white/20 hover:bg-white/40 backdrop-blur-sm transition-all duration-200 text-white"
        aria-label="Next"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M9 18l6-6-6-6" />
        </svg>
      </button>

      {/* Dot indicators */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10 flex items-center gap-2">
        {slides.map((_, i) => (
          <button
            key={i}
            onClick={() => goTo(i, i > current ? "right" : "left")}
            className={`rounded-full transition-all duration-300 ${
              i === current
                ? "w-6 h-2 bg-white"
                : "w-2 h-2 bg-white/40 hover:bg-white/70"
            }`}
            aria-label={`Go to slide ${i + 1}`}
          />
        ))}
      </div>

      {/* Counter */}
      <div className="absolute top-4 right-4 z-10 text-white/60 text-xs tracking-widest font-mono">
        {String(current + 1).padStart(2, "0")} / {String(slides.length).padStart(2, "0")}
      </div>
    </div>
  );
}
