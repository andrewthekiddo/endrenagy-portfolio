interface SectionPageProps {
  title: string;
  children?: React.ReactNode;
}

export default function SectionPage({ title, children }: SectionPageProps) {
  return (
    <main className="min-h-screen pt-14">
      <div className="px-8 pt-20 pb-10 border-b border-white/[0.07]">
        <p className="text-[11px] font-sans font-medium tracking-widest text-white/30 mb-4 uppercase">Work</p>
        <h1 className="font-display text-7xl font-extrabold tracking-tight leading-none">{title}</h1>
      </div>
      <div className="px-8 py-12">
        {children ?? (
          <p className="text-sm font-sans text-white/20 italic">Content coming soon.</p>
        )}
      </div>
    </main>
  );
}
