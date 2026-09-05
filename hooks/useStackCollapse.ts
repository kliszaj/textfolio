"use client";

import { useEffect, useRef, useState } from "react";

// Set as a case study leaves for home, read once when home mounts. Module
// scope for the same reason the intro flag is: it survives a client-side
// navigation and dies with the page load, which is exactly the lifetime we
// want. Stores the slug, not a resolved depth or travel value, so this
// module stays free of any dependency on the case-study data itself --
// resolving the slug into a starting travel value is the caller's job (see
// app/page.tsx).
let returningFromSlug: string | null = null;

export function markReturningHome(slug: string): void {
  returningFromSlug = slug;
}

// Read-only: does not consume the flag. Lets a caller resolve the departing
// case study's own depth (and so its starting travel) before the hook
// itself later consumes and clears the flag inside its effect.
export function peekReturningFromSlug(): string | null {
  return returningFromSlug;
}

export function resetReturningHomeForTests(): void {
  returningFromSlug = null;
}

// The inverse of the way in. Arriving back from a case study, the stack
// starts fanned open to wherever that card actually was and folds shut into
// the resting page, so it is obvious they came up from underneath.
//
// Returns travel from `startTravel` down to 0, then null once the pointer
// should own the stack again -- null rather than 0, so a reader whose
// cursor is already low does not get the stack pinned shut under them.
export function useStackCollapse(startTravel: number, durationMs: number = 700): number | null {
  // Whether to play is settled from the flag during render, but the flag is
  // NOT consumed here: React may invoke a state initialiser more than once,
  // and clearing it in the first invocation would hide it from the second.
  const [playing] = useState(() => returningFromSlug !== null);
  // Captured once, at mount, not read fresh from the effect below: the
  // caller (app/page.tsx) recomputes its own startTravel argument on every
  // render by reading the same flag this hook consumes, so after the first
  // render it recomputes down to a fallback value. If the effect depended
  // on the live `startTravel` prop it would see that change and incorrectly
  // restart the tween partway through.
  const startTravelRef = useRef(startTravel);
  // eslint-disable-next-line react-hooks/refs
  const [travel, setTravel] = useState<number | null>(() =>
    returningFromSlug !== null ? startTravelRef.current : null
  );

  useEffect(() => {
    if (!playing) return;
    // Consumed here, and the effect keys off `playing` rather than the flag,
    // so a remount (React runs mount effects twice in development) restarts
    // the animation instead of finding the flag already cleared and leaving
    // the stack frozen wide open.
    returningFromSlug = null;

    const committedStart = startTravelRef.current;
    let frame = 0;
    const start = performance.now();

    const step = (now: number) => {
      const t = Math.min(1, (now - start) / durationMs);
      if (t >= 1) {
        setTravel(null);
        return;
      }
      // Smoothstep, run backwards: quick through the middle, easing shut.
      // Scaled by the committed start rather than assuming it is always 1 --
      // a card near the top of the stack has less distance to close.
      setTravel(committedStart * (1 - t * t * (3 - 2 * t)));
      frame = requestAnimationFrame(step);
    };

    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [playing, durationMs]);

  return travel;
}
