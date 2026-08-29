import { computeCardTransform } from "./fanTransform";

describe("computeCardTransform", () => {
  test("fanProgress 0 collapses every card to the origin", () => {
    expect(computeCardTransform(0, 3, 0)).toEqual({ x: 0, y: 0, rotate: 0 });
    expect(computeCardTransform(2, 3, 0)).toEqual({ x: 0, y: 0, rotate: 0 });
  });

  test("the middle card of an odd-length stack stays centered at full fan", () => {
    const transform = computeCardTransform(1, 3, 1);
    expect(transform.x).toBe(0);
    expect(transform.rotate).toBe(0);
  });

  test("outer cards spread symmetrically at full fan", () => {
    const left = computeCardTransform(0, 3, 1);
    const right = computeCardTransform(2, 3, 1);
    expect(left.x).toBe(-right.x);
    expect(left.rotate).toBe(-right.rotate);
    expect(left.x).toBeLessThan(0);
    expect(right.x).toBeGreaterThan(0);
  });

  test("a single-card stack only lifts, never spreads horizontally", () => {
    const transform = computeCardTransform(0, 1, 1);
    expect(transform.x).toBe(0);
    expect(transform.rotate).toBe(0);
    expect(transform.y).toBeLessThan(0);
  });
});
