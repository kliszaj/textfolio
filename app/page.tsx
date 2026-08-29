"use client";

import { useFanProgress } from "@/hooks/useFanProgress";
import { usePointerType } from "@/hooks/usePointerType";
import { Hero } from "@/components/Hero";
import { PaperStack } from "@/components/PaperStack";

export default function HomePage() {
  const fanProgress = useFanProgress();
  const pointerType = usePointerType();

  return (
    <>
      <div className="fixed inset-0 overflow-hidden">
        <Hero fanProgress={fanProgress} />
        <PaperStack fanProgress={fanProgress} />
      </div>
      {pointerType === "coarse" && <div style={{ height: "150vh" }} aria-hidden="true" />}
    </>
  );
}
