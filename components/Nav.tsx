"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { label: "HOME", href: "/" },
  { label: "ANIMATION", href: "/animation" },
  { label: "VFX", href: "/vfx" },
  { label: "FOOH", href: "/fooh" },
  { label: "TVC", href: "/tvc" },
  { label: "SOCIAL", href: "/social" },
  { label: "STAGE VISUAL", href: "/stage-visual" },
  { label: "FILTER", href: "/filter" },
  { label: "WEBSITE", href: "/website" },
];

export default function Nav() {
  const pathname = usePathname();

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-[#F5F5F0]/90 backdrop-blur-sm border-b border-black/10">
      <nav className="flex items-center justify-between px-6 py-4">
        <Link href="/" className="text-sm font-semibold tracking-widest uppercase">
          Endre Nagy
        </Link>
        <ul className="flex items-center gap-6">
          {links.map((link) => {
            const isActive = pathname === link.href;
            return (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className={`text-xs tracking-widest uppercase transition-opacity ${
                    isActive
                      ? "opacity-100 font-semibold"
                      : "opacity-40 hover:opacity-100"
                  }`}
                >
                  {link.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </header>
  );
}
