interface SectionPageProps {
  title: string;
  children?: React.ReactNode;
}

export default function SectionPage({ title, children }: SectionPageProps) {
  return (
    <main className="min-h-screen pt-20">
      <div className="px-6 pt-16 pb-8 border-b border-black/10">
        <p className="text-xs tracking-widest uppercase text-black/40 mb-2">Work</p>
        <h1 className="text-4xl font-light tracking-tight">{title}</h1>
      </div>
      <div className="px-6 py-12">
        {children ?? (
          <p className="text-sm text-black/30 italic">Content coming soon — send materials to populate this section.</p>
        )}
      </div>
    </main>
  );
}
