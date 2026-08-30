import type { Metadata } from "next";
import localFont from "next/font/local";
import { LineBoil } from "@/components/LineBoil";
import "./globals.css";

const displayFont = localFont({
  src: "./fonts/PPFrama-Black.otf",
  variable: "--font-display",
  display: "swap",
});

const scriptFont = localFont({
  src: "./fonts/Adrian-Regular.otf",
  variable: "--font-script",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Adrian",
  description: "Designer, tinkerer, idea-booster",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${displayFont.variable} ${scriptFont.variable}`}>
        <LineBoil />
        {children}
      </body>
    </html>
  );
}
