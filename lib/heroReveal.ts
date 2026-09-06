// Once the headline's own intro finishes (sketch -> ascii -> warp -> final),
// the subheader, the down-arrow, and the page-indicator dots are still
// hidden -- this drives the beat that brings them in: the subheader resolves
// from a soft focus, then the arrow draws in while the dots pop in one at a time,
// top to bottom, alongside it.

export type HeroRevealPhase = "hidden" | "focusing" | "revealing" | "done";

export type HeroRevealState = {
  phase: HeroRevealPhase;
  // How many characters of the tagline are showing.
  subheaderChars: number;
  // 0-1: how far the arrow has drawn in.
  arrowProgress: number;
  // How many page-indicator dots have started their own pop-in.
  dotsRevealed: number;
  done: boolean;
};

export const HERO_REVEAL_HIDDEN: HeroRevealState = {
  phase: "hidden",
  subheaderChars: 0,
  arrowProgress: 0,
  dotsRevealed: 0,
  done: false,
};

// Everything showing at once -- a return visit skips the headline's own
// intro entirely (useIntroOnce), and this reveal is part of that same
// intro, not something a returning visitor should sit through again.
export function heroRevealSettled(taglineLength: number, dotCount: number): HeroRevealState {
  return {
    phase: "done",
    subheaderChars: taglineLength,
    arrowProgress: 1,
    dotsRevealed: dotCount,
    done: true,
  };
}

// A breath between the headline handing off and the subtitle starting to
// resolve -- landing straight on the resting treatment read as rushed, with
// nothing marking the handoff as its own moment.
export const SUBHEADER_REVEAL_START_DELAY_MS = 350;

// A single, short focus pull for the entire sentence. Unlike the prior
// per-character cadence, copy edits never alter the reveal's duration.
export const TAGLINE_FOCUS_MS = 650;

// A breath between the subtitle resolving and the dots starting their own
// pop-in -- the two used to land in the same instant, which read as the
// dots being an afterthought rather than their own beat.
export const DOTS_START_DELAY_MS = 200;

// Gap between each dot starting its own pop-in, top to bottom.
export const DOT_STAGGER_MS = 110;

// How long the arrow takes to fade in, once every dot has already landed.
export const ARROW_FADE_MS = 350;

export function heroRevealStateAt(
  elapsedMs: number,
  taglineLength: number,
  dotCount: number
): HeroRevealState {
  const elapsed = Number.isFinite(elapsedMs) ? Math.max(0, elapsedMs) : 0;

  if (elapsed < SUBHEADER_REVEAL_START_DELAY_MS) {
    return HERO_REVEAL_HIDDEN;
  }

  const sinceDelay = elapsed - SUBHEADER_REVEAL_START_DELAY_MS;
  const focusMs = taglineLength > 0 ? TAGLINE_FOCUS_MS : 0;

  if (sinceDelay < focusMs) {
    return {
      phase: "focusing",
      // Hero renders the full line; this remains a compact 0–length progress
      // value so the visual focus can be driven without another rAF state.
      subheaderChars: Math.floor((sinceDelay / focusMs) * taglineLength),
      arrowProgress: 0,
      dotsRevealed: 0,
      done: false,
    };
  }

  const revealElapsed = sinceDelay - focusMs;
  if (revealElapsed < DOTS_START_DELAY_MS) {
    return {
      phase: "revealing",
      subheaderChars: taglineLength,
      arrowProgress: 0,
      dotsRevealed: 0,
      done: false,
    };
  }

  // The arrow waits for every dot to have landed, then fades in on its own
  // -- not alongside them, so it reads as the reveal's closing beat rather
  // than one more thing happening at once.
  const dotsElapsed = revealElapsed - DOTS_START_DELAY_MS;
  const dotsRevealed =
    dotCount <= 0 ? 0 : Math.min(dotCount, Math.floor(dotsElapsed / DOT_STAGGER_MS) + 1);
  const dotsDone = dotCount <= 0 || dotsRevealed >= dotCount;
  const lastDotElapsed = dotCount <= 0 ? 0 : DOT_STAGGER_MS * (dotCount - 1);
  const arrowProgress = dotsDone
    ? Math.min(1, Math.max(0, dotsElapsed - lastDotElapsed) / ARROW_FADE_MS)
    : 0;
  const done = dotsDone && arrowProgress >= 1;

  return {
    phase: done ? "done" : "revealing",
    subheaderChars: taglineLength,
    arrowProgress,
    dotsRevealed,
    done,
  };
}
