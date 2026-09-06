import {
  SUBHEADER_REVEAL_START_DELAY_MS,
  TAGLINE_FOCUS_MS,
  DOTS_START_DELAY_MS,
  DOT_STAGGER_MS,
  ARROW_FADE_MS,
  HERO_REVEAL_HIDDEN,
  heroRevealSettled,
  heroRevealStateAt,
} from "./heroReveal";

const TAGLINE_LENGTH = 10;
const DOT_COUNT = 5;
const focusedMs = SUBHEADER_REVEAL_START_DELAY_MS + TAGLINE_FOCUS_MS;
const dotsStartMs = focusedMs + DOTS_START_DELAY_MS;
const lastDotMs = dotsStartMs + DOT_STAGGER_MS * (DOT_COUNT - 1);

test("starts with nothing shown, before any time has passed", () => {
  const state = heroRevealStateAt(0, TAGLINE_LENGTH, DOT_COUNT);
  expect(state.subheaderChars).toBe(0);
  expect(state.arrowProgress).toBe(0);
  expect(state.dotsRevealed).toBe(0);
  expect(state.done).toBe(false);
  expect(state.phase).toBe("hidden");
});

describe("the pause before the focus pull starts", () => {
  test("stays hidden for the whole delay", () => {
    const state = heroRevealStateAt(SUBHEADER_REVEAL_START_DELAY_MS - 1, TAGLINE_LENGTH, DOT_COUNT);
    expect(state.phase).toBe("hidden");
    expect(state.subheaderChars).toBe(0);
  });

  test("starts focusing the instant the delay ends", () => {
    expect(heroRevealStateAt(SUBHEADER_REVEAL_START_DELAY_MS, TAGLINE_LENGTH, DOT_COUNT).phase).toBe(
      "focusing"
    );
  });
});

describe("focusing the subheader", () => {
  test("uses a short, copy-independent focus pull", () => {
    expect(TAGLINE_FOCUS_MS).toBe(650);
  });

  test("tracks focus progress across the subtitle's full duration", () => {
    const state = heroRevealStateAt(
      SUBHEADER_REVEAL_START_DELAY_MS + TAGLINE_FOCUS_MS * 0.35,
      TAGLINE_LENGTH,
      DOT_COUNT
    );
    expect(state.subheaderChars).toBe(3);
    expect(state.phase).toBe("focusing");
  });

  test("holds the arrow and dots back until focusing has finished", () => {
    const state = heroRevealStateAt(
      SUBHEADER_REVEAL_START_DELAY_MS + TAGLINE_FOCUS_MS - 1,
      TAGLINE_LENGTH,
      DOT_COUNT
    );
    expect(state.arrowProgress).toBe(0);
    expect(state.dotsRevealed).toBe(0);
  });

  test("never progresses beyond the tagline length", () => {
    const state = heroRevealStateAt(
      SUBHEADER_REVEAL_START_DELAY_MS + TAGLINE_FOCUS_MS - 1,
      TAGLINE_LENGTH,
      DOT_COUNT
    );
    expect(state.subheaderChars).toBeLessThanOrEqual(TAGLINE_LENGTH);
  });
});

describe("the pause before the dots start", () => {
  test("the full tagline has reached focus by the moment the pull hands off", () => {
    expect(heroRevealStateAt(focusedMs, TAGLINE_LENGTH, DOT_COUNT).subheaderChars).toBe(
      TAGLINE_LENGTH
    );
  });

  test("holds every dot and the arrow back for the whole pause", () => {
    const state = heroRevealStateAt(dotsStartMs - 1, TAGLINE_LENGTH, DOT_COUNT);
    expect(state.dotsRevealed).toBe(0);
    expect(state.arrowProgress).toBe(0);
    expect(state.done).toBe(false);
  });
});

describe("the dots, once the pause is over", () => {
  test("the first dot appears the instant the pause ends", () => {
    expect(heroRevealStateAt(dotsStartMs, TAGLINE_LENGTH, DOT_COUNT).dotsRevealed).toBe(1);
  });

  test("each dot pops in DOT_STAGGER_MS after the one before it, top to bottom", () => {
    expect(heroRevealStateAt(dotsStartMs + DOT_STAGGER_MS, TAGLINE_LENGTH, DOT_COUNT).dotsRevealed).toBe(2);
    expect(
      heroRevealStateAt(dotsStartMs + DOT_STAGGER_MS * 4, TAGLINE_LENGTH, DOT_COUNT).dotsRevealed
    ).toBe(5);
  });

  test("never reveals more dots than there are pages", () => {
    const farPast = dotsStartMs + DOT_STAGGER_MS * 100;
    expect(heroRevealStateAt(farPast, TAGLINE_LENGTH, DOT_COUNT).dotsRevealed).toBe(DOT_COUNT);
  });

  test("holds the arrow back until every dot has landed", () => {
    expect(heroRevealStateAt(lastDotMs - 1, TAGLINE_LENGTH, DOT_COUNT).arrowProgress).toBe(0);
  });
});

describe("the arrow, once every dot has landed", () => {
  test("starts fading in the instant the last dot pops", () => {
    const atLastDot = heroRevealStateAt(lastDotMs, TAGLINE_LENGTH, DOT_COUNT);
    expect(atLastDot.arrowProgress).toBe(0);
    expect(atLastDot.dotsRevealed).toBe(DOT_COUNT);

    const aMomentLater = heroRevealStateAt(lastDotMs + 1, TAGLINE_LENGTH, DOT_COUNT);
    expect(aMomentLater.arrowProgress).toBeGreaterThan(0);
  });

  test("finishes fading in after ARROW_FADE_MS", () => {
    expect(heroRevealStateAt(lastDotMs + ARROW_FADE_MS - 1, TAGLINE_LENGTH, DOT_COUNT).arrowProgress).toBeLessThan(1);
    expect(heroRevealStateAt(lastDotMs + ARROW_FADE_MS, TAGLINE_LENGTH, DOT_COUNT).arrowProgress).toBe(1);
  });

  test("is done once the arrow has fully faded in", () => {
    expect(heroRevealStateAt(lastDotMs + ARROW_FADE_MS - 1, TAGLINE_LENGTH, DOT_COUNT).done).toBe(false);
    const done = heroRevealStateAt(lastDotMs + ARROW_FADE_MS, TAGLINE_LENGTH, DOT_COUNT);
    expect(done.done).toBe(true);
    expect(done.phase).toBe("done");
  });
});

test("survives nonsense elapsed values", () => {
  expect(heroRevealStateAt(-500, TAGLINE_LENGTH, DOT_COUNT)).toEqual(
    heroRevealStateAt(0, TAGLINE_LENGTH, DOT_COUNT)
  );
  expect(heroRevealStateAt(NaN, TAGLINE_LENGTH, DOT_COUNT)).toEqual(
    heroRevealStateAt(0, TAGLINE_LENGTH, DOT_COUNT)
  );
});

test("an empty tagline still waits out both pauses before the dots start", () => {
  const state = heroRevealStateAt(SUBHEADER_REVEAL_START_DELAY_MS + DOTS_START_DELAY_MS, 0, DOT_COUNT);
  expect(state.subheaderChars).toBe(0);
  expect(state.dotsRevealed).toBe(1);
});

test("zero pages skips straight to the arrow once the dots' own pause is over", () => {
  const atPauseEnd = heroRevealStateAt(dotsStartMs, TAGLINE_LENGTH, 0);
  expect(atPauseEnd.dotsRevealed).toBe(0);
  expect(atPauseEnd.arrowProgress).toBe(0);

  const aMomentLater = heroRevealStateAt(dotsStartMs + 1, TAGLINE_LENGTH, 0);
  expect(aMomentLater.arrowProgress).toBeGreaterThan(0);

  const done = heroRevealStateAt(dotsStartMs + ARROW_FADE_MS, TAGLINE_LENGTH, 0);
  expect(done.done).toBe(true);
});

describe("HERO_REVEAL_HIDDEN", () => {
  test("shows nothing at all -- the resting state before the headline intro ends", () => {
    expect(HERO_REVEAL_HIDDEN).toEqual({
      phase: "hidden",
      subheaderChars: 0,
      arrowProgress: 0,
      dotsRevealed: 0,
      done: false,
    });
  });
});

describe("heroRevealSettled", () => {
  test("shows everything at once -- for a return visit that skips the intro entirely", () => {
    expect(heroRevealSettled(TAGLINE_LENGTH, DOT_COUNT)).toEqual({
      phase: "done",
      subheaderChars: TAGLINE_LENGTH,
      arrowProgress: 1,
      dotsRevealed: DOT_COUNT,
      done: true,
    });
  });
});
