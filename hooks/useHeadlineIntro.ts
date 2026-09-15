import { useEffect, useState } from "react";
import {
  HEADLINE_INTRO_BOUNDARIES_MS,
  HEADLINE_INTRO_SETTLED,
  HEADLINE_INTRO_WAITING,
  introStateAt,
} from "@/lib/headlineIntro";
import type { HeadlineIntroState } from "@/lib/headlineIntro";

// Drives the headline's sketch -> LEGO -> ASCII -> warp story once on mount.
// Skipped for anyone who has asked for reduced motion: the story is
// decorative, and the finished treatment is the one that matters.
export function useHeadlineIntro(enabled: boolean, ready = true): HeadlineIntroState {
  const [reducedMotion, setReducedMotion] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const active = enabled && ready && !reducedMotion;

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReducedMotion(media.matches);
    // Read on the next frame rather than inline: a synchronous read here would
    // disagree with the server-rendered markup during hydration.
    const frame = requestAnimationFrame(update);
    media.addEventListener("change", update);
    return () => {
      cancelAnimationFrame(frame);
      media.removeEventListener("change", update);
    };
  }, []);

  useEffect(() => {
    if (!active) return;
    const startedAt = performance.now();
    let timer = 0;
    const step = () => {
      const nextElapsed = performance.now() - startedAt;
      setElapsed(nextElapsed);
      const nextBoundary = HEADLINE_INTRO_BOUNDARIES_MS.find(
        (boundary) => boundary > nextElapsed
      );
      if (nextBoundary !== undefined) {
        timer = window.setTimeout(step, Math.max(0, nextBoundary - nextElapsed));
      }
    };
    // The intro uses hard cuts, so nothing in this hook needs a per-frame
    // React render. Wake only at the five authored treatment boundaries; the
    // treatments' own canvas loops remain independent and fluid.
    timer = window.setTimeout(step, HEADLINE_INTRO_BOUNDARIES_MS[1]);
    return () => window.clearTimeout(timer);
  }, [active]);

  if (!enabled || reducedMotion) return HEADLINE_INTRO_SETTLED;
  if (!ready) return HEADLINE_INTRO_WAITING;
  return introStateAt(elapsed);
}
