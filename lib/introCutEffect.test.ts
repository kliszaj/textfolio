import {
  INTRO_CUT_EFFECTS,
  INTRO_CUT_RGB_FLASH_MS,
  INTRO_CUT_NOISE_BURST_MS,
  INTRO_CUT_RGB_MIN_Y_MAGNITUDE,
  DEFAULT_INTRO_CUT_RGB_CONFIG,
  alternatingRgbOffsetY,
  isIntroCutEffect,
  sanitizeIntroCutRgbConfig,
} from "./introCutEffect";

test("the three real options are none, rgb, and noise -- tear was prototyped, not built", () => {
  expect(INTRO_CUT_EFFECTS).toEqual(["none", "rgb", "noise"]);
});

test("both effects clear themselves well within a single treatment beat", () => {
  expect(INTRO_CUT_RGB_FLASH_MS).toBeGreaterThan(0);
  expect(INTRO_CUT_NOISE_BURST_MS).toBeGreaterThan(0);
});

test("every field of the rgb split config has a default, so it can be spread as props", () => {
  const keys = Object.keys(DEFAULT_INTRO_CUT_RGB_CONFIG).sort();
  expect(keys).toEqual(["durationMs", "offsetX", "offsetY"]);
});

test("the rgb config defaults to a pure horizontal split, matching the original fixed filter", () => {
  // Locks the default in against what shipped un-tunable: a 4px split, no
  // vertical component, cleared after INTRO_CUT_RGB_FLASH_MS -- so exposing
  // the sliders can't silently change the out-of-the-box look.
  expect(DEFAULT_INTRO_CUT_RGB_CONFIG.offsetX).toBe(4);
  expect(DEFAULT_INTRO_CUT_RGB_CONFIG.offsetY).toBe(0);
  expect(DEFAULT_INTRO_CUT_RGB_CONFIG.durationMs).toBe(INTRO_CUT_RGB_FLASH_MS);
});

describe("isIntroCutEffect", () => {
  // The picker's selection round-trips through localStorage as a plain
  // string, so restoring it needs to validate rather than trust the value --
  // an older build, a stale tab, or hand-edited storage could hand back
  // anything.
  test("accepts each real option", () => {
    for (const effect of INTRO_CUT_EFFECTS) {
      expect(isIntroCutEffect(effect)).toBe(true);
    }
  });

  test("rejects a value from a since-removed option, like tear", () => {
    expect(isIntroCutEffect("tear")).toBe(false);
  });

  test("rejects unrelated or missing storage", () => {
    expect(isIntroCutEffect(null)).toBe(false);
    expect(isIntroCutEffect("")).toBe(false);
    expect(isIntroCutEffect("RGB")).toBe(false);
  });
});

describe("sanitizeIntroCutRgbConfig", () => {
  test("passes a fully valid config straight through", () => {
    const config = { offsetX: 9, offsetY: -2, durationMs: 120 };
    expect(sanitizeIntroCutRgbConfig(config)).toEqual(config);
  });

  test("falls back to the default whole object when storage is empty", () => {
    expect(sanitizeIntroCutRgbConfig(null)).toEqual(DEFAULT_INTRO_CUT_RGB_CONFIG);
    expect(sanitizeIntroCutRgbConfig(undefined)).toEqual(DEFAULT_INTRO_CUT_RGB_CONFIG);
    expect(sanitizeIntroCutRgbConfig("not an object")).toEqual(DEFAULT_INTRO_CUT_RGB_CONFIG);
  });

  test("repairs one bad field without discarding the others a slider actually set", () => {
    expect(
      sanitizeIntroCutRgbConfig({ offsetX: 12, offsetY: "not a number", durationMs: 90 })
    ).toEqual({
      offsetX: 12,
      offsetY: DEFAULT_INTRO_CUT_RGB_CONFIG.offsetY,
      durationMs: 90,
    });
  });

  test("rejects NaN and Infinity, not just non-numbers", () => {
    expect(
      sanitizeIntroCutRgbConfig({ offsetX: NaN, offsetY: Infinity, durationMs: 90 })
    ).toEqual({
      offsetX: DEFAULT_INTRO_CUT_RGB_CONFIG.offsetX,
      offsetY: DEFAULT_INTRO_CUT_RGB_CONFIG.offsetY,
      durationMs: 90,
    });
  });
});

describe("alternatingRgbOffsetY", () => {
  test("applies whichever sign it's given", () => {
    expect(alternatingRgbOffsetY(20, 1)).toBeGreaterThan(0);
    expect(alternatingRgbOffsetY(20, -1)).toBeLessThan(0);
  });

  test("never lands inside the -10 to 10 dead zone, even at the default 0", () => {
    expect(Math.abs(alternatingRgbOffsetY(0, 1))).toBeGreaterThanOrEqual(
      INTRO_CUT_RGB_MIN_Y_MAGNITUDE
    );
    expect(Math.abs(alternatingRgbOffsetY(5, -1))).toBeGreaterThanOrEqual(
      INTRO_CUT_RGB_MIN_Y_MAGNITUDE
    );
  });

  test("respects a configured magnitude once it's already past the floor", () => {
    expect(alternatingRgbOffsetY(25, 1)).toBe(25);
    expect(alternatingRgbOffsetY(25, -1)).toBe(-25);
    expect(alternatingRgbOffsetY(-25, 1)).toBe(25);
  });
});
