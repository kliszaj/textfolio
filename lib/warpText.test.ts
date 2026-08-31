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

  test("traces one arc: level at both edges, highest over the middle", () => {
    const start = demoPointerAt(1, DURATION)!.y;
    const middle = demoPointerAt(DURATION / 2, DURATION)!.y;
    const end = demoPointerAt(DURATION - 1, DURATION)!.y;

    expect(middle).toBeGreaterThan(start);
    expect(middle).toBeGreaterThan(end);
    expect(start).toBeCloseTo(end, 2);
  });

  test("the arc rises once and falls once, rather than squiggling", () => {
    // A full sine cycle crossed the centre line twice and read as a wobble.
    let crossings = 0;
    let previous = demoPointerAt(1, DURATION)!.y;
    for (let t = 2; t < DURATION; t += 10) {
      const { y } = demoPointerAt(t, DURATION)!;
      if (Math.sign(y - previous) !== 0 && Math.sign(y - previous) !== Math.sign(previous - demoPointerAt(Math.max(1, t - 20), DURATION)!.y)) {
        crossings += 1;
      }
      previous = y;
    }
    // One turning point: the top of the arc.
    expect(crossings).toBeLessThanOrEqual(2);
  });

  test("stays inside the headline the whole way across", () => {
    for (let t = 0; t < DURATION; t += 25) {
      const { x, y } = demoPointerAt(t, DURATION)!;
      expect(x).toBeGreaterThan(0);
      expect(x).toBeLessThan(1);
      expect(y).toBeGreaterThan(0.3);
      expect(y).toBeLessThan(0.7);
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

describe("demo sweep easing", () => {
  const DURATION = 2200;
  const speedAt = (t: number) => {
    const a = demoPointerAt(t - 1, DURATION)!;
    const b = demoPointerAt(t + 1, DURATION)!;
    return Math.hypot(b.x - a.x, b.y - a.y);
  };

  test("accelerates into the apex and decelerates back out", () => {
    const early = speedAt(DURATION * 0.12);
    const apex = speedAt(DURATION * 0.5);
    const late = speedAt(DURATION * 0.88);

    expect(apex).toBeGreaterThan(early);
    expect(apex).toBeGreaterThan(late);
    // Symmetric: the run-up and the run-down mirror each other.
    expect(early).toBeCloseTo(late, 6);
  });

  test("eases hard enough to actually read as acceleration", () => {
    // Smoothstep peaks at only 1.5x its average speed, which was too gentle to
    // notice. A cubic ease-in-out roughly doubles that contrast.
    const span =
      demoPointerAt(DURATION - 1, DURATION)!.x - demoPointerAt(1, DURATION)!.x;
    const average = span / DURATION;
    // speedAt samples across a 2ms window, so halve it to get per-ms speed.
    const apex = speedAt(DURATION * 0.5) / 2;

    expect(apex / average).toBeGreaterThan(2.5);
  });
});

test("is already moving the moment the sweep starts", () => {
  const DURATION = 2200;
  const speedAt = (t: number) => {
    const a = demoPointerAt(t - 1, DURATION)!;
    const b = demoPointerAt(t + 1, DURATION)!;
    return Math.hypot(b.x - a.x, b.y - a.y) / 2;
  };
  const span =
    demoPointerAt(DURATION - 1, DURATION)!.x - demoPointerAt(1, DURATION)!.x;
  const average = span / DURATION;

  // A pure ease-in crept for the opening moments: nothing read as motion until
  // the sweep was already a good way across.
  expect(speedAt(DURATION * 0.02) / average).toBeGreaterThan(0.15);
});
