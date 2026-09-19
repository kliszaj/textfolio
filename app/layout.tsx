import type { Metadata } from "next";
import localFont from "next/font/local";
import { LineBoil } from "@/components/LineBoil";
import "./globals.css";

const displayFont = localFont({
  src: "./fonts/PPFrama-Black.otf",
  weight: "900",
  variable: "--font-pp-frama",
  display: "swap",
});

// Body family for case-study copy: the script is part of the hero voice, but
// it is hard to read at a glance on a sheet that is only partly revealed.
const bodyFont = localFont({
  src: [
    { path: "./fonts/PPNeueMontreal-Regular.otf", weight: "400", style: "normal" },
    { path: "./fonts/PPNeueMontreal-Medium.otf", weight: "500", style: "normal" },
    { path: "./fonts/PPNeueMontreal-Bold.otf", weight: "700", style: "normal" },
  ],
  variable: "--font-pp-neue-montreal",
  display: "swap",
});

const scriptFont = localFont({
  src: "./fonts/Adrian-Regular.otf",
  variable: "--font-adrian",
  display: "swap",
});

// A condensed companion to the display face, reserved for the case-study
// overview's pulled-out one-liner -- narrow enough to carry a full sentence
// at a size that would otherwise run wide.
const condensedFont = localFont({
  src: [
    { path: "./fonts/PPFormulaCondensed-Light.otf", weight: "300", style: "normal" },
    { path: "./fonts/PPFormulaCondensed-Regular.otf", weight: "400", style: "normal" },
    { path: "./fonts/PPFormulaCondensed-Bold.otf", weight: "700", style: "normal" },
    { path: "./fonts/PPFormulaCondensed-Black.otf", weight: "900", style: "normal" },
  ],
  variable: "--font-pp-formula-condensed",
  display: "swap",
});

export const metadata: Metadata = {
  // Needed to resolve the og:image/twitter:image URLs to an absolute
  // address; without it Next.js defaults to localhost in production.
  // TODO: confirm this is actually where the site is deployed.
  metadataBase: new URL("https://adrianklisz.com"),
  title: "Adrian",
  description: "Designer, tinkerer, zero-to-one builder",
  openGraph: {
    title: "Adrian",
    description: "Designer, tinkerer, zero-to-one builder",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Adrian",
    description: "Designer, tinkerer, zero-to-one builder",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${displayFont.variable} ${scriptFont.variable} ${bodyFont.variable} ${condensedFont.variable}`}>
        <LineBoil />
        {children}
      </body>
    </html>
  );
}
