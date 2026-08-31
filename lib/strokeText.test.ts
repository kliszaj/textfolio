import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  CORRECTION_LETTER_DELAY_MS,
  CORRECTION_CROSS_DELAY_MS,
  CORRECTION_CROSS_MS,
  CORRECTION_LETTER_VIEWBOX,
  correctionSequenceMs,
  boxMoved,
  CORRECTION_DRAW_MS,
  CORRECTION_INK,
  DEFAULT_STROKE_TEXT_CONFIG,
  SKETCH_INK,
  SKETCH_BOIL_SEEDS,
  correctionMarks,
  getSketchSpec,
  inkCentringOffset,
  mirrorAboutBox,
  sketchColors,
} from "./strokeText";
import type { StrokeTextFillMode, StrokeTextTrigger } from "./strokeText";

const TRIGGERS: StrokeTextTrigger[] = ["mount", "hover", "scroll", "loop"];
const FILL_MODES: StrokeTextFillMode[] = ["fade", "wipe", "hatch", "none"];

test("the default trigger and fill mode are ones the component handles", () => {
  expect(TRIGGERS).toContain(DEFAULT_STROKE_TEXT_CONFIG.trigger);
  expect(FILL_MODES).toContain(DEFAULT_STROKE_TEXT_CONFIG.fillMode);
});

test("colours are valid hex, since they go straight into svg attributes", () => {
  expect(DEFAULT_STROKE_TEXT_CONFIG.strokeColor).toMatch(/^#[0-9A-Fa-f]{6}$/);
  expect(DEFAULT_STROKE_TEXT_CONFIG.fillColor).toMatch(/^#[0-9A-Fa-f]{6}$/);
});

test("the draw actually takes time and the stroke is visible", () => {
  expect(DEFAULT_STROKE_TEXT_CONFIG.drawDuration).toBeGreaterThan(0);
  expect(DEFAULT_STROKE_TEXT_CONFIG.strokeWidth).toBeGreaterThan(0);
});

test("the fill follows the outlines after a short beat", () => {
  expect(DEFAULT_STROKE_TEXT_CONFIG.fillDelay).toBeGreaterThan(0);
  // Starts while the outlines are still drawing, so the hatching is a head
  // start rather than a second, late phase.
  expect(DEFAULT_STROKE_TEXT_CONFIG.fillDelay).toBeLessThan(
    DEFAULT_STROKE_TEXT_CONFIG.drawDuration
  );
});

test("names a gsap easing function", () => {
  expect(DEFAULT_STROKE_TEXT_CONFIG.ease).toMatch(/^[a-z0-9]+(\.[a-z]+)?$/i);
});

describe("sketch styles", () => {
  test("defaults to pencil, the look that was asked for", () => {
    expect(DEFAULT_STROKE_TEXT_CONFIG.sketchStyle).toBe("pencil");
  });

  test("clean is genuinely clean: no wander, no grain", () => {
    const spec = getSketchSpec("clean");
    expect(spec.wobbleScale).toBe(0);
    expect(spec.grainFrequency).toBe(0);
  });

  
  test("pencil brings its own palette", () => {
    const { strokeColor, fillColor } = sketchColors("pencil", "#123456", "#654321");
    expect(strokeColor).toBe(SKETCH_INK);
    expect(fillColor).toBe(SKETCH_INK);
    expect(strokeColor).toMatch(/^#[0-9A-Fa-f]{6}$/);
  });

  test("pencil wanders and breaks up; clean does neither", () => {
    expect(getSketchSpec("pencil").wobbleScale).toBeGreaterThan(getSketchSpec("clean").wobbleScale);
    expect(getSketchSpec("pencil").grainStrength).toBeGreaterThan(getSketchSpec("clean").grainStrength);
  });

  test("the grain is finer than the wander, or it reads as fuzz not graphite", () => {
    for (const style of ["pencil"] as const) {
      const spec = getSketchSpec(style);
      expect(spec.grainFrequency).toBeGreaterThan(spec.wobbleFrequency * 10);
    }
  });

  
  test("clean leaves the configured colours alone", () => {
    expect(sketchColors("clean", "#123456", "#654321")).toEqual({
      strokeColor: "#123456",
      fillColor: "#654321",
    });
  });
});

describe("pencil fill and boil", () => {
  test("pencil shades its fill with drawn strokes, not flat colour", () => {
    expect(getSketchSpec("pencil").fillTexture).toBe("hatch");
    expect(DEFAULT_STROKE_TEXT_CONFIG.fillMode).toBe("hatch");
  });

  test("clean stays a flat fill", () => {
    expect(getSketchSpec("clean").fillTexture).toBe("solid");
  });

  test("hatch spacing is a fraction of the text height, so it scales with it", () => {
    for (const style of ["pencil"] as const) {
      const spacing = getSketchSpec(style).hatchSpacing;
      expect(spacing).toBeGreaterThan(0);
      expect(spacing).toBeLessThan(0.2);
    }
  });

  test("there is one seed per boil frame, and all distinct", () => {
    // Re-seeding is what redraws the line; a repeated seed would stall it.
    expect(SKETCH_BOIL_SEEDS.length).toBeGreaterThan(1);
    expect(new Set(SKETCH_BOIL_SEEDS).size).toBe(SKETCH_BOIL_SEEDS.length);
  });
});

describe("centring the ink", () => {
  test("lifts text whose measured ink sits below the centre line", () => {
    // Ink centred at 120 in a box whose centre is 100: pull it up by 20.
    expect(inkCentringOffset({ y: 100, height: 40 }, 100)).toBe(-20);
  });

  test("drops text whose ink sits above the centre line", () => {
    expect(inkCentringOffset({ y: 40, height: 40 }, 100)).toBe(40);
  });

  test("leaves already-centred ink alone", () => {
    expect(inkCentringOffset({ y: 80, height: 40 }, 100)).toBe(0);
  });

  test("does nothing before the ink has been measured", () => {
    expect(inkCentringOffset(null, 100)).toBe(0);
  });

  test("ignores unmeasurable boxes rather than shifting by NaN", () => {
    expect(inkCentringOffset({ y: NaN, height: 40 }, 100)).toBe(0);
    expect(inkCentringOffset({ y: 10, height: NaN }, 100)).toBe(0);
  });
});

describe("correction marks", () => {
  const box = { x: 100, y: 50, width: 60, height: 80 };
  const bounds = { width: 400, height: 300 };

  test("the X is centred on the glyph and struck across most of it", () => {
    const { crossA, crossB } = correctionMarks(box);
    for (const stroke of [crossA, crossB]) {
      const nums = stroke.match(/-?\d+\.?\d*/g)!.map(Number);
      const xs = nums.filter((_: number, i: number) => i % 2 === 0);
      const ys = nums.filter((_: number, i: number) => i % 2 === 1);
      const spanX = Math.max(...xs) - Math.min(...xs);
      const spanY = Math.max(...ys) - Math.min(...ys);
      expect(spanX).toBeGreaterThan(box.width * 0.8);
      expect(spanY).toBeGreaterThan(box.height * 0.8);
      // Centred, so it marks the letter rather than sitting off to one side.
      expect((Math.min(...xs) + Math.max(...xs)) / 2).toBeCloseTo(box.x + box.width / 2, 1);
      expect((Math.min(...ys) + Math.max(...ys)) / 2).toBeCloseTo(box.y + box.height / 2, 1);
    }
  });

  test("the two strokes cross rather than running together", () => {
    const { crossA, crossB } = correctionMarks(box);
    expect(crossA).not.toBe(crossB);
    // One starts top-left, the other top-right.
    const startX = (d: string) => Number(d.match(/^M (-?\d+\.?\d*)/)![1]);
    expect(startX(crossA)).toBeLessThan(startX(crossB));
  });

  test("every drawn pixel stays inside the frame, pen width included", () => {
    // The pen is drawn centred on the path, so the geometry alone being
    // inside the frame is not enough.
    const pen = 8;
    const edge = { x: 380, y: 250, width: 60, height: 80 };
    const { crossA, crossB, letter } = correctionMarks(edge, bounds, pen / 2);
    expect(letter.y).toBeGreaterThanOrEqual(0);
    expect(letter.y + letter.height).toBeLessThanOrEqual(bounds.height);
    for (const d of [crossA, crossB]) {
      const nums = d.match(/-?\d+\.?\d*/g)!.map(Number);
      const xs = nums.filter((_: number, i: number) => i % 2 === 0);
      const ys = nums.filter((_: number, i: number) => i % 2 === 1);
      expect(Math.min(...xs)).toBeGreaterThanOrEqual(0);
      expect(Math.max(...xs)).toBeLessThanOrEqual(bounds.width);
      expect(Math.min(...ys)).toBeGreaterThanOrEqual(0);
      expect(Math.max(...ys)).toBeLessThanOrEqual(bounds.height);
    }
  });

  test("mirroring flips about the glyph's own centre, holding its place", () => {
    const transform = mirrorAboutBox(box);
    const shift = Number(transform.match(/translate\((-?\d+\.?\d*)/)![1]);
    expect(shift - box.x).toBe(box.x + box.width);
    expect(shift - (box.x + box.width)).toBe(box.x);
  });

  test("the pen is pure red and the marks take a moment to draw", () => {
    expect(CORRECTION_INK).toBe("#FF0000");
    expect(CORRECTION_DRAW_MS).toBeGreaterThan(0);
    expect(CORRECTION_CROSS_DELAY_MS).toBeGreaterThan(0);
  });
});

describe("one blue for the whole sketch treatment", () => {
  test("the cool-S asset is inked in SKETCH_INK", () => {
    // The svg is served through next/image, so it cannot inherit currentColor
    // or a CSS variable -- its fill is a literal. This is what stops it
    // drifting away from the lettering, tagline and arrow.
    const svg = readFileSync(
      join(process.cwd(), "public", "assets", "cool-s.svg"),
      "utf8"
    );
    const fills = [...svg.matchAll(/fill="(#[0-9A-Fa-f]{6})"/g)].map((m) => m[1]);
    expect(fills.length).toBeGreaterThan(0);
    for (const fill of fills) {
      expect(fill.toUpperCase()).toBe(SKETCH_INK.toUpperCase());
    }
  });

  test("the sketch letters use it for both outline and shading", () => {
    const { strokeColor, fillColor } = sketchColors("pencil", "#123456", "#654321");
    expect(strokeColor).toBe(SKETCH_INK);
    expect(fillColor).toBe(SKETCH_INK);
  });

  test("it is a darker blue than the old cobalt", () => {
    const luminance = (hex: string) =>
      [1, 3, 5].reduce((sum, i) => sum + parseInt(hex.slice(i, i + 2), 16), 0);
    expect(luminance(SKETCH_INK)).toBeLessThan(luminance("#0057FF"));
  });
});

describe("boxMoved", () => {
  const box = { x: 10, y: 20, width: 300, height: 80 };

  test("treats a first measurement as a move", () => {
    expect(boxMoved(null, box)).toBe(true);
  });

  test("ignores sub-pixel jitter, so measuring on every frame is free", () => {
    expect(boxMoved(box, { ...box, x: 10.2, width: 300.3 })).toBe(false);
  });

  test("notices the box growing taller", () => {
    // The old guard compared x, y and width only. A face landing after the
    // fallback changes the height too, and missing it left the hatching and
    // the correction mark drawn to the fallback's metrics.
    expect(boxMoved(box, { ...box, height: 96 })).toBe(true);
  });

  test("notices a shift in either direction", () => {
    expect(boxMoved(box, { ...box, x: 24 })).toBe(true);
    expect(boxMoved(box, { ...box, y: 34 })).toBe(true);
    expect(boxMoved(box, { ...box, width: 360 })).toBe(true);
  });
});

describe("the correction is an X, then a hand-written N", () => {
  const box = { x: 100, y: 40, width: 60, height: 80 };

  test("no longer circles the glyph", () => {
    const marks = correctionMarks(box);
    // The loop read as ringing the letter rather than correcting it.
    expect("loop" in marks).toBe(false);
    expect("circle" in marks).toBe(false);
    expect(marks.crossA).toMatch(/^M /);
    expect(marks.crossB).toMatch(/^M /);
  });

  test("writes the replacement letter above the glyph it corrects", () => {
    const { letter } = correctionMarks(box);
    expect(letter.d).toMatch(/^M/);
    // Sits clear of the glyph's top edge, the way a hand writes above a
    // crossing-out.
    expect(letter.y + letter.height).toBeLessThanOrEqual(box.y);
  });

  test("centres the letter on the glyph", () => {
    const { letter } = correctionMarks(box);
    expect(letter.x + letter.width / 2).toBeCloseTo(box.x + box.width / 2, 5);
  });

  test("keeps the letter's proportions", () => {
    const { letter } = correctionMarks(box);
    expect(letter.width / letter.height).toBeCloseTo(
      CORRECTION_LETTER_VIEWBOX.width / CORRECTION_LETTER_VIEWBOX.height,
      5
    );
  });

  test("scales the letter with the glyph it corrects", () => {
    const small = correctionMarks(box).letter;
    const large = correctionMarks({ ...box, height: 160 }).letter;
    expect(large.height).toBeCloseTo(small.height * 2, 5);
  });

  test("holds the letter inside the frame when it would ride off the top", () => {
    const highUp = { x: 100, y: 4, width: 60, height: 80 };
    const { letter } = correctionMarks(highUp, { width: 600, height: 200 }, 2, 0);
    expect(letter.y).toBeGreaterThanOrEqual(0);
  });

  test("thins the pen by the same amount it scales the letter", () => {
    // The path is drawn under a transform, so its own stroke width has to be
    // divided back out or the mark would be far heavier than the X.
    const { letter } = correctionMarks(box);
    const scale = letter.height / CORRECTION_LETTER_VIEWBOX.height;
    expect(letter.transform).toContain(`scale(${scale}`);
  });
});

test("the correction sequence leaves room for the letter after the X", () => {
  const withLetter = correctionSequenceMs(1, 0, 1);
  expect(withLetter).toBeGreaterThan(
    1000 + CORRECTION_CROSS_DELAY_MS + CORRECTION_CROSS_MS
  );
});

test("writes the N straight after the X, and quickly", () => {
  // It should read as one continuous correction, not two separate marks.
  expect(CORRECTION_LETTER_DELAY_MS).toBeLessThan(CORRECTION_CROSS_MS / 2);
  expect(CORRECTION_DRAW_MS).toBeLessThan(CORRECTION_CROSS_MS * 1.5);
});

test("strikes the X across the glyph without swallowing it", () => {
  const box = { x: 100, y: 50, width: 60, height: 80 };
  const { crossA } = correctionMarks(box);
  const nums = crossA.match(/-?\d+\.?\d*/g)!.map(Number);
  const xs = nums.filter((_: number, i: number) => i % 2 === 0);
  const spanX = Math.max(...xs) - Math.min(...xs);
  // Overshoots the glyph the way a crossing-out does, but not by much.
  expect(spanX).toBeGreaterThan(box.width * 0.8);
  expect(spanX).toBeLessThan(box.width * 1.1);
});
