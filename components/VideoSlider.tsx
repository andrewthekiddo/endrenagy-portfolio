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
      const t = setTimeout(() => { setPrev(null); setAnimating(false); }, 600);
      return () => clearTimeout(t);
    }
  }, [animating]);

  useEffect(() => {
    videoRefs.current.forEach((vid, i) => {
      if (!vid) return;
      if (i === current) { vid.currentTime = 0; vid.play().catch(() => {}); }
      else vid.pause();
    });
  }, [current]);

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
    if (isActive && animating) return {
      position: "absolute", inset: 0,
      animation: `slideIn${direction === "right" ? "Right" : "Left"} 600ms cubic-bezier(0.76,0,0.24,1) forwards`,
    };
    if (isPrev && animating) return {
      position: "absolute", inset: 0,
      animation: `slideOut${direction === "right" ? "Left" : "Right"} 600ms cubic-bezier(0.76,0,0.24,1) forwards`,
    };
    if (isActive) return { position: "absolute", inset: 0, transform: "translateX(0)" };
    return { position: "absolute", inset: 0, transform: "translateX(100%)", visibility: "hidden" };
  };

  return (
    <div className="w-full h-full flex flex-col items-center justify-center gap-5 select-none py-6">
      <style>{`
        @keyframes slideInRight  { from { transform: translateX(100%); } to { transform: translateX(0); } }
        @keyframes slideInLeft   { from { transform: translateX(-100%); } to { transform: translateX(0); } }
        @keyframes slideOutLeft  { from { transform: translateX(0); } to { transform: translateX(-100%); } }
        @keyframes slideOutRight { from { transform: translateX(0); } to { transform: translateX(100%); } }
      `}</style>

      {/* Video frame — neon pink border, 9:16 */}
      <div
        className="relative overflow-hidden"
        style={{
          aspectRatio: "9 / 16",
          height: "calc(100% - 64px)",
          maxHeight: "calc(100vh - 180px)",
          borderRadius: "24px",
          border: "2px solid #FF2D9B",
          boxShadow: "0 0 16px #FF2D9B, 0 0 40px #FF2D9B66, inset 0 0 12px #FF2D9B22",
        }}
      >
        {slides.map((slide, i) => (
          <div key={slide.src} style={getSlideStyle(i)}>
            <video
              ref={(el) => { videoRefs.current[i] = el; }}
              src={slide.src}
              loop
              muted
              playsInline
              autoPlay={i === 0}
              className="w-full h-full object-cover"
            />
          </div>
        ))}

        {/* Counter top-right inside frame */}
        <div className="absolute top-3 right-3 z-10 text-white/70 text-[10px] tracking-widest font-mono bg-black/30 backdrop-blur-sm px-2 py-1 rounded-full">
          {String(current + 1).padStart(2, "0")} / {String(slides.length).padStart(2, "0")}
        </div>
      </div>

      {/* Controls: [<]  dots  [>] */}
      <div className="flex items-center gap-3">
        <button
          onClick={prev_}
          className="w-7 h-7 flex items-center justify-center rounded-full border border-black/20 hover:border-black/60 hover:bg-black/5 transition-all duration-200 text-black/50 hover:text-black"
          aria-label="Previous"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>

        {slides.map((_, i) => (
          <button
            key={i}
            onClick={() => goTo(i, i > current ? "right" : "left")}
            className={`rounded-full transition-all duration-300 ${
              i === current ? "w-5 h-2 bg-black" : "w-2 h-2 bg-black/25 hover:bg-black/50"
            }`}
            aria-label={`Go to slide ${i + 1}`}
          />
        ))}

        <button
          onClick={next}
          className="w-7 h-7 flex items-center justify-center rounded-full border border-black/20 hover:border-black/60 hover:bg-black/5 transition-all duration-200 text-black/50 hover:text-black"
          aria-label="Next"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M9 18l6-6-6-6" />
          </svg>
        </button>
      </div>
    </div>
  );
}
