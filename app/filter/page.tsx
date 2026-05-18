import VideoSlider from "@/components/VideoSlider";

export const metadata = { title: "Filter — Endre Nagy" };

const slides = [
  { src: "/videos/filterya/AntonioGibson_final.mp4",      label: "Antonio Gibson" },
  { src: "/videos/filterya/AntonioGibson_endscreen2.mp4", label: "Antonio Gibson — End Screen" },
  { src: "/videos/filterya/CARDI B UP 3 INSTA.mp4",       label: "Cardi B — Up" },
  { src: "/videos/filterya/ChristianWood fullv2.mp4",     label: "Christian Wood" },
  { src: "/videos/filterya/Kendrick Nunn_finalv.mp4",     label: "Kendrick Nunn" },
  { src: "/videos/filterya/Nick Jonas2.mp4",               label: "Nick Jonas" },
  { src: "/videos/filterya/RONNIE2K_FINAL3.mp4",           label: "Ronnie 2K" },
];

const lorem = `Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum. Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium, totam rem aperiam eaque ipsa quae ab illo inventore veritatis et quasi architecto beatae vitae dicta sunt explicabo. Nemo enim ipsam voluptatem quia voluptas sit aspernatur aut odit aut fugit, sed quia consequuntur magni dolores eos qui ratione voluptatem sequi nesciunt. Neque porro quisquam est, qui dolorem ipsum quia dolor sit amet consectetur adipisci velit. At vero eos et accusamus et iusto odio dignissimos ducimus qui blanditiis praesentium voluptatum deleniti atque corrupti quos dolores et quas molestias excepturi sint occaecati cupiditate non provident.`;

export default function FilterPage() {
  return (
    <main className="flex flex-col h-screen pt-[57px]">
      {/* Page header */}
      <div className="flex items-baseline justify-between px-6 py-5 border-b border-black/10 shrink-0">
        <div>
          <p className="text-[10px] tracking-widest uppercase text-black/40 mb-1">Work</p>
          <h1 className="text-2xl font-light tracking-tight">Filter</h1>
        </div>
      </div>

      {/* Two-column layout */}
      <div className="flex flex-1 overflow-hidden">

        {/* Left — title + description */}
        <div className="w-72 shrink-0 border-r border-black/10 px-8 py-10 overflow-y-auto">
          <h2 className="text-3xl font-semibold tracking-tight mb-6">filterya</h2>
          <p className="text-sm font-light leading-relaxed text-black/60">{lorem}</p>
        </div>

        {/* Right — slider */}
        <div className="flex-1 overflow-hidden">
          <VideoSlider slides={slides} />
        </div>

      </div>
    </main>
  );
}
