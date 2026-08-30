export type StrokeTextTrigger = "mount" | "hover" | "scroll" | "loop";
export type StrokeTextFillMode = "fade" | "wipe" | "hatch" | "none";
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
  drawDuration: 2.8,
  // The pencil shade begins while the later letter outlines are still
  // drawing, so the sketch reads as one uninterrupted hand movement.
  fillDelay: 0,
  stagger: 0.12,
  ease: "power1.inOut",
  trigger: "mount",
  fillMode: "hatch",
  sketchStyle: "pencil",
  fontSize: 220,
  fontWeight: 900,
  letterSpacing: 0,
  reverse: false,
};

// Shared across the blue-pencil lettering and its supporting copy. The
// correction marks deliberately remain red so they read as markup.
export const SKETCH_INK = "#0057FF";

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
    strokeColor: SKETCH_INK,
    fillColor: SKETCH_INK,
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

export const CORRECTION_INK = "#FF0000";
// Slow enough to actually watch the pen move.
export const CORRECTION_DRAW_MS = 820;
export const CORRECTION_CROSS_MS = 430;
// The X starts before the loop has quite closed, the way a hand would.
export const CORRECTION_CROSS_LEAD_MS = 580;
// And its second stroke follows its first.
export const CORRECTION_CROSS_DELAY_MS = 320;

export function letterSequenceSeconds(
  drawDurationSeconds: number,
  staggerSeconds: number,
  characterCount: number
): number {
  return Math.max(0, drawDurationSeconds) +
    Math.max(0, staggerSeconds) * Math.max(0, characterCount - 1);
}

// How long the whole correction takes from the moment the letters start
// drawing. The stage that holds it has to be longer than this, or the pen is
// still moving when the treatment hands over.
export function correctionSequenceMs(
  drawDurationSeconds: number,
  staggerSeconds = 0,
  characterCount = 1
): number {
  return (
    letterSequenceSeconds(drawDurationSeconds, staggerSeconds, characterCount) * 1000 +
    CORRECTION_CROSS_LEAD_MS +
    CORRECTION_CROSS_DELAY_MS +
    CORRECTION_CROSS_MS
  );
}
// Circle radius as a share of the glyph's longest side.
const LOOP_REACH = 0.36;
// Kept off the frame edge, so a mark never reads as clipped.
const LOOP_MARGIN = 4;
// The loop's radius wanders; the widest it ever draws is this much over
// nominal. Clamping the nominal radius alone let the wobble hang over the
// edge, which is exactly what looked clipped.
const LOOP_WOBBLE_MAX = 1.05;
const WOBBLE = [1, 1.045, 0.97, 1.03, 0.985, 1.01];

export type MarkBox = { x: number; y: number; width: number; height: number };
export type MarkBounds = { width: number; height: number };
export type CorrectionMarks = {
  loop: string;
  crossA: string;
  crossB: string;
  circle: { cx: number; cy: number; r: number };
};

function clamp(value: number, low: number, high: number): number {
  if (high < low) return (low + high) / 2;
  return Math.min(high, Math.max(low, value));
}

// A circle, not an ellipse -- a glyph is roughly square, and an ellipse round
// it read as a mistake rather than a mark. Four arcs with the radius wandering
// slightly, overshooting where it closes, because a circled correction never
// joins up cleanly. Then an X struck through the glyph itself.
//
// `bounds` is the frame the marks live in and `padding` is half the pen's
// width. Given both, every drawn pixel is kept inside the frame -- not just
// the nominal geometry.
export function correctionMarks(
  box: MarkBox,
  bounds?: MarkBounds,
  padding = 0,
  bleed = 0
): CorrectionMarks {
  let r = Math.max(box.width, box.height) * LOOP_REACH;
  let cx = box.x + box.width / 2;
  let cy = box.y + box.height / 2;

  if (bounds) {
    const room =
      Math.min(bounds.width, bounds.height) / 2 + bleed - padding - LOOP_MARGIN;
    r = Math.max(1, Math.min(r, room / LOOP_WOBBLE_MAX));
    const inset = r * LOOP_WOBBLE_MAX + padding + LOOP_MARGIN - bleed;
    cx = clamp(cx, inset, bounds.width - inset);
    cy = clamp(cy, inset, bounds.height - inset);
  }

  const START = -2.3;
  const SWEEP = Math.PI * 2 + 0.4;
  const SEGMENTS = 5;
  const step = SWEEP / SEGMENTS;
  const k = (4 / 3) * Math.tan(step / 4);

  const at = (angle: number, scale: number) => [
    cx + Math.cos(angle) * r * scale,
    cy + Math.sin(angle) * r * scale,
  ];

  const [sx, sy] = at(START, WOBBLE[0]);
  const parts = [`M ${sx} ${sy}`];
  for (let i = 0; i < SEGMENTS; i += 1) {
    const a0 = START + step * i;
    const a1 = a0 + step;
    const s0 = WOBBLE[i % WOBBLE.length];
    const s1 = WOBBLE[(i + 1) % WOBBLE.length];
    const [x0, y0] = at(a0, s0);
    const [x1, y1] = at(a1, s1);
    parts.push(
      `C ${x0 - Math.sin(a0) * r * s0 * k} ${y0 + Math.cos(a0) * r * s0 * k}` +
        ` ${x1 + Math.sin(a1) * r * s1 * k} ${y1 - Math.cos(a1) * r * s1 * k}` +
        ` ${x1} ${y1}`
    );
  }

  // The X is struck through the glyph, overshooting it a little the way a
  // crossing-out does, and held inside the frame like the loop.
  // Struck at 80% of its full reach, so it marks the letter without
  // swallowing it. Scaled about the glyph's centre rather than by trimming
  // the overshoot, so both axes shrink by the same amount.
  const CROSS_SCALE = 0.8;
  const midX = box.x + box.width / 2;
  const midY = box.y + box.height / 2;
  const halfX = ((box.width * 1.36) / 2) * CROSS_SCALE;
  const halfY = ((box.height * 1.2) / 2) * CROSS_SCALE;
  const limit = (value: number, high: number) =>
    bounds
      ? clamp(value, padding + LOOP_MARGIN - bleed, high - padding - LOOP_MARGIN + bleed)
      : value;

  const left = limit(midX - halfX, bounds?.width ?? 0);
  const right = limit(midX + halfX, bounds?.width ?? 0);
  const top = limit(midY - halfY, bounds?.height ?? 0);
  const bottom = limit(midY + halfY, bounds?.height ?? 0);
  const bow = Math.max(box.width, box.height) * 0.05;

  const crossA = `M ${left} ${top} Q ${(left + right) / 2 + bow} ${
    (top + bottom) / 2 - bow
  } ${right} ${bottom}`;
  const crossB = `M ${right} ${top} Q ${(left + right) / 2 - bow} ${
    (top + bottom) / 2 + bow
  } ${left} ${bottom}`;

  return { loop: parts.join(" "), crossA, crossB, circle: { cx, cy, r } };
}

// Mirrors a glyph about its own centre, so the N reads back to front while
// still occupying the space the correct letter would.
export function mirrorAboutBox(box: MarkBox): string {
  const centre = box.x + box.width / 2;
  return `translate(${centre * 2}, 0) scale(-1, 1)`;
}
