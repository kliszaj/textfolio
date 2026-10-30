import type { Metadata } from "next";
import localFont from "next/font/local";
import { LineBoil } from "@/components/LineBoil";
import { DeskHost } from "@/components/desk/DeskHost";
import "./globals.css";

const displayFont = localFont({
  src: "./fonts/PPFrama-Black.otf",
  weight: "900",
  variable: "--font-pp-frama",
  display: "swap",
});

const lightDisplayFont = localFont({
  src: "./fonts/PPFrama-Extralight.otf",
  weight: "200",
  variable: "--font-pp-frama-extralight",
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

// Only the /stack tagline uses the script, and the file is 2.6 MB, so it is
// not preloaded on every page; it still loads wherever it is used.
const scriptFont = localFont({
  src: "./fonts/Adrian-Regular.otf",
  variable: "--font-adrian",
  display: "swap",
  preload: false,
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
  // One line on case study pages; the desk landing page never shows it.
  preload: false,
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
    // suppressHydrationWarning: the script below marks <html> before React
    // hydrates it.
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Inside a frame (the case study on the desk's monitor), the page
            shows at rest from its first paint: no header settle, no body
            fade-in (globals.css, [data-embedded]). So Home on a case study
            needn't wait for the monitor's copy to finish animating. */}
        <script dangerouslySetInnerHTML={{ __html: "if(window.self!==window.top)document.documentElement.dataset.embedded='1'" }} />
      </head>
      <body className={`${displayFont.variable} ${lightDisplayFont.variable} ${scriptFont.variable} ${bodyFont.variable} ${condensedFont.variable}`}>
        <LineBoil />
        {children}
        <DeskHost />
      </body>
    </html>
  );
}
