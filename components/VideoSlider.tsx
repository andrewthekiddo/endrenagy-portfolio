"use client";

import { useEffect, useRef, useState } from "react";

interface Slide {
  src: string;
  name: string;
  description: string;
}

interface VideoSliderProps {
  slides: Slide[];
}

export default function VideoSlider({ slides }: VideoSliderProps) {
  const [current, setCurrent]     = useState(0);
  const [prev, setPrev]           = useState<number | null>(null);
  const [direction, setDirection] = useState<"left" | "right">("right");
  const [animating, setAnimating] = useState(false);
  const [infoVisible, setInfoVisible] = useState(true);

  const videoRefs     = useRef<(HTMLVideoElement | null)[]>([]);
  const glowVideoRefs = useRef<(HTMLVideoElement | null)[]>([]);

  const goTo = (index: number, dir: "left" | "right") => {
    if (animating || index === current) return;
    setInfoVisible(false);
    setDirection(dir);
    setPrev(current);
    setCurrent(index);
    setAnimating(true);
  };

  const next  = () => goTo((current + 1) % slides.length, "right");
  const prev_ = () => goTo((current - 1 + slides.length) % slides.length, "left");

  useEffect(() => {
    if (animating) {
      const t = setTimeout(() => { setPrev(null); setAnimating(false); }, 600);
      return () => clearTimeout(t);
    }
  }, [animating]);

  // Fade in info text after slide settles
  useEffect(() => {
    const t = setTimeout(() => setInfoVisible(true), 400);
    return () => clearTimeout(t);
  }, [current]);

  useEffect(() => {
    videoRefs.current.forEach((vid, i) => {
      if (!vid) return;
      if (i === current) { vid.currentTime = 0; vid.play().catch(() => {}); }
      else vid.pause();
    });
    glowVideoRefs.current.forEach((vid, i) => {
      if (!vid) return;
      if (i === current) { vid.currentTime = 0; vid.play().catch(() => {}); }
      else vid.pause();
    });
  }, [current]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") next();
      if (e.key === "ArrowLeft")  prev_();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  });

  const getSlideStyle = (index: number): React.CSSProperties => {
    const isActive = index === current, isPrev = index === prev;
    if (isActive && animating) return { position: "absolute", inset: 0, animation: `slideIn${direction === "right" ? "Right" : "Left"} 600ms cubic-bezier(0.76,0,0.24,1) forwards` };
    if (isPrev  && animating) return { position: "absolute", inset: 0, animation: `slideOut${direction === "right" ? "Left" : "Right"} 600ms cubic-bezier(0.76,0,0.24,1) forwards` };
    if (isActive) return { position: "absolute", inset: 0, transform: "translateX(0)" };
    return { position: "absolute", inset: 0, transform: "translateX(100%)", visibility: "hidden" };
  };

  const frameHeight = "calc(100vh - 160px)";

  return (
    <div className="w-full h-full flex flex-col items-center justify-center gap-5 select-none py-6">
      <style>{`
        @keyframes slideInRight  { from{transform:translateX(100%)} to{transform:translateX(0)} }
        @keyframes slideInLeft   { from{transform:translateX(-100%)} to{transform:translateX(0)} }
        @keyframes slideOutLeft  { from{transform:translateX(0)} to{transform:translateX(-100%)} }
        @keyframes slideOutRight { from{transform:translateX(0)} to{transform:translateX(100%)} }
      `}</style>

      <div className="flex items-center gap-12" style={{ overflow: "visible" }}>

        {/* Video column: glow + frame + controls stacked */}
        <div className="flex flex-col items-center gap-5" style={{ overflow: "visible" }}>
        <div className="relative" style={{ aspectRatio: "9/16", height: frameHeight, maxHeight: "calc(100vh - 200px)", overflow: "visible" }}>

          {/* Glow layer — feathered with radial mask so edges fully dissolve */}
          <div
            style={{
              position: "absolute",
              inset: "-80px",
              zIndex: 0,
              filter: "blur(40px)",
              opacity: 0.95,
              mixBlendMode: "screen",
              pointerEvents: "none",
              WebkitMaskImage: "radial-gradient(ellipse 55% 60% at 50% 50%, black 50%, transparent 100%)",
              maskImage: "radial-gradient(ellipse 55% 60% at 50% 50%, black 50%, transparent 100%)",
            }}
          >
            {slides.map((slide, i) => (
              <video
                key={`glow-${slide.src}`}
                ref={(el) => { glowVideoRefs.current[i] = el; }}
                src={slide.src}
                loop muted playsInline
                autoPlay={i === 0}
                style={{
                  position: "absolute", inset: 0,
                  width: "100%", height: "100%",
                  objectFit: "cover",
                  opacity: i === current ? 1 : 0,
                  transition: "opacity 600ms ease",
                }}
              />
            ))}
          </div>

          {/* Actual frame */}
          <div
            className="relative overflow-hidden"
            style={{
              position: "absolute", inset: 0,
              borderRadius: "24px",
              border: "3px solid rgba(255,255,255,0.15)",
              zIndex: 1,
            }}
          >
            {slides.map((slide, i) => (
              <div key={slide.src} style={getSlideStyle(i)}>
                <video
                  ref={(el) => { videoRefs.current[i] = el; }}
                  src={slide.src}
                  loop muted playsInline
                  autoPlay={i === 0}
                  className="w-full h-full object-cover"
                />
              </div>
            ))}

            {/* Counter */}
            <div className="absolute top-3 right-3 z-10 text-white/60 text-[10px] tracking-widest font-mono bg-black/40 backdrop-blur-sm px-2 py-1 rounded-full">
              {String(current + 1).padStart(2, "0")} / {String(slides.length).padStart(2, "0")}
            </div>
          </div>
        </div>{/* end video+glow wrapper */}

        {/* Controls — under the video, centered */}
        <div className="flex items-center gap-3 relative" style={{ zIndex: 2 }}>
          <button onClick={prev_} className="w-7 h-7 flex items-center justify-center rounded-full border border-white/20 hover:border-white/60 hover:bg-white/10 transition-all duration-200 text-white/50 hover:text-white" aria-label="Previous">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M15 18l-6-6 6-6" /></svg>
          </button>
          {slides.map((_, i) => (
            <button key={i} onClick={() => goTo(i, i > current ? "right" : "left")}
              className={`rounded-full transition-all duration-300 ${i === current ? "w-5 h-2 bg-white" : "w-2 h-2 bg-white/25 hover:bg-white/60"}`}
              aria-label={`Go to slide ${i + 1}`}
            />
          ))}
          <button onClick={next} className="w-7 h-7 flex items-center justify-center rounded-full border border-white/20 hover:border-white/60 hover:bg-white/10 transition-all duration-200 text-white/50 hover:text-white" aria-label="Next">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M9 18l6-6-6-6" /></svg>
          </button>
        </div>

        </div>{/* end video column */}

        {/* Info panel — right of video */}
        <div
          className="w-60 shrink-0"
          style={{
            opacity: infoVisible ? 1 : 0,
            transform: infoVisible ? "translateY(0)" : "translateY(8px)",
            transition: "opacity 400ms ease, transform 400ms ease",
          }}
        >
          <h3 className="font-display text-4xl font-extrabold tracking-tight leading-tight mb-4">
            {slides[current].name}
          </h3>
          <p className="text-sm font-sans font-normal leading-relaxed text-white/50">
            Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.
          </p>
        </div>

      </div>
    </div>
  );
}
