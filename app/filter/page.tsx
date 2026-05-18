import VideoSlider from "@/components/VideoSlider";

export const metadata = { title: "Filter — Endre Nagy" };

const slides = [
  { src: "/videos/filterya/AntonioGibson_final.mp4",    label: "Antonio Gibson" },
  { src: "/videos/filterya/AntonioGibson_endscreen2.mp4", label: "Antonio Gibson — End Screen" },
  { src: "/videos/filterya/CARDI B UP 3 INSTA.mp4",     label: "Cardi B — Up" },
  { src: "/videos/filterya/ChristianWood fullv2.mp4",   label: "Christian Wood" },
  { src: "/videos/filterya/Kendrick Nunn_finalv.mp4",   label: "Kendrick Nunn" },
  { src: "/videos/filterya/Nick Jonas2.mp4",             label: "Nick Jonas" },
  { src: "/videos/filterya/RONNIE2K_FINAL3.mp4",         label: "Ronnie 2K" },
];

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

      {/* Full-height slider */}
      <div className="flex-1 bg-black overflow-hidden">
        <VideoSlider slides={slides} />
      </div>
    </main>
  );
}
