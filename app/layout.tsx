import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import RangeProvider from "@/components/RangeProvider";
import { Nav } from "@/components/ui";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Rangefinder",
  description: "Liquidity ranges from what the market expects, powered by Gemini Prediction Markets.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} min-h-screen bg-[#0A0710] text-slate-100 antialiased`}>
        <RangeProvider>
          <Nav />
          <main className="mx-auto max-w-6xl px-6 py-8">{children}</main>
          <footer className="mx-auto max-w-6xl px-6 pb-10 pt-4 text-xs text-slate-500">
            Rangefinder · UBC 2026 Hackathon · Live data from Gemini Prediction Markets · Testnet only, not financial advice
          </footer>
        </RangeProvider>
      </body>
    </html>
  );
}