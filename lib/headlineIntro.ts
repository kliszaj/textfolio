// The headline tells the story of the work on load: sketched, prototyped in
// ascii, warped into shape, then finished. Each phase hands over to the next
// when it has had its time.
export type HeadlineIntroPhase = "sketch" | "ascii" | "warp" | "final";

export const HEADLINE_INTRO_STEPS: { phase: HeadlineIntroPhase; durationMs: number }[] = [
  // Long enough for the stroke to draw itself and take its fill.
  { phase: "sketch", durationMs: 2600 },
  // Long enough for the ascii treatment to arrive and show off its tilt.
  { phase: "ascii", durationMs: 2000 },
  // The warp treatment in its active state, before it settles into the calm
  // resting version of itself that the page lives on.
  { phase: "warp", durationMs: 1800 },
];

export const HEADLINE_INTRO_DURATION_MS = HEADLINE_INTRO_STEPS.reduce(
  (total, step) => total + step.durationMs,
  0
);

export type HeadlineIntroState = {
  phase: HeadlineIntroPhase;
  done: boolean;
};

export const HEADLINE_INTRO_SETTLED: HeadlineIntroState = {
  phase: "final",
  done: true,
};

export function introStateAt(elapsedMs: number): HeadlineIntroState {
  let remaining = Number.isFinite(elapsedMs) ? Math.max(0, elapsedMs) : 0;

  for (const step of HEADLINE_INTRO_STEPS) {
    if (remaining < step.durationMs) {
      return { phase: step.phase, done: false };
    }
    remaining -= step.durationMs;
  }

  return HEADLINE_INTRO_SETTLED;
}
