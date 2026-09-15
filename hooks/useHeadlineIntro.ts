import { useEffect, useState } from "react";
import {
  HEADLINE_INTRO_SETTLED,
  HEADLINE_INTRO_WAITING,
  advanceHeadlineIntroElapsed,
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
    let accumulated = 0;
    let previousFrameTime = performance.now();
    let frame = 0;
    const step = (now: number) => {
      accumulated = advanceHeadlineIntroElapsed(
        accumulated,
        now - previousFrameTime
      );
      previousFrameTime = now;
      setElapsed(accumulated);
      if (!introStateAt(accumulated).done) frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [active]);

  if (!enabled || reducedMotion) return HEADLINE_INTRO_SETTLED;
  if (!ready) return HEADLINE_INTRO_WAITING;
  return introStateAt(elapsed);
}
