// The headline used to tell a story on load -- sketched, prototyped in
// ascii, warped into shape -- each treatment drawing itself in over several
// seconds. It now flips through the three finished treatments instead: a
// quick reel proving the range exists, not a narrative watching it arrive.
// Nine seconds of watching a word draw itself in, every single page load,
// was a lot to ask of a returning visitor. It used to open on a brief
// resting beat before the reel started; per direct request that beat is
// gone too, so the reel starts straight on sketch.
export type HeadlineIntroPhase = "sketch" | "ascii" | "warp" | "final";

// How long the headline fades down and back up around each treatment change.
// 0 per direct request -- a hard cut, not a crossfade, so the flip-through
// reads as flashing by rather than dissolving. This deliberately gives up
// the fade's other job (hiding a treatment mid-mount, before its own WebGL
// or SVG has finished initialising): ASCII and Stroke fully mount and
// unmount on every swap, unlike Warp, which stays mounted throughout and so
// was never at risk here. If a swap into ascii or sketch shows a flash of
// unstyled fallback text, that trade is why -- see invariant 14, "a
// treatment must never mount visible", elsewhere in this file's history.
export const HEADLINE_HANDOVER_MS = 0;

// Every treatment gets the same beat to be seen before handing over to the
// next.
export const HEADLINE_TREATMENT_DURATION_MS = 300;

export const HEADLINE_INTRO_DEMO_MS =
  HEADLINE_TREATMENT_DURATION_MS - HEADLINE_HANDOVER_MS / 2;

// ASCII keeps its own constant so its stage can be lengthened again without
// touching the others, but for now every treatment shares the same beat.
export const ASCII_INTRO_DURATION_MS = HEADLINE_TREATMENT_DURATION_MS;
export const ASCII_INTRO_DEMO_MS =
  ASCII_INTRO_DURATION_MS - HEADLINE_HANDOVER_MS / 2;

export const HEADLINE_INTRO_STEPS: { phase: HeadlineIntroPhase; durationMs: number }[] = [
  // The reel opens here now, not on a resting beat first -- shown drawn,
  // filled, and corrected already, no draw-in. Sketch's whole appeal is the
  // finished hand-inked look, which a still frame shows just as well as
  // watching it arrive, in a fraction of the time.
  { phase: "sketch", durationMs: HEADLINE_TREATMENT_DURATION_MS },
  // Ascii and warp keep a small scripted motion (a lean, a circle) -- unlike
  // sketch, their whole effect is invisible without something moving.
  { phase: "ascii", durationMs: ASCII_INTRO_DURATION_MS },
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

// How many times the flicker below dips back down before settling. Kept low
// enough to read as a stutter, not a strobe someone could count.
const HANDOVER_FLICKER_CYCLES = 2.5;

// A stutter rather than a smooth dissolve -- echoing the site's own
// glitch/CRT vocabulary (the ASCII treatment's scanlines and matrix-rain)
// instead of a crossfade. `t` is 0 exactly on a boundary and 1 once the
// handover window has fully elapsed; those two endpoints are load-bearing
// and must not move regardless of how the flicker in between is tuned --
// a treatment mounts at 0, and anything other than 0 there reintroduces the
// white-flash class of bug this project already fixed once ("The white box
// was isolation: isolate", elsewhere in this file's history). The flicker
// term itself starts and ends at 0 (a sine, not a cosine) so it only ever
// perturbs the middle of the window, never those two guaranteed endpoints.
// Exported so its own shape stays pinned by tests independent of whatever
// HEADLINE_HANDOVER_MS is currently set to (0 right now, which bypasses it
// entirely -- see handoverOpacityAt below). Kept rather than deleted: this is
// a tunable currently at zero, not an abandoned feature, and re-enabling any
// fade at all should not mean re-deriving this from scratch.
export function glitchFlicker(t: number): number {
  // Clamped before the flicker term, not just the envelope: past t=1 the
  // (1 - t) factor below goes negative and the sine keeps oscillating, so an
  // unclamped t would give values other than a clean, exact 1 arbitrarily
  // far past the handover window.
  const clamped = Math.min(1, Math.max(0, t));
  const envelope = smoothstep(clamped);
  const flicker = Math.sin(clamped * Math.PI * HANDOVER_FLICKER_CYCLES * 2) * (1 - clamped) * 0.6;
  return Math.min(1, Math.max(0, envelope + flicker));
}

// 0 exactly on a boundary, flickering back up to 1 either side of it. The
// opening boundary at 0 doubles as the page's own fade-in.
export function handoverOpacityAt(elapsedMs: number): number {
  const half = HEADLINE_HANDOVER_MS / 2;
  // A zero-length window has no fade to compute -- always fully visible, so
  // a swap is a hard cut with nothing dipping to hide it, not a division by
  // zero (half would be 0, and glitchFlicker's own t=0/0 is undefined).
  if (half <= 0) return 1;
  const nearest = HEADLINE_INTRO_BOUNDARIES_MS.reduce(
    (closest, boundary) => Math.min(closest, Math.abs(elapsedMs - boundary)),
    Infinity
  );
  return glitchFlicker(nearest / half);
}

export type HeadlineIntroState = {
  phase: HeadlineIntroPhase;
  // How far through the current stage, 0-1. Lets a treatment schedule its own
  // entrance against the stage that holds it rather than a second timer.
  phaseProgress: number;
  // Fades through each handover so treatments swap unseen.
  opacity: number;
  done: boolean;
};

export const HEADLINE_INTRO_SETTLED: HeadlineIntroState = {
  phase: "final",
  phaseProgress: 1,
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
        phaseProgress: remaining / step.durationMs,
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
    phaseProgress: 1,
    opacity: handoverOpacityAt(remainingFromStart),
    done: false,
  };
}
