import {
  ASCII_FALLBACK_PLANE_HEIGHT,
  ASCII_DEPTH_RAMP,
  ASCII_INK_BLUE,
  ASCII_INK_LIME,
  DEFAULT_ASCII_TEXT_CONFIG,
  chipForBrightness,
  planeHeightForFontSize,
  visibleWorldHeight,
} from "./asciiText";

test("every field has a default, so the config can be spread as props", () => {
  const keys = Object.keys(DEFAULT_ASCII_TEXT_CONFIG).sort();
  expect(keys).toEqual([
    "asciiFontSize",
    "enableWaves",
    "planeScale",
    "randomizeGlyphColors",
    "randomizeStageColor",
    "textFontSize",
    "tiltStrength",
  ]);
});

test("sizes are positive, or the three.js plane collapses", () => {
  expect(DEFAULT_ASCII_TEXT_CONFIG.asciiFontSize).toBeGreaterThan(0);
  expect(DEFAULT_ASCII_TEXT_CONFIG.textFontSize).toBeGreaterThan(0);
  expect(DEFAULT_ASCII_TEXT_CONFIG.planeScale).toBeGreaterThan(0);
});

test("the ascii grid is far finer than the text it samples", () => {
  expect(DEFAULT_ASCII_TEXT_CONFIG.asciiFontSize).toBeLessThan(
    DEFAULT_ASCII_TEXT_CONFIG.textFontSize
  );
});

describe("ascii colour scheme", () => {
  test("every chip inks in either blue or lime, nothing else", () => {
    for (const chip of ASCII_DEPTH_RAMP) {
      expect([ASCII_INK_BLUE, ASCII_INK_LIME]).toContain(chip.foreground);
    }
  });

  test("every container colour is valid hex and used once", () => {
    const backgrounds = ASCII_DEPTH_RAMP.map((c) => c.background);
    for (const background of backgrounds) {
      expect(background).toMatch(/^#[0-9A-Fa-f]{6}$/);
    }
    expect(new Set(backgrounds).size).toBe(backgrounds.length);
  });

  test("the lit face is blue on light grey", () => {
    const face = chipForBrightness(1);
    expect(face).toBe(ASCII_DEPTH_RAMP[0]);
    expect(face.background).toBe("#DDE0DD");
    expect(face.foreground).toBe(ASCII_INK_BLUE);
  });

  test("the darkest cells fall to the deepest shadow", () => {
    expect(chipForBrightness(0)).toBe(ASCII_DEPTH_RAMP[ASCII_DEPTH_RAMP.length - 1]);
  });

  test("colour follows the light: dimmer never means shallower", () => {
    // Colour has to describe one continuous surface, so stepping the light
    // down must only ever walk further into shadow.
    let previous = -1;
    for (let i = 0; i <= 100; i++) {
      const index = ASCII_DEPTH_RAMP.indexOf(chipForBrightness(1 - i / 100));
      expect(index).toBeGreaterThanOrEqual(previous);
      previous = index;
    }
  });

  test("blue holds the lit end and lime only the shadowed end", () => {
    const inks = ASCII_DEPTH_RAMP.map((c) => c.foreground);
    const lastBlue = inks.lastIndexOf(ASCII_INK_BLUE);
    const firstLime = inks.indexOf(ASCII_INK_LIME);
    expect(firstLime).toBeGreaterThan(lastBlue);
  });

  test("the face is blue, so blue carries the treatment", () => {
    expect(ASCII_DEPTH_RAMP[0].foreground).toBe(ASCII_INK_BLUE);
  });

  test("the stage no longer randomises, so it matches the reference", () => {
    expect(DEFAULT_ASCII_TEXT_CONFIG.randomizeStageColor).toBe(false);
  });
});

describe("matching the original font size", () => {
  // The headline container at a 1440 viewport: 320px tall, font at 230px.
  const at1440 = {
    textureCanvasHeightPx: 285,
    hostHeightPx: 320,
    targetFontSizePx: 230,
    textureFontSizePx: 340,
  };

  test("the camera's visible height follows its cone and distance", () => {
    expect(visibleWorldHeight(45, 30)).toBeCloseTo(24.853, 2);
    expect(visibleWorldHeight(45, 60)).toBeCloseTo(49.706, 2);
  });

  test("matching a 230px headline needs a bigger plane than the old default", () => {
    const height = planeHeightForFontSize(at1440);
    expect(height).toBeCloseTo(14.97, 1);
    // The old fixed 13 rendered the ascii noticeably smaller than the font.
    expect(height).toBeGreaterThan(ASCII_FALLBACK_PLANE_HEIGHT);
  });

  test("a larger headline needs a proportionally larger plane", () => {
    const single = planeHeightForFontSize(at1440);
    const doubled = planeHeightForFontSize({ ...at1440, targetFontSizePx: 460 });
    expect(doubled).toBeCloseTo(single * 2, 5);
  });

  test("a taller host needs a proportionally smaller plane", () => {
    const single = planeHeightForFontSize(at1440);
    const tall = planeHeightForFontSize({ ...at1440, hostHeightPx: 640 });
    expect(tall).toBeCloseTo(single / 2, 5);
  });

  test("falls back rather than dividing by zero before the host is measured", () => {
    expect(planeHeightForFontSize({ ...at1440, hostHeightPx: 0 })).toBe(
      ASCII_FALLBACK_PLANE_HEIGHT
    );
    expect(planeHeightForFontSize({ ...at1440, targetFontSizePx: 0 })).toBe(
      ASCII_FALLBACK_PLANE_HEIGHT
    );
  });

  test("the tilt is present but well short of the original swing", () => {
    // The old behaviour was 0.9 rad across the host.
    expect(DEFAULT_ASCII_TEXT_CONFIG.tiltStrength).toBeGreaterThan(0);
    expect(DEFAULT_ASCII_TEXT_CONFIG.tiltStrength).toBeLessThan(0.9 / 2);
  });
});

describe("sprinkling the edges", () => {
  test("the lit face ignores jitter entirely", () => {
    // A speckled front plane would read as noise, not as a surface.
    for (const jitter of [0, 0.25, 0.5, 0.75, 1]) {
      expect(chipForBrightness(1, jitter)).toBe(ASCII_DEPTH_RAMP[0]);
    }
  });

  test("edge cells scatter across neighbouring shadow colours", () => {
    const seen = new Set<string>();
    for (let i = 0; i <= 20; i++) {
      seen.add(chipForBrightness(0.5, i / 20).background);
    }
    expect(seen.size).toBeGreaterThan(1);
  });

  test("jitter never promotes an edge cell back onto the face", () => {
    for (let brightness = 0; brightness < 0.85; brightness += 0.05) {
      for (const jitter of [0, 0.5, 1]) {
        expect(chipForBrightness(brightness, jitter)).not.toBe(ASCII_DEPTH_RAMP[0]);
      }
    }
  });

  test("always lands on a real chip however extreme the inputs", () => {
    for (const brightness of [-1, 0, 0.5, 1, 2, NaN]) {
      for (const jitter of [-1, 0, 1, 2]) {
        expect(ASCII_DEPTH_RAMP).toContain(chipForBrightness(brightness, jitter));
      }
    }
  });
});
