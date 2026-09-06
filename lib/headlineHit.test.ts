import { HEADLINE_HIT_PADDING_SHARE, isOverHeadline, unionBox } from "./headlineHit";

// A word 400px wide and 100px tall, centred in a much wider frame.
const word = { left: 300, right: 700, top: 200, bottom: 300 };
const pad = 100 * HEADLINE_HIT_PADDING_SHARE;

test("counts a point on the letters", () => {
  expect(isOverHeadline({ x: 500, y: 250 }, word)).toBe(true);
});

test("ignores the empty frame either side of the word", () => {
  // The frame runs the width of the page; the word does not. Hovering that
  // whitespace used to change the treatment.
  expect(isOverHeadline({ x: 80, y: 250 }, word)).toBe(false);
  expect(isOverHeadline({ x: 1200, y: 250 }, word)).toBe(false);
});

test("ignores the empty frame above and below the word", () => {
  expect(isOverHeadline({ x: 500, y: 40 }, word)).toBe(false);
  expect(isOverHeadline({ x: 500, y: 460 }, word)).toBe(false);
});

test("allows a little air around the letters", () => {
  // Just outside the A and just past the final N still count, so the target
  // is not knife-edged.
  expect(isOverHeadline({ x: word.left - pad / 2, y: 250 }, word)).toBe(true);
  expect(isOverHeadline({ x: word.right + pad / 2, y: 250 }, word)).toBe(true);
});

test("stops at the edge of that air", () => {
  expect(isOverHeadline({ x: word.left - pad * 2, y: 250 }, word)).toBe(false);
  expect(isOverHeadline({ x: word.right + pad * 2, y: 250 }, word)).toBe(false);
});

test("scales its padding with the headline, not with pixels", () => {
  const big = { left: 0, right: 1000, top: 0, bottom: 400 };
  const bigPad = 400 * HEADLINE_HIT_PADDING_SHARE;
  expect(isOverHeadline({ x: -bigPad / 2, y: 200 }, big)).toBe(true);
  expect(isOverHeadline({ x: -bigPad * 2, y: 200 }, big)).toBe(false);
});

test("treats an unmeasured word as the whole frame, so hover still works", () => {
  // Before layout there is nothing to hit-test against; falling back to the
  // old behaviour beats making the headline dead.
  expect(isOverHeadline({ x: 500, y: 250 }, { left: 0, right: 0, top: 0, bottom: 0 })).toBe(true);
});

describe("unionBox", () => {
  test("combines two boxes into their bounding rectangle", () => {
    const tagline = { left: 250, right: 750, top: 320, bottom: 360 };
    expect(unionBox(word, tagline)).toEqual({ left: 250, right: 750, top: 200, bottom: 360 });
  });

  test("returns the first box unchanged when there is no second one", () => {
    expect(unionBox(word, undefined)).toEqual(word);
  });

  test("a point only inside the second box counts as over the union", () => {
    const tagline = { left: 250, right: 750, top: 320, bottom: 360 };
    const box = unionBox(word, tagline);
    // y: 340 sits inside the tagline's own range but well outside the word's.
    expect(isOverHeadline({ x: 500, y: 340 }, box)).toBe(true);
  });
});
