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

// Body face for case-study copy: the script is part of the hero voice, but it
// is hard to read at a glance on a sheet that is only partly revealed.
const bodyFont = localFont({
  src: "./fonts/PPNeueMontreal-Book.otf",
  weight: "400",
  variable: "--font-pp-neue-montreal",
  display: "swap",
});

const scriptFont = localFont({
  src: "./fonts/Adrian-Regular.otf",
  variable: "--font-adrian",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Adrian",
  description: "Designer, tinkerer, zero-to-one builder",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${displayFont.variable} ${scriptFont.variable} ${bodyFont.variable}`}>
        <LineBoil />
        {children}
      </body>
    </html>
  );
}
