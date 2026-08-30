"use client";

import { useEffect, useState } from "react";

// Set as a case study leaves for home, read once when home mounts. Module scope
// for the same reason the intro flag is: it survives a client-side navigation
// and dies with the page load, which is exactly the lifetime we want.
let returningHome = false;

export function markReturningHome(): void {
  returningHome = true;
}

export function resetReturningHomeForTests(): void {
  returningHome = false;
}

// The inverse of the way in. Arriving back from a case study, the stack starts
// fanned open where the reader left it and folds shut into the resting page,
// rather than snapping to a closed stack the reader never saw open.
//
// Returns travel from 1 down to 0, then null once the pointer should own the
// stack again -- null rather than 0, so a reader whose cursor is already low
// does not get the stack pinned shut under them.
export function useStackCollapse(durationMs: number = 700): number | null {
  const [travel, setTravel] = useState<number | null>(() =>
    returningHome ? 1 : null
  );

  useEffect(() => {
    if (!returningHome) return;
    returningHome = false;

    let frame = 0;
    const start = performance.now();

    const step = (now: number) => {
      const t = Math.min(1, (now - start) / durationMs);
      if (t >= 1) {
        setTravel(null);
        return;
      }
      // Smoothstep, run backwards: quick through the middle, easing shut.
      setTravel(1 - t * t * (3 - 2 * t));
      frame = requestAnimationFrame(step);
    };

    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [durationMs]);

  return travel;
}
