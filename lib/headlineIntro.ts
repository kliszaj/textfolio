import { DEFAULT_STROKE_TEXT_CONFIG, correctionSequenceMs } from "./strokeText";

// The headline tells the story of the work on load: sketched, prototyped in
// ascii, warped into shape, then finished. Each phase hands over to the next
// when it has had its time.
export type HeadlineIntroPhase = "sketch" | "ascii" | "warp" | "final";

// How long the headline fades down and back up around each treatment change.
// Keep this separate from the phase length: the demo motion ends before the
// outgoing half of the handover starts, rather than vanishing mid-gesture.
export const HEADLINE_HANDOVER_MS = 600;

// The graphite fill is drawn one pencil stroke at a time before the red
// correction mark starts. Give that slower sequence a generous stage so the
// headline never hands off while the X is still being written.
const SKETCH_SETTLE_MS = 900;
export const SKETCH_INTRO_DURATION_MS = Math.max(
  8000,
  correctionSequenceMs(
    DEFAULT_STROKE_TEXT_CONFIG.drawDuration,
    DEFAULT_STROKE_TEXT_CONFIG.stagger,
    6
  ) + SKETCH_SETTLE_MS
);

// The sketch establishes the cadence. ASCII and Warp deliberately inherit
// this value, so if the sketch sequence needs more time later their refresh
// beats and demos lengthen with it instead of becoming brief interludes.
export const HEADLINE_TREATMENT_DURATION_MS = SKETCH_INTRO_DURATION_MS;
export const HEADLINE_INTRO_DEMO_MS =
  HEADLINE_TREATMENT_DURATION_MS - HEADLINE_HANDOVER_MS / 2;

export const HEADLINE_INTRO_STEPS: { phase: HeadlineIntroPhase; durationMs: number }[] = [
  // Every treatment receives the same screen time. The sketch is the source
  // of truth because its drawn lines and correction have the longest natural
  // sequence; the other effects use the shared demo duration above.
  { phase: "sketch", durationMs: HEADLINE_TREATMENT_DURATION_MS },
  { phase: "ascii", durationMs: HEADLINE_TREATMENT_DURATION_MS },
  { phase: "warp", durationMs: HEADLINE_TREATMENT_DURATION_MS },
];

export const HEADLINE_INTRO_DURATION_MS = HEADLINE_INTRO_STEPS.reduce(
  (total, step) => total + step.durationMs,
  0
);

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
