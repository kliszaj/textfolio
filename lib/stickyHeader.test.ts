import { nextHeaderShrunk } from "./stickyHeader";

test("keeps the header full only at the document top", () => {
  expect(
    nextHeaderShrunk(0)
  ).toBe(false);
});

test("shrinks at every nonzero scroll position", () => {
  expect(
    nextHeaderShrunk(1)
  ).toBe(true);
});

test("stays compact while scrolling upward until the exact top", () => {
  expect(
    nextHeaderShrunk(1)
  ).toBe(true);
});

test("normalizes a negative overscroll to the document top", () => {
  expect(
    nextHeaderShrunk(-1)
  ).toBe(false);
});
