// The headline tells the story of the work on load: sketched, then prototyped,
// then finished. Each phase hands over to the next when it has had its time.
export type HeadlineIntroPhase = "sketch" | "ascii" | "final";

export const HEADLINE_INTRO_STEPS: { phase: HeadlineIntroPhase; durationMs: number }[] = [
  // Long enough for the stroke to draw itself and take its fill.
  { phase: "sketch", durationMs: 2600 },
  // The characters type in, then the finished ascii holds for a beat.
  { phase: "ascii", durationMs: 2000 },
];

// Share of the ascii step spent typing; the rest is the hold.
export const ASCII_TYPE_SHARE = 0.65;

export const HEADLINE_INTRO_DURATION_MS = HEADLINE_INTRO_STEPS.reduce(
  (total, step) => total + step.durationMs,
  0
);

export type HeadlineIntroState = {
  phase: HeadlineIntroPhase;
  // How much of the ascii headline has typed in. 1 whenever nothing is typing.
  revealFraction: number;
  done: boolean;
};

export const HEADLINE_INTRO_SETTLED: HeadlineIntroState = {
  phase: "final",
  revealFraction: 1,
  done: true,
};

export function introStateAt(elapsedMs: number): HeadlineIntroState {
  let remaining = Number.isFinite(elapsedMs) ? Math.max(0, elapsedMs) : 0;

  for (const step of HEADLINE_INTRO_STEPS) {
    if (remaining < step.durationMs) {
      const within = remaining / step.durationMs;
      return {
        phase: step.phase,
        revealFraction:
          step.phase === "ascii" ? Math.min(1, within / ASCII_TYPE_SHARE) : 1,
        done: false,
      };
    }
    remaining -= step.durationMs;
  }

  return HEADLINE_INTRO_SETTLED;
}
