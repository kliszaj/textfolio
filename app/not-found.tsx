import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Page not found", robots: { index: false } };

export default function NotFound() {
  return (
    <main className="grid min-h-screen place-items-center bg-cream p-8 text-ink">
      <div className="flex flex-col items-start gap-5">
        <h1 className="font-display text-5xl md:text-7xl">Page not found</h1>
        <p className="font-body text-lg font-medium">This page doesn’t exist, or it has moved.</p>
        <Link href="/" className="font-body text-lg font-bold underline underline-offset-4">
          Back to the desk
        </Link>
      </div>
    </main>
  );
}
