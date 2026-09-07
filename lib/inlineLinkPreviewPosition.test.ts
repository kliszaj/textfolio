import { clampPreviewPosition } from "./inlineLinkPreviewPosition";

const viewport = { width: 1200, height: 800 };
const card = { width: 288, height: 280 };
const margin = 16;

test("leaves a point untouched when the card comfortably fits", () => {
  expect(clampPreviewPosition({ x: 500, y: 400 }, viewport, card, margin)).toEqual({
    x: 500,
    y: 400,
  });
});

test("pulls the card back from the right edge", () => {
  const result = clampPreviewPosition({ x: 1190, y: 400 }, viewport, card, margin);
  expect(result.x).toBe(viewport.width - card.width - margin);
});

test("pulls the card back from the bottom edge", () => {
  const result = clampPreviewPosition({ x: 500, y: 790 }, viewport, card, margin);
  expect(result.y).toBe(viewport.height - card.height - margin);
});

test("never places the card left of or above the margin", () => {
  expect(clampPreviewPosition({ x: -50, y: -50 }, viewport, card, margin)).toEqual({
    x: margin,
    y: margin,
  });
});

test("clamps both axes at once, near a corner", () => {
  const result = clampPreviewPosition({ x: 1190, y: 790 }, viewport, card, margin);
  expect(result).toEqual({
    x: viewport.width - card.width - margin,
    y: viewport.height - card.height - margin,
  });
});
