import HeroVideo from "@/components/HeroVideo";

export default function HomePage() {
  return (
    <main>
      <HeroVideo />

      {/* BIO */}
      <section className="max-w-4xl mx-auto px-8 py-32 border-t border-white/[0.07]">
        <p className="text-[11px] font-sans font-medium tracking-widest text-white/30 mb-6 uppercase">About</p>
        <h2 className="font-display text-6xl font-extrabold tracking-tight leading-tight mb-10">
          Endre Nagy
        </h2>
        <div className="space-y-5 text-base font-sans font-normal leading-relaxed text-white/55 max-w-2xl">
          <p>
            Creative director and motion designer based in Budapest.
            Specializing in animation, VFX, FOOH, and immersive visual experiences.
          </p>
          <p>
            With over a decade of experience working across broadcast, digital, and live events,
            the work spans from concept to final delivery — always driven by a strong visual language
            and a relentless attention to detail.
          </p>
        </div>
      </section>
    </main>
  );
}
