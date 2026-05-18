import HeroVideo from "@/components/HeroVideo";

export default function HomePage() {
  return (
    <main>
      <HeroVideo />

      {/* BIO */}
      <section className="max-w-3xl mx-auto px-6 py-32">
        <p className="text-xs tracking-widest uppercase text-black/40 mb-8">About</p>
        <h2 className="text-3xl font-light leading-relaxed mb-8">
          Endre Nagy
        </h2>
        <div className="space-y-5 text-base font-light leading-relaxed text-black/70">
          <p>
            {/* BIO szöveg ide kerül — küld el és beillesztem */}
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
