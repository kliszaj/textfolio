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

const scriptFont = localFont({
  src: "./fonts/Adrian-Regular.otf",
  variable: "--font-adrian",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Adrian",
  description: "Designer, tinkerer, product builder",
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
