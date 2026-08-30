import { smoothTowards } from "./smoothing";

const TAU = 90;

describe("smoothTowards", () => {
  test("moves toward the target without overshooting it", () => {
    const next = smoothTowards(0, 1, 16, TAU);
    expect(next).toBeGreaterThan(0);
    expect(next).toBeLessThan(1);
  });

  test("moves the same distance for the same elapsed time regardless of frame rate", () => {
    // One 32ms step must land where two 16ms steps land, or the motion speeds
    // up and slows down with the frame rate.
    const oneBigStep = smoothTowards(0, 1, 32, TAU);
    const twoSmallSteps = smoothTowards(smoothTowards(0, 1, 16, TAU), 1, 16, TAU);
    expect(oneBigStep).toBeCloseTo(twoSmallSteps, 6);
  });

  test("converges on the target and settles exactly", () => {
    let value = 0;
    for (let i = 0; i < 200; i++) value = smoothTowards(value, 1, 16, TAU);
    expect(value).toBe(1);
  });

  test("settles exactly rather than creeping forever", () => {
    // Landing exactly on the target lets the animation loop stop instead of
    // re-rendering every frame with an imperceptible delta.
    expect(smoothTowards(0.9999999, 1, 16, TAU)).toBe(1);
  });

  test("eases downward as well as upward", () => {
    const next = smoothTowards(1, 0, 16, TAU);
    expect(next).toBeLessThan(1);
    expect(next).toBeGreaterThan(0);
  });

  test("jumps straight to the target when smoothing is switched off", () => {
    expect(smoothTowards(0, 1, 16, 0)).toBe(1);
  });

  test("survives a zero or negative frame delta without moving backwards", () => {
    expect(smoothTowards(0.5, 1, 0, TAU)).toBe(0.5);
    expect(smoothTowards(0.5, 1, -8, TAU)).toBe(0.5);
  });
});
