export type StrokeTextTrigger = "mount" | "hover" | "scroll" | "loop";
export type StrokeTextFillMode = "fade" | "wipe" | "none";
export type StrokeTextSketchStyle = "clean" | "pencil" | "blueprint";

export type StrokeTextConfig = {
  strokeColor: string;
  fillColor: string;
  strokeWidth: number;
  drawDuration: number;
  fillDelay: number;
  stagger: number;
  ease: string;
  trigger: StrokeTextTrigger;
  fillMode: StrokeTextFillMode;
  sketchStyle: StrokeTextSketchStyle;
  fontSize: number;
  fontWeight: number;
  letterSpacing: number;
  reverse: boolean;
};

export const DEFAULT_STROKE_TEXT_CONFIG: StrokeTextConfig = {
  strokeColor: "#FFFFFF",
  fillColor: "#FFFFFF",
  strokeWidth: 2.6,
  drawDuration: 1.8,
  fillDelay: 0.2,
  stagger: 0.05,
  ease: "expo.out",
  trigger: "mount",
  fillMode: "fade",
  sketchStyle: "pencil",
  fontSize: 220,
  fontWeight: 900,
  letterSpacing: 0,
  reverse: false,
};

// Hand-drawn look without a drawing library: turbulence displaces the outline
// so it wanders like a drawn line, and a second, much finer noise eats into
// its alpha so the ink breaks up the way graphite does on paper.
export type SketchSpec = {
  // Outline wander.
  wobbleFrequency: number;
  wobbleOctaves: number;
  wobbleScale: number;
  // Ink break-up. 0 leaves the stroke solid.
  grainFrequency: number;
  grainStrength: number;
  // "hatch" fills with drawn strokes rather than flat colour, so a filled
  // letter reads as shaded in by hand.
  fillTexture: "solid" | "hatch";
  // Spacing between hatch lines, as a fraction of the text's height.
  hatchSpacing: number;
  // Set when the style has a canonical palette of its own.
  strokeColor?: string;
  fillColor?: string;
};

export const SKETCH_SPECS: Record<StrokeTextSketchStyle, SketchSpec> = {
  clean: {
    wobbleFrequency: 0,
    wobbleOctaves: 1,
    wobbleScale: 0,
    grainFrequency: 0,
    grainStrength: 0,
    fillTexture: "solid",
    hatchSpacing: 0.05,
  },
  pencil: {
    // Low frequency, so the line wanders over a long distance rather than
    // vibrating; the fine grain is what reads as graphite.
    wobbleFrequency: 0.022,
    wobbleOctaves: 3,
    wobbleScale: 2.6,
    grainFrequency: 0.9,
    grainStrength: 0.55,
    fillTexture: "hatch",
    hatchSpacing: 0.045,
    strokeColor: "#3B3A38",
    fillColor: "#6F6D69",
  },
  blueprint: {
    // Draughted, not sketched: a tighter wander and only a whisper of grain.
    wobbleFrequency: 0.014,
    wobbleOctaves: 2,
    wobbleScale: 1.4,
    grainFrequency: 0.75,
    grainStrength: 0.22,
    fillTexture: "hatch",
    hatchSpacing: 0.06,
    strokeColor: "#EAF3FF",
    fillColor: "#9FC4E8",
  },
};

export function getSketchSpec(style: StrokeTextSketchStyle): SketchSpec {
  return SKETCH_SPECS[style] ?? SKETCH_SPECS.clean;
}

// The style's own palette wins where it has one, so picking "blueprint" looks
// like a blueprint without also having to reset two colour pickers.
export function sketchColors(
  style: StrokeTextSketchStyle,
  strokeColor: string,
  fillColor: string
): { strokeColor: string; fillColor: string } {
  const spec = getSketchSpec(style);
  return {
    strokeColor: spec.strokeColor ?? strokeColor,
    fillColor: spec.fillColor ?? fillColor,
  };
}

// Blueprint needs its own ground; the others draw on whatever the stage is.
export const BLUEPRINT_GROUND = "#0B3D91";

// Seeds for the four boil frames. Re-seeding the same turbulence is what makes
// the drawn line redraw itself rather than slide around.
export const SKETCH_BOIL_SEEDS = [7, 13, 23, 31];

// ADRIAN is all caps, so the font's descender space is empty -- centring on the
// ascent/descent midpoint drops the letters lower than a treatment that centres
// the glyphs themselves. This returns the nudge that puts the measured ink back
// on the centre line, so tops align across treatments whatever the metrics are.
export function inkCentringOffset(
  box: { y: number; height: number } | null,
  centreY: number,
  liftPx = 0
): number {
  if (!box || !Number.isFinite(box.y) || !Number.isFinite(box.height)) return 0;
  return centreY - (box.y + box.height / 2) - liftPx;
}

// A touch above true centre, which is where the sketch reads best against the
// other treatments.
export const STROKE_INK_LIFT_PX = 12;
