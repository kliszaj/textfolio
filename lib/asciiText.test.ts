import {
  ASCII_COLOR_CHIPS,
  ASCII_INK_BLUE,
  ASCII_INK_LIME,
  DEFAULT_ASCII_TEXT_CONFIG,
  pickAsciiChip,
} from "./asciiText";

test("every field has a default, so the config can be spread as props", () => {
  const keys = Object.keys(DEFAULT_ASCII_TEXT_CONFIG).sort();
  expect(keys).toEqual([
    "asciiFontSize",
    "enableWaves",
    "planeBaseHeight",
    "randomizeGlyphColors",
    "randomizeStageColor",
    "textFontSize",
  ]);
});

test("sizes are positive, or the three.js plane collapses", () => {
  expect(DEFAULT_ASCII_TEXT_CONFIG.asciiFontSize).toBeGreaterThan(0);
  expect(DEFAULT_ASCII_TEXT_CONFIG.textFontSize).toBeGreaterThan(0);
  expect(DEFAULT_ASCII_TEXT_CONFIG.planeBaseHeight).toBeGreaterThan(0);
});

test("the ascii grid is far finer than the text it samples", () => {
  expect(DEFAULT_ASCII_TEXT_CONFIG.asciiFontSize).toBeLessThan(
    DEFAULT_ASCII_TEXT_CONFIG.textFontSize
  );
});

describe("ascii colour scheme", () => {
  test("every chip inks in either blue or lime, nothing else", () => {
    for (const chip of ASCII_COLOR_CHIPS) {
      expect([ASCII_INK_BLUE, ASCII_INK_LIME]).toContain(chip.foreground);
    }
  });

  test("every container colour is valid hex", () => {
    for (const chip of ASCII_COLOR_CHIPS) {
      expect(chip.background).toMatch(/^#[0-9A-Fa-f]{6}$/);
    }
  });

  test("lime is a rare accent, not a co-lead", () => {
    const samples = 2000;
    let lime = 0;
    for (let i = 0; i < samples; i++) {
      if (pickAsciiChip(i / samples).foreground === ASCII_INK_LIME) lime++;
    }
    const share = lime / samples;
    expect(share).toBeGreaterThan(0);
    expect(share).toBeLessThan(0.12);
  });

  test("picking is total across the whole 0-1 range", () => {
    for (const t of [0, 0.25, 0.5, 0.75, 0.999999, 1, -1, 2]) {
      expect(ASCII_COLOR_CHIPS).toContain(pickAsciiChip(t));
    }
  });

  test("the stage no longer randomises, so it matches the reference", () => {
    expect(DEFAULT_ASCII_TEXT_CONFIG.randomizeStageColor).toBe(false);
  });
});
