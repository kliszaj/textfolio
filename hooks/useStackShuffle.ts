"use client";

import { useEffect, useRef, useState } from "react";

// Drives the page-indicator's "find this case study in the stack, then lift
// it out" sequence: tweens the stack's travel value from wherever it
// currently sits to the value that reveals a target depth (see
// travelForDepth in lib/fanProgress.ts), holds there briefly so the found
// sheet actually registers, then hands back control via onArrived.
export function useStackShuffle(
  openMs: number = 700,
  holdMs: number = 180
): {
  travel: number | null;
  shuffleTo: (fromTravel: number, toTravel: number, onArrived: () => void) => void;
} {
  const [travel, setTravel] = useState<number | null>(null);
  const activeRef = useRef(false);
  const frameRef = useRef(0);

  useEffect(() => {
    return () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
    };
  }, []);

  function shuffleTo(fromTravel: number, toTravel: number, onArrived: () => void) {
    // A second dot click mid-shuffle is ignored until this one resolves.
    if (activeRef.current) return;
    activeRef.current = true;
    const start = performance.now();

    const step = (now: number) => {
      const elapsed = now - start;

      if (elapsed < openMs) {
        const t = elapsed / openMs;
        const eased = t * t * (3 - 2 * t);
        setTravel(fromTravel + (toTravel - fromTravel) * eased);
        frameRef.current = requestAnimationFrame(step);
        return;
      }

      if (elapsed < openMs + holdMs) {
        setTravel(toTravel);
        frameRef.current = requestAnimationFrame(step);
        return;
      }

      setTravel(toTravel);
      activeRef.current = false;
      onArrived();
    };

    frameRef.current = requestAnimationFrame(step);
  }

  return { travel, shuffleTo };
}
