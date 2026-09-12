import type { NextConfig } from "next";

// IDEIGLENES: a portfolio le van kapcsolva – minden útvonal a "hamarosan" oldalra megy,
// kivéve a /projekt/* aloldalakat és a statikus fájlokat. Visszakapcsoláshoz töröld a rewrites() blokkot.
const PORTFOLIO_OFF = true;

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "img.youtube.com" },
      { protocol: "https", hostname: "i.ytimg.com" },
    ],
  },
  async rewrites() {
    const projekt = [
      // /projekt/mvm-dome -> a statikus térkép (public/projekt/mvm-dome/index.html)
      { source: "/projekt/mvm-dome", destination: "/projekt/mvm-dome/index.html" },
    ];
    const off = PORTFOLIO_OFF
      ? [
          { source: "/", destination: "/hamarosan.html" },
          { source: "/:path((?!projekt|_next|hamarosan\\.html|photos|videos|favicon).*)", destination: "/hamarosan.html" },
        ]
      : [];
    return { beforeFiles: [...projekt, ...off] };
  },
};

export default nextConfig;
