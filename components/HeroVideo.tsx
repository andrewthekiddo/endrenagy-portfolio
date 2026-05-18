"use client";

export default function HeroVideo() {
  return (
    <section className="relative w-full h-screen overflow-hidden">
      <video
        src="/videos/VFX_REEL_2024_low.mp4"
        autoPlay
        loop
        muted
        playsInline
        className="absolute inset-0 w-full h-full object-cover"
      />
      {/* Enyhe overlay hogy a scrolljelző látsszon */}
      <div className="absolute inset-0 bg-black/10" />

      {/* Scroll hint */}
      <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-white/60">
        <span className="text-[10px] tracking-widest uppercase">Scroll</span>
        <div className="w-px h-8 bg-white/40 animate-pulse" />
      </div>
    </section>
  );
}
