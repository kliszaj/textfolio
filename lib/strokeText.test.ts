import { DEFAULT_STROKE_TEXT_CONFIG, getSketchSpec, sketchColors } from "./strokeText";
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

  test("pencil wanders further and breaks up more than blueprint", () => {
    // A blueprint is draughted; a pencil sketch is not.
    expect(getSketchSpec("pencil").wobbleScale).toBeGreaterThan(
      getSketchSpec("blueprint").wobbleScale
    );
    expect(getSketchSpec("pencil").grainStrength).toBeGreaterThan(
      getSketchSpec("blueprint").grainStrength
    );
  });

  test("the grain is finer than the wander, or it reads as fuzz not graphite", () => {
    for (const style of ["pencil", "blueprint"] as const) {
      const spec = getSketchSpec(style);
      expect(spec.grainFrequency).toBeGreaterThan(spec.wobbleFrequency * 10);
    }
  });

  test("pencil and blueprint bring their own palettes", () => {
    for (const style of ["pencil", "blueprint"] as const) {
      const { strokeColor, fillColor } = sketchColors(style, "#123456", "#654321");
      expect(strokeColor).not.toBe("#123456");
      expect(fillColor).not.toBe("#654321");
      expect(strokeColor).toMatch(/^#[0-9A-Fa-f]{6}$/);
    }
  });

  test("clean leaves the configured colours alone", () => {
    expect(sketchColors("clean", "#123456", "#654321")).toEqual({
      strokeColor: "#123456",
      fillColor: "#654321",
    });
  });
});
