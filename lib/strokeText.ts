export type StrokeTextTrigger = "mount" | "hover" | "scroll" | "loop";
export type StrokeTextFillMode = "fade" | "wipe" | "none";
export type StrokeTextSketchStyle = "clean" | "pencil";

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
  fillDelay: 0,
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
};

export function getSketchSpec(style: StrokeTextSketchStyle): SketchSpec {
  return SKETCH_SPECS[style] ?? SKETCH_SPECS.clean;
}

// The style's own palette wins where it has one, so picking a style looks
// right without also having to reset two colour pickers.
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

// --- Correction marks ------------------------------------------------------
// The sketch stage shows the name mid-correction: the final N drawn back to
// front, then marked up in red the way you would on paper.

export const CORRECTION_INK = "#E03A2F";
export const CORRECTION_DRAW_MS = 620;

export type MarkBox = { x: number; y: number; width: number; height: number };

// A loop drawn round a glyph. Two arcs rather than an ellipse, and overshooting
// where it closes, because a circled correction never joins up cleanly.
export function correctionLoopPath(box: MarkBox, slack = 0.28): string {
  const padX = box.width * slack;
  const padY = box.height * slack * 0.7;
  const left = box.x - padX;
  const right = box.x + box.width + padX;
  const top = box.y - padY;
  const bottom = box.y + box.height + padY;
  const cx = (left + right) / 2;
  const cy = (top + bottom) / 2;
  const rx = (right - left) / 2;
  const ry = (bottom - top) / 2;

  // Start low-left, sweep all the way round, then overshoot past the start.
  const startX = cx - rx * 0.72;
  const startY = cy + ry * 0.78;
  const overshootX = cx - rx * 0.2;
  const overshootY = cy + ry * 1.04;

  return [
    `M ${startX} ${startY}`,
    `C ${cx - rx * 1.25} ${cy + ry * 0.35} ${cx - rx * 1.1} ${cy - ry * 0.95} ${cx} ${cy - ry}`,
    `C ${cx + rx * 1.15} ${cy - ry * 0.95} ${cx + rx * 1.22} ${cy + ry * 0.5} ${cx + rx * 0.5} ${cy + ry * 0.95}`,
    `C ${cx + rx * 0.15} ${cy + ry * 1.15} ${cx - rx * 0.1} ${cy + ry * 1.12} ${overshootX} ${overshootY}`,
  ].join(" ");
}

// A short arrow pointing in at the loop from below-right, with its head.
export function correctionArrowPath(box: MarkBox): string {
  const tipX = box.x + box.width * 0.82;
  const tipY = box.y + box.height * 1.32;
  const tailX = tipX + box.width * 1.15;
  const tailY = tipY + box.height * 0.72;
  const headBack = box.width * 0.3;

  return [
    `M ${tailX} ${tailY}`,
    `Q ${tipX + headBack * 1.6} ${tipY + headBack * 1.1} ${tipX} ${tipY}`,
    `M ${tipX} ${tipY}`,
    `l ${headBack * 1.15} ${headBack * 0.15}`,
    `M ${tipX} ${tipY}`,
    `l ${headBack * 0.2} ${headBack * 1.1}`,
  ].join(" ");
}

// Mirrors a glyph about its own centre, so the N reads back to front while
// still occupying the space the correct letter would.
export function mirrorAboutBox(box: MarkBox): string {
  const centre = box.x + box.width / 2;
  return `translate(${centre * 2}, 0) scale(-1, 1)`;
}
