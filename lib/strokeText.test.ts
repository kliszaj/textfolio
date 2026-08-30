import {
  CORRECTION_CROSS_DELAY_MS,
  CORRECTION_DRAW_MS,
  CORRECTION_INK,
  DEFAULT_STROKE_TEXT_CONFIG,
  SKETCH_BOIL_SEEDS,
  correctionMarks,
  getSketchSpec,
  inkCentringOffset,
  mirrorAboutBox,
  sketchColors,
} from "./strokeText";
import type { StrokeTextFillMode, StrokeTextTrigger } from "./strokeText";

const TRIGGERS: StrokeTextTrigger[] = ["mount", "hover", "scroll", "loop"];
const FILL_MODES: StrokeTextFillMode[] = ["fade", "wipe", "none"];

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

test("the fill lands after the stroke has started drawing", () => {
  expect(DEFAULT_STROKE_TEXT_CONFIG.fillDelay).toBeGreaterThanOrEqual(0);
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
    expect(strokeColor).not.toBe("#123456");
    expect(fillColor).not.toBe("#654321");
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

  test("the mark is a circle, not an ellipse", () => {
    // A glyph is roughly square; an ellipse round it read as a mistake.
    const { circle } = correctionMarks(box);
    expect(circle.r).toBeGreaterThan(0);
    expect(circle.cx).toBeCloseTo(box.x + box.width / 2);
    expect(circle.cy).toBeCloseTo(box.y + box.height / 2);
  });

  test("the circle encloses the glyph", () => {
    const { circle } = correctionMarks(box);
    expect(circle.r).toBeGreaterThan(Math.max(box.width, box.height) / 2);
  });

  test("it is pulled inside the frame rather than running off the edge", () => {
    // A glyph hard against the right edge is where the mark looked clipped.
    const edge = { x: 380, y: 40, width: 60, height: 80 };
    const { circle } = correctionMarks(edge, bounds);
    expect(circle.cx - circle.r).toBeGreaterThanOrEqual(0);
    expect(circle.cx + circle.r).toBeLessThanOrEqual(bounds.width);
    expect(circle.cy - circle.r).toBeGreaterThanOrEqual(0);
    expect(circle.cy + circle.r).toBeLessThanOrEqual(bounds.height);
  });

  test("a frame smaller than the mark shrinks it rather than overflowing", () => {
    const { circle } = correctionMarks(box, { width: 40, height: 40 });
    expect(circle.r).toBeLessThanOrEqual(20);
    expect(circle.r).toBeGreaterThan(0);
  });

  test("without a frame it sits on the glyph, unclamped", () => {
    const { circle } = correctionMarks(box);
    expect(circle.cx).toBe(box.x + box.width / 2);
  });

  test("the loop does not close cleanly, the way a real one does not", () => {
    const { loop } = correctionMarks(box);
    const start = loop.match(/^M (-?\d+\.?\d*) (-?\d+\.?\d*)/)!.slice(1).map(Number);
    const end = loop.trim().split(" ").slice(-2).map(Number);
    expect(Math.hypot(end[0] - start[0], end[1] - start[1])).toBeGreaterThan(0);
  });

  test("the X is struck through the glyph, not floating beside it", () => {
    const { crossA, crossB } = correctionMarks(box);
    for (const stroke of [crossA, crossB]) {
      const nums = stroke.match(/-?\d+\.?\d*/g)!.map(Number);
      const xs = nums.filter((_: number, i: number) => i % 2 === 0);
      const ys = nums.filter((_: number, i: number) => i % 2 === 1);
      expect(Math.min(...xs)).toBeLessThanOrEqual(box.x);
      expect(Math.max(...xs)).toBeGreaterThanOrEqual(box.x + box.width);
      expect(Math.min(...ys)).toBeLessThanOrEqual(box.y);
      expect(Math.max(...ys)).toBeGreaterThanOrEqual(box.y + box.height);
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
    // The wobble draws wider than the nominal radius, and the pen is drawn
    // centred on the path -- both have to be inside, not just the geometry.
    const pen = 8;
    const edge = { x: 380, y: 250, width: 60, height: 80 };
    const { circle, loop, crossA, crossB } = correctionMarks(edge, bounds, pen / 2);
    expect(circle.cx + circle.r * 1.05 + pen / 2).toBeLessThanOrEqual(bounds.width);
    expect(circle.cy + circle.r * 1.05 + pen / 2).toBeLessThanOrEqual(bounds.height);
    for (const d of [loop, crossA, crossB]) {
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
