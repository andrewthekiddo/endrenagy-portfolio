"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { label: "Home",         href: "/" },
  { label: "Animation",    href: "/animation" },
  { label: "VFX",          href: "/vfx" },
  { label: "FOOH",         href: "/fooh" },
  { label: "TVC",          href: "/tvc" },
  { label: "Social",       href: "/social" },
  { label: "Stage Visual", href: "/stage-visual" },
  { label: "Filter",       href: "/filter" },
  { label: "Website",      href: "/website" },
];

export default function Nav() {
  const pathname = usePathname();

  return (
    <header className="fixed top-0 left-0 right-0 z-50">
      <nav className="flex items-center justify-between px-8 h-14 bg-bg/80 backdrop-blur-md border-b border-white/[0.07]">

        {/* Logo */}
        <Link href="/" className="flex items-center gap-2">
          <span
            className="w-8 h-8 rounded-lg flex items-center justify-center text-bg font-display font-bold text-sm"
            style={{ background: "linear-gradient(135deg, #5468E0, #56B4F0)" }}
          >
            EN
          </span>
          <span className="font-sans font-semibold text-sm tracking-tight text-white/80">
            Endre Nagy
          </span>
        </Link>

        {/* Links */}
        <ul className="flex items-center gap-1">
          {links.map((link) => {
            const isActive = pathname === link.href;
            return (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className={`px-3 py-1.5 rounded-full text-[12px] font-medium transition-all duration-200 ${
                    isActive
                      ? "bg-white/10 text-white"
                      : "text-white/45 hover:text-white hover:bg-white/[0.06]"
                  }`}
                >
                  {link.label}
                </Link>
              </li>
            );
          })}
        </ul>

        {/* CTA */}
        <a
          href="mailto:endrenagy999@gmail.com"
          className="px-4 py-1.5 rounded-full text-[12px] font-semibold text-white transition-all duration-200 hover:opacity-80"
          style={{ background: "linear-gradient(135deg, #5468E0, #56B4F0)" }}
        >
          Book a call
        </a>

      </nav>
    </header>
  );
}
