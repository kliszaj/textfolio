import type { Metadata } from "next";
import { Archivo_Black, Caveat } from "next/font/google";
import "./globals.css";

const displayFont = Archivo_Black({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-display",
});

const scriptFont = Caveat({
  weight: "500",
  subsets: ["latin"],
  variable: "--font-script",
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
        {children}
      </body>
    </html>
  );
}
