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

  test("crosses the headline from left to right, passing centre halfway", () => {
    expect(demoPointerAt(0, DURATION)!.x).toBeLessThan(0.5);
    expect(demoPointerAt(DURATION / 2, DURATION)!.x).toBeCloseTo(0.5, 6);
    expect(demoPointerAt(DURATION * 0.99, DURATION)!.x).toBeGreaterThan(0.5);
  });

  test("only ever travels one way, never doubling back", () => {
    let previous = -Infinity;
    for (let t = 0; t < DURATION; t += 25) {
      const { x } = demoPointerAt(t, DURATION)!;
      expect(x).toBeGreaterThanOrEqual(previous);
      previous = x;
    }
  });

  test("stays inside the headline while tracing a sine curve", () => {
    const samples = [] as number[];
    for (let t = 0; t < DURATION; t += 25) {
      const { x, y } = demoPointerAt(t, DURATION)!;
      expect(x).toBeGreaterThan(0);
      expect(x).toBeLessThan(1);
      expect(y).toBeGreaterThan(0.3);
      expect(y).toBeLessThan(0.7);
      samples.push(y);
    }
    expect(new Set(samples.map((value) => value.toFixed(3))).size).toBeGreaterThan(3);
    expect(samples.some((value) => value > 0.6)).toBe(true);
    expect(samples.some((value) => value < 0.4)).toBe(true);
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
