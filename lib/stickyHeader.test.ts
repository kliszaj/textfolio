import { HEADER_SETTLE_MS, HEADER_SHRINK_AT_PX, nextHeaderShrunk } from "./stickyHeader";

test("keeps the header full through the first small wheel movement", () => {
  expect(
    nextHeaderShrunk({ shrunk: false, currentY: HEADER_SHRINK_AT_PX, sinceChangeMs: Infinity })
  ).toBe(false);
});

test("shrinks after a meaningful move down the page", () => {
  expect(
    nextHeaderShrunk({ shrunk: false, currentY: HEADER_SHRINK_AT_PX + 1, sinceChangeMs: Infinity })
  ).toBe(true);
});

test("ignores scroll positions caused by its own height transition", () => {
  expect(
    nextHeaderShrunk({ shrunk: true, currentY: 0, sinceChangeMs: HEADER_SETTLE_MS - 1 })
  ).toBe(true);
});

test("stays compact while scrolling upward until the exact top", () => {
  expect(
    nextHeaderShrunk({ shrunk: true, currentY: 1, sinceChangeMs: Infinity })
  ).toBe(true);
});

test("expands after settling when the reader reaches the top", () => {
  expect(
    nextHeaderShrunk({ shrunk: true, currentY: 0, sinceChangeMs: HEADER_SETTLE_MS })
  ).toBe(false);
});

test("normalizes a negative overscroll to the document top", () => {
  expect(
    nextHeaderShrunk({ shrunk: true, currentY: -1, sinceChangeMs: Infinity })
  ).toBe(false);
});
