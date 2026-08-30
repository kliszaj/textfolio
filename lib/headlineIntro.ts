// The headline tells the story of the work on load: sketched, prototyped in
// ascii, warped into shape, then finished. Each phase hands over to the next
// when it has had its time.
export type HeadlineIntroPhase = "sketch" | "ascii" | "warp" | "final";

export const HEADLINE_INTRO_STEPS: { phase: HeadlineIntroPhase; durationMs: number }[] = [
  // Long enough for the stroke to draw itself, take its fill, and be marked
  // up in red -- see the test pinning it against correctionSequenceMs.
  { phase: "sketch", durationMs: 4200 },
  // Long enough for the ascii treatment to arrive, run its full sweep, and
  // settle before handing over.
  { phase: "ascii", durationMs: 2700 },
  // The warp treatment in its active state, before it settles into the calm
  // resting version of itself that the page lives on.
  { phase: "warp", durationMs: 2700 },
];

export const HEADLINE_INTRO_DURATION_MS = HEADLINE_INTRO_STEPS.reduce(
  (total, step) => total + step.durationMs,
  0
);

// How long a handover takes. The headline dips out and back in around each
// stage boundary, so one treatment is swapped for the next while nothing is
// on screen -- a mount is invisible instead of a hard cut.
export const HEADLINE_HANDOVER_MS = 600;

function smoothstep(t: number): number {
  const x = Math.min(1, Math.max(0, t));
  return x * x * (3 - 2 * x);
}

export const HEADLINE_INTRO_BOUNDARIES_MS = HEADLINE_INTRO_STEPS.reduce<number[]>(
  (boundaries, step) => [...boundaries, boundaries[boundaries.length - 1] + step.durationMs],
  [0]
);

// 0 exactly on a boundary, easing back to 1 either side of it. The opening
// boundary at 0 doubles as the page's own fade-in.
export function handoverOpacityAt(elapsedMs: number): number {
  const half = HEADLINE_HANDOVER_MS / 2;
  const nearest = HEADLINE_INTRO_BOUNDARIES_MS.reduce(
    (closest, boundary) => Math.min(closest, Math.abs(elapsedMs - boundary)),
    Infinity
  );
  return smoothstep(nearest / half);
}

export type HeadlineIntroState = {
  phase: HeadlineIntroPhase;
  // Fades through each handover so treatments swap unseen.
  opacity: number;
  done: boolean;
};

export const HEADLINE_INTRO_SETTLED: HeadlineIntroState = {
  phase: "final",
  opacity: 1,
  done: true,
};

export function introStateAt(elapsedMs: number): HeadlineIntroState {
  const remainingFromStart = Number.isFinite(elapsedMs) ? Math.max(0, elapsedMs) : 0;
  let remaining = remainingFromStart;

  for (const step of HEADLINE_INTRO_STEPS) {
    if (remaining < step.durationMs) {
      return {
        phase: step.phase,
        opacity: handoverOpacityAt(remainingFromStart),
        done: false,
      };
    }
    remaining -= step.durationMs;
  }

  // The last stage still has to fade back in before the story is over, or the
  // finished treatment would appear in a hard cut of its own.
  const settled = remainingFromStart >= HEADLINE_INTRO_DURATION_MS + HEADLINE_HANDOVER_MS / 2;
  if (settled) return HEADLINE_INTRO_SETTLED;

  return {
    phase: "final",
    opacity: handoverOpacityAt(remainingFromStart),
    done: false,
  };
}
