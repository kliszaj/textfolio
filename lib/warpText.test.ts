import { centeredRunLayout, DEFAULT_WARP_TEXT_CONFIG, demoCircleAt, demoPointerAt } from "./warpText";
import type { CharGlyphMetrics } from "./warpText";

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

describe("the scripted pointer circle", () => {
  const DURATION = 1000;

  test("starts and ends exactly at centre, not part-way round the circle", () => {
    const start = demoCircleAt(0, DURATION)!;
    expect(start.x).toBeCloseTo(0.5, 5);
    expect(start.y).toBeCloseTo(0.5, 5);

    const nearEnd = demoCircleAt(DURATION - 1, DURATION)!;
    expect(nearEnd.x).toBeCloseTo(0.5, 1);
    expect(nearEnd.y).toBeCloseTo(0.5, 1);
  });

  test("reaches its widest point around the middle of the run", () => {
    const distanceFromCentre = (t: number) => {
      const { x, y } = demoCircleAt(t, DURATION)!;
      return Math.hypot(x - 0.5, y - 0.5);
    };
    const middle = distanceFromCentre(DURATION / 2);
    expect(middle).toBeGreaterThan(distanceFromCentre(DURATION * 0.05));
    expect(middle).toBeGreaterThan(distanceFromCentre(DURATION * 0.95));
  });

  test("stays close to centre -- a gentle circle, not a tour of the word", () => {
    for (let t = 0; t < DURATION; t += 25) {
      const { x, y } = demoCircleAt(t, DURATION)!;
      expect(Math.hypot(x - 0.5, y - 0.5)).toBeLessThan(0.2);
    }
  });

  test("actually travels in a circle, not back and forth on one axis", () => {
    // Sampled across the run, x and y should each visit both sides of centre.
    const points = [];
    for (let t = 0; t < DURATION; t += 25) points.push(demoCircleAt(t, DURATION)!);
    expect(points.some((p) => p.x > 0.5)).toBe(true);
    expect(points.some((p) => p.x < 0.5)).toBe(true);
    expect(points.some((p) => p.y > 0.5)).toBe(true);
    expect(points.some((p) => p.y < 0.5)).toBe(true);
  });

  test("stays out of the way when it was never asked for", () => {
    expect(demoCircleAt(10, 0)).toBeNull();
    expect(demoCircleAt(NaN, DURATION)).toBeNull();
    expect(demoCircleAt(-5, DURATION)).toBeNull();
    expect(demoCircleAt(DURATION, DURATION)).toBeNull();
    expect(demoCircleAt(DURATION + 400, DURATION)).toBeNull();
  });
});

describe("centreing a hand-laid-out run on its own tight ink, not its advance box", () => {
  // Canvas has no built-in way to centre a run drawn character-by-character
  // on its combined ink bounds: textBaseline "middle" centres on the font's
  // ascent/descent metrics, and a naive `width/2 - totalAdvance/2` start
  // centres on the advance box. A bold display face's side bearings are
  // rarely equal left to right (or top to bottom), so either proxy can leave
  // the actual ink a few pixels off from the host's true centre -- the same
  // class of mismatch already found on the sketch and ascii treatments, here
  // affecting the "default" warp treatment every other treatment is meant to
  // match exactly.
  const char = (
    advance: number,
    boundingBoxLeft: number,
    boundingBoxRight: number,
    boundingBoxAscent: number,
    boundingBoxDescent: number
  ): CharGlyphMetrics => ({ advance, boundingBoxLeft, boundingBoxRight, boundingBoxAscent, boundingBoxDescent });

  test("centres a single character's ink, not its advance box", () => {
    // Advance is 20, but the ink itself (bearing 2 in, bearing 15 out) is
    // only 17 wide and sits off-centre within that advance box.
    const layout = centeredRunLayout([char(20, 2, 15, 30, 5)], 0, 100, 100);
    const inkLeft = layout.charX[0] - 2;
    const inkRight = layout.charX[0] + 15;
    expect(inkLeft).toBeCloseTo(100 / 2 - 17 / 2, 6);
    expect(inkRight).toBeCloseTo(100 / 2 + 17 / 2, 6);
  });

  test("centres the whole run's combined ink span, not each character alone", () => {
    const layout = centeredRunLayout(
      [char(10, 1, 8, 20, 3), char(12, 3, 9, 25, 6)],
      2,
      200,
      100
    );
    const inkLeft = layout.charX[0] - 1;
    const inkRight = layout.charX[1] + 9;
    expect(inkLeft).toBeCloseTo(200 / 2 - (inkRight - inkLeft) / 2, 6);
    expect(inkRight).toBeCloseTo(200 / 2 + (inkRight - inkLeft) / 2, 6);
    // The gap between characters is still the requested letter-spacing --
    // centring the run doesn't compress or stretch it.
    expect(layout.charX[1] - layout.charX[0]).toBeCloseTo(10 + 2, 6);
  });

  test("places the shared baseline on the run's tallest ascent and descent", () => {
    const layout = centeredRunLayout(
      [char(10, 1, 8, 20, 3), char(12, 3, 9, 25, 6)],
      2,
      200,
      100
    );
    // Ink top = baselineY - maxAscent, ink bottom = baselineY + maxDescent;
    // centred means those sit symmetrically around the host's own centre.
    const inkTop = layout.baselineY - 25;
    const inkBottom = layout.baselineY + 6;
    expect(inkTop).toBeCloseTo(100 / 2 - (inkBottom - inkTop) / 2, 6);
    expect(inkBottom).toBeCloseTo(100 / 2 + (inkBottom - inkTop) / 2, 6);
  });

  test("matches naive advance-box centring when the ink happens to fill it exactly", () => {
    // A sanity check that this is a generalisation, not a different answer
    // for the easy case: ink spanning exactly [0, advance] (no bearing
    // either side) should land exactly where a plain width/2 - advance/2
    // start would.
    const layout = centeredRunLayout([char(20, 0, 20, 10, 10)], 0, 100, 100);
    expect(layout.charX[0]).toBeCloseTo(100 / 2 - 20 / 2, 6);
    expect(layout.baselineY).toBeCloseTo(100 / 2, 6);
  });

  test("stays inert for an empty run rather than dividing by nothing", () => {
    const layout = centeredRunLayout([], 0, 100, 100);
    expect(layout.charX).toEqual([]);
    expect(layout.baselineY).toBeCloseTo(50, 6);
  });
});
