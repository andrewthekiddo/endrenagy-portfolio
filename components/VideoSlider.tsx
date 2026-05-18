"use client";

import { useEffect, useRef, useState, useCallback } from "react";

interface Slide { src: string; label?: string; }
interface VideoSliderProps { slides: Slide[]; }

// RGB → HSL
function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }
  return [h * 360, s * 100, l * 100];
}

// HSL → RGB
function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  h /= 360; s /= 100; l /= 100;
  if (s === 0) { const v = Math.round(l * 255); return [v, v, v]; }
  const hue2rgb = (p: number, q: number, t: number) => {
    if (t < 0) t += 1; if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  return [
    Math.round(hue2rgb(p, q, h + 1 / 3) * 255),
    Math.round(hue2rgb(p, q, h) * 255),
    Math.round(hue2rgb(p, q, h - 1 / 3) * 255),
  ];
}

// Sample video → vivid dominant color
function sampleColor(video: HTMLVideoElement, canvas: HTMLCanvasElement): string | null {
  try {
    const ctx = canvas.getContext("2d");
    if (!ctx || video.readyState < 2) return null;
    ctx.drawImage(video, 0, 0, 32, 32);
    const data = ctx.getImageData(0, 0, 32, 32).data;
    let r = 0, g = 0, b = 0, n = 0;
    for (let i = 0; i < data.length; i += 4) {
      r += data[i]; g += data[i + 1]; b += data[i + 2]; n++;
    }
    r = Math.round(r / n); g = Math.round(g / n); b = Math.round(b / n);
    // Boost saturation & clamp lightness so it stays vivid
    let [h, s, l] = rgbToHsl(r, g, b);
    s = Math.max(s, 70);   // min 70% saturation
    l = Math.min(Math.max(l, 45), 65); // lightness 45–65%
    const [rr, gg, bb] = hslToRgb(h, s, l);
    return `rgb(${rr},${gg},${bb})`;
  } catch {
    return null;
  }
}

export default function VideoSlider({ slides }: VideoSliderProps) {
  const [current, setCurrent]   = useState(0);
  const [prev, setPrev]         = useState<number | null>(null);
  const [direction, setDirection] = useState<"left" | "right">("right");
  const [animating, setAnimating] = useState(false);
  const [glowColor, setGlowColor] = useState("rgb(255,45,155)");

  const videoRefs = useRef<(HTMLVideoElement | null)[]>([]);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef    = useRef<number>(0);
  const lastSample = useRef(0);

  const goTo = (index: number, dir: "left" | "right") => {
    if (animating || index === current) return;
    setDirection(dir); setPrev(current); setCurrent(index); setAnimating(true);
  };
  const next  = () => goTo((current + 1) % slides.length, "right");
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

  // Ambilight loop
  const sample = useCallback((ts: number) => {
    if (ts - lastSample.current > 180) {
      lastSample.current = ts;
      const video = videoRefs.current[current];
      const canvas = canvasRef.current;
      if (video && canvas) {
        const color = sampleColor(video, canvas);
        if (color) setGlowColor(color);
      }
    }
    rafRef.current = requestAnimationFrame(sample);
  }, [current]);

  useEffect(() => {
    rafRef.current = requestAnimationFrame(sample);
    return () => cancelAnimationFrame(rafRef.current);
  }, [sample]);

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

  return (
    <div className="w-full h-full flex flex-col items-center justify-center gap-5 select-none py-6">
      <style>{`
        @keyframes slideInRight  { from{transform:translateX(100%)} to{transform:translateX(0)} }
        @keyframes slideInLeft   { from{transform:translateX(-100%)} to{transform:translateX(0)} }
        @keyframes slideOutLeft  { from{transform:translateX(0)} to{transform:translateX(-100%)} }
        @keyframes slideOutRight { from{transform:translateX(0)} to{transform:translateX(100%)} }
      `}</style>

      {/* Hidden canvas for color sampling */}
      <canvas ref={canvasRef} width={32} height={32} style={{ display: "none" }} />

      {/* Video frame — ambilight glow */}
      <div
        className="relative overflow-hidden"
        style={{
          aspectRatio: "9 / 16",
          height: "calc(100% - 64px)",
          maxHeight: "calc(100vh - 180px)",
          borderRadius: "24px",
          border: `2px solid ${glowColor}`,
          boxShadow: `0 0 18px ${glowColor}, 0 0 50px ${glowColor}66, inset 0 0 14px ${glowColor}22`,
          transition: "border-color 600ms ease, box-shadow 600ms ease",
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

        <div className="absolute top-3 right-3 z-10 text-white/70 text-[10px] tracking-widest font-mono bg-black/30 backdrop-blur-sm px-2 py-1 rounded-full">
          {String(current + 1).padStart(2, "0")} / {String(slides.length).padStart(2, "0")}
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-3">
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
    </div>
  );
}
