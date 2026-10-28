import Link from "next/link";

// Spike index: the two ways of opening a case study from the desk.
export default function DeskSpikeIndex() {
  return (
    <main className="grid min-h-screen place-items-center bg-cream p-8 text-ink">
      <div className="flex flex-col gap-6 font-body text-2xl font-medium">
        <h1 className="font-display text-6xl">Desk spike</h1>
        <Link href="/desk/a" className="underline underline-offset-4">
          A: open on the screen
        </Link>
        <Link href="/desk/b" className="underline underline-offset-4">
          B: zoom through the screen
        </Link>
        <Link href="/desk/c" className="underline underline-offset-4">
          C: textfolio in a browser on the screen
        </Link>
      </div>
    </main>
  );
}
