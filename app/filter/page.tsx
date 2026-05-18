import VideoSlider from "@/components/VideoSlider";

export const metadata = { title: "Filter — Endre Nagy" };

const slides = [
  {
    src: "/videos/filterya/AntonioGibson_final.mp4",
    name: "Antonio Gibson",
    description: "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco.",
  },
  {
    src: "/videos/filterya/CARDI B UP 3 INSTA.mp4",
    name: "Cardi B",
    description: "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco.",
  },
  {
    src: "/videos/filterya/ChristianWood fullv2.mp4",
    name: "Christian Wood",
    description: "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco.",
  },
  {
    src: "/videos/filterya/Kendrick Nunn_finalv.mp4",
    name: "Kendrick Nunn",
    description: "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco.",
  },
  {
    src: "/videos/filterya/Nick Jonas2.mp4",
    name: "Nick Jonas",
    description: "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco.",
  },
  {
    src: "/videos/filterya/RONNIE2K_FINAL3.mp4",
    name: "Ronnie 2K",
    description: "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco.",
  },
];

const lorem = `Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident.`;

export default function FilterPage() {
  return (
    <main className="flex h-screen pt-14 overflow-hidden">

      {/* Left panel */}
      <div className="flex flex-col justify-center w-[380px] shrink-0 pl-16 pr-10 overflow-y-auto">
        <p className="text-[11px] font-sans font-medium tracking-widest text-white/30 mb-5 uppercase">
          Work — Filter
        </p>
        <h1 className="font-display text-7xl font-extrabold tracking-tight leading-none mb-3">
          Filter
        </h1>
        <h2 className="font-display text-3xl font-bold tracking-tight text-blue mb-8">
          Filterya
        </h2>
        <p className="text-[15px] font-sans font-normal leading-7 text-white/50 max-w-xs">
          {lorem}
        </p>
      </div>

      {/* Slider — no overflow clip, glow bleeds freely. Slide animations are clipped inside the frame div. */}
      <div className="flex-1">
        <VideoSlider slides={slides} />
      </div>

    </main>
  );
}
