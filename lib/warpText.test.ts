import { DEFAULT_WARP_TEXT_CONFIG, demoPointerAt } from "./warpText";

test("every field has a default, so the config can be spread as props", () => {
  const keys = Object.keys(DEFAULT_WARP_TEXT_CONFIG).sort();
  expect(keys).toEqual([
    "lineHeight",
    "pointerInfluence",
    "pointerStrength",
    "refraction",
    "ripple",
    "speed",
    "warpScale",
    "warpStrength",
  ]);
});

test("shader amounts stay in the 0-1 range the uniforms expect", () => {
  for (const key of ["warpStrength", "pointerInfluence", "pointerStrength", "refraction"] as const) {
    expect(DEFAULT_WARP_TEXT_CONFIG[key]).toBeGreaterThanOrEqual(0);
    expect(DEFAULT_WARP_TEXT_CONFIG[key]).toBeLessThanOrEqual(1);
  }
});

test("the warp animates rather than sitting frozen", () => {
  expect(DEFAULT_WARP_TEXT_CONFIG.speed).toBeGreaterThan(0);
  expect(DEFAULT_WARP_TEXT_CONFIG.warpScale).toBeGreaterThan(0);
});

describe("the scripted pointer sweep", () => {
  const DURATION = 1500;

  test("starts and ends at the centre of the headline", () => {
    expect(demoPointerAt(0, DURATION)!.x).toBeCloseTo(0.5, 6);
    expect(demoPointerAt(DURATION / 2, DURATION)!.x).toBeCloseTo(0.5, 6);
  });

  test("sweeps one way and then the other", () => {
    const first = demoPointerAt(DURATION * 0.25, DURATION)!.x;
    const second = demoPointerAt(DURATION * 0.75, DURATION)!.x;
    expect(first).toBeGreaterThan(0.5);
    expect(second).toBeLessThan(0.5);
    expect(first - 0.5).toBeCloseTo(0.5 - second, 6);
  });

  test("stays inside the headline it is sweeping across", () => {
    for (let t = 0; t < DURATION; t += 25) {
      const { x, y } = demoPointerAt(t, DURATION)!;
      expect(x).toBeGreaterThan(0);
      expect(x).toBeLessThan(1);
      expect(y).toBe(0.5);
    }
  });

  test("hands back to the real pointer once it is done", () => {
    expect(demoPointerAt(DURATION, DURATION)).toBeNull();
    expect(demoPointerAt(DURATION + 400, DURATION)).toBeNull();
  });

  test("stays out of the way when it was never asked for", () => {
    expect(demoPointerAt(10, 0)).toBeNull();
    expect(demoPointerAt(NaN, DURATION)).toBeNull();
    expect(demoPointerAt(-5, DURATION)).toBeNull();
  });
});
