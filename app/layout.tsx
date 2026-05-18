import type { Metadata } from "next";
import { Inter, Syne } from "next/font/google";
import "./globals.css";
import Nav from "@/components/Nav";
import LoadingScreen from "@/components/LoadingScreen";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500", "700", "900"],
});

const syne = Syne({
  variable: "--font-syne",
  subsets: ["latin"],
  weight: ["700", "800"],
});

export const metadata: Metadata = {
  title: "Endre Nagy — Creative Director",
  description: "Portfolio of Endre Nagy — Animation, VFX, FOOH, TVC, Social, Stage Visual, Filter, Website.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} ${syne.variable} font-sans antialiased bg-bg text-white`}>
        <LoadingScreen />
        <Nav />
        {children}
      </body>
    </html>
  );
}
