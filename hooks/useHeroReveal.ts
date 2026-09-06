import { useEffect, useState } from "react";
import {
  HERO_REVEAL_HIDDEN,
  heroRevealSettled,
  heroRevealStateAt,
} from "@/lib/heroReveal";
import type { HeroRevealState } from "@/lib/heroReveal";

// Drives the subheader-soft-focus / arrow-and-dots-pop-in beat that follows
// the headline's own intro. `enabled` mirrors useHeadlineIntro's own
// enabled flag (false on a return visit, which should show everything at
// once rather than replay it); `introDone` gates the actual start, since
// this reveal is the next beat in the same intro, not an independent one --
// it must not start ticking while the headline is still mid-story.
export function useHeroReveal(
  enabled: boolean,
  introDone: boolean,
  taglineLength: number,
  dotCount: number
): HeroRevealState {
  const [reducedMotion, setReducedMotion] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const active = enabled && introDone && !reducedMotion;

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReducedMotion(media.matches);
    // Read on the next frame, not inline: a synchronous read here would
    // disagree with the server-rendered markup during hydration -- the same
    // reason useHeadlineIntro reads it this way.
    const frame = requestAnimationFrame(update);
    media.addEventListener("change", update);
    return () => {
      cancelAnimationFrame(frame);
      media.removeEventListener("change", update);
    };
  }, []);

  useEffect(() => {
    // No need to reset elapsed here when inactive: the hidden/settled
    // branches below never read it, so a stale value sitting unused is
    // harmless -- matching useHeadlineIntro's own equivalent effect.
    if (!active) return;
    const start = performance.now();
    let frame = 0;
    const step = (now: number) => {
      const next = now - start;
      setElapsed(next);
      if (!heroRevealStateAt(next, taglineLength, dotCount).done) {
        frame = requestAnimationFrame(step);
      }
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [active, taglineLength, dotCount]);

  if (!enabled || reducedMotion) return heroRevealSettled(taglineLength, dotCount);
  if (!introDone) return HERO_REVEAL_HIDDEN;
  return heroRevealStateAt(elapsed, taglineLength, dotCount);
}
