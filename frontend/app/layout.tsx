import type { Metadata } from "next";
import {
  Fraunces,
  IBM_Plex_Sans,
  IBM_Plex_Mono,
  Noto_Sans_Devanagari,
  Noto_Sans_Gurmukhi,
  Noto_Sans_Tamil,
  Noto_Sans_Bengali,
} from "next/font/google";
import "./globals.css";

const fraunces = Fraunces({ subsets: ["latin"], variable: "--font-display", weight: ["400", "500", "600"], style: ["normal", "italic"] });
const plexSans = IBM_Plex_Sans({ subsets: ["latin"], variable: "--font-body", weight: ["400", "500", "600"] });
const plexMono = IBM_Plex_Mono({ subsets: ["latin"], variable: "--font-mono", weight: ["400", "500"] });
const notoHi = Noto_Sans_Devanagari({ subsets: ["devanagari"], variable: "--font-hi", weight: ["400", "500", "600"] });
const notoPa = Noto_Sans_Gurmukhi({ subsets: ["gurmukhi"], variable: "--font-pa", weight: ["400", "500", "600"] });
const notoTa = Noto_Sans_Tamil({ subsets: ["tamil"], variable: "--font-ta", weight: ["400", "500", "600"] });
const notoBn = Noto_Sans_Bengali({ subsets: ["bengali"], variable: "--font-bn", weight: ["400", "500", "600"] });

export const metadata: Metadata = {
  title: "MediKiosk — AI Clinical History, Before the Doctor Even Asks",
  description:
    "MediKiosk captures a patient's full clinical history through voice and touch, digitizes prior medical documents, and hands physicians a structured, physician-ready summary before consultation begins.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body
        suppressHydrationWarning
        className={`${fraunces.variable} ${plexSans.variable} ${plexMono.variable} ${notoHi.variable} ${notoPa.variable} ${notoTa.variable} ${notoBn.variable} font-[family-name:var(--font-body)] antialiased`}
      >
        {children}
      </body>
    </html>
  );
}