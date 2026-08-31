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
  drawDuration: 0.92,
  // Give the letter strokes a short head start before the pencil shade joins
  // them, so the two actions read as one motion without starting together.
  fillDelay: 0.8,
  stagger: 0.025,
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
// Every blue on the sketch treatment comes from here -- the lettering, the
// tagline, the arrow, and the cool-S mark. A test pins the svg asset to it.
export const SKETCH_INK = "#0040C0";

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
// How long the written letter takes. Brisk: it follows straight on from the
// X, and the two together should read as one correction rather than two marks.
export const CORRECTION_DRAW_MS = 420;
export const CORRECTION_CROSS_MS = 360;
// The X's second stroke follows its first.
export const CORRECTION_CROSS_DELAY_MS = 260;
// Barely a pause between striking the glyph out and writing the letter in.
export const CORRECTION_LETTER_DELAY_MS = 40;

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
    // The X, then the letter written in above it.
    CORRECTION_CROSS_DELAY_MS +
    CORRECTION_CROSS_MS +
    CORRECTION_LETTER_DELAY_MS +
    CORRECTION_DRAW_MS
  );
}
// A hand-drawn N, traced once and reused: a single open stroke, so it draws
// itself in with the same pathLength trick as the X.
export const CORRECTION_LETTER_PATH =
  "M1.50037 67.6465C2.56999 46.4885 3.38273 30.412 3.92026 22.0112C4.19954 17.6464 4.88236 14.2745 5.45943 11.7872C6.81218 5.95656 11.8552 24.5971 15.107 30.4748C18.7846 37.1219 20.5779 41.6959 22.5593 45.4476C24.8032 49.6963 27.5468 52.7705 28.5965 54.5296C29.0164 55.3544 29.2073 56.041 29.7665 47.2788C30.3257 38.5166 31.2474 20.2847 32.1971 1.50037";
export const CORRECTION_LETTER_VIEWBOX = { width: 34, height: 70 };
// The pen width the letter was traced at, in its own viewBox units.
const CORRECTION_LETTER_PEN = 3;
// The written letter reads as an annotation, so it sits smaller than the glyph
// it replaces.
const CORRECTION_LETTER_HEIGHT_SHARE = 0.52;
// Air between the top of the crossed-out glyph and the letter above it.
const CORRECTION_LETTER_GAP_SHARE = 0.16;
// Kept off the frame edge, so a mark never reads as clipped.
const MARK_MARGIN = 4;

export type MarkBox = { x: number; y: number; width: number; height: number };
export type MarkBounds = { width: number; height: number };
export type CorrectionLetter = {
  d: string;
  // Where the letter lands in the svg's own user space, so callers can reason
  // about it without unpicking the transform.
  x: number;
  y: number;
  width: number;
  height: number;
  transform: string;
  // The path is drawn under a scaling transform, so its own pen has to be
  // divided back out or the letter would be far heavier than the X.
  strokeWidth: number;
};

export type CorrectionMarks = {
  crossA: string;
  crossB: string;
  letter: CorrectionLetter;
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
  // The X is struck through the glyph, overshooting it a little the way a
  // crossing-out does, and held inside the frame like the loop.
  // Struck at 80% of its full reach, so it marks the letter without
  // swallowing it. Scaled about the glyph's centre rather than by trimming
  // the overshoot, so both axes shrink by the same amount.
  const CROSS_SCALE = 0.7;
  const midX = box.x + box.width / 2;
  const midY = box.y + box.height / 2;
  const halfX = ((box.width * 1.36) / 2) * CROSS_SCALE;
  const halfY = ((box.height * 1.2) / 2) * CROSS_SCALE;
  const limit = (value: number, high: number) =>
    bounds
      ? clamp(value, padding + MARK_MARGIN - bleed, high - padding - MARK_MARGIN + bleed)
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

  // The replacement letter, written above the crossing-out the way a hand
  // corrects a word: small, centred on the glyph it replaces, and clear of it.
  const letterHeight = box.height * CORRECTION_LETTER_HEIGHT_SHARE;
  const scale = letterHeight / CORRECTION_LETTER_VIEWBOX.height;
  const letterWidth = CORRECTION_LETTER_VIEWBOX.width * scale;
  const letterX = box.x + box.width / 2 - letterWidth / 2;
  let letterY = box.y - box.height * CORRECTION_LETTER_GAP_SHARE - letterHeight;

  if (bounds) {
    // The frame does not clip, so this is about the mark reading as part of
    // the page rather than about being cut off.
    const top = padding + MARK_MARGIN - bleed;
    letterY = clamp(letterY, top, Math.max(top, bounds.height - letterHeight));
  }

  return {
    crossA,
    crossB,
    letter: {
      d: CORRECTION_LETTER_PATH,
      x: letterX,
      y: letterY,
      width: letterWidth,
      height: letterHeight,
      transform: `translate(${letterX}, ${letterY}) scale(${scale})`,
      strokeWidth: CORRECTION_LETTER_PEN,
    },
  };
}

// Mirrors a glyph about its own centre, so the N reads back to front while
// still occupying the space the correct letter would.
export function mirrorAboutBox(box: MarkBox): string {
  const centre = box.x + box.width / 2;
  return `translate(${centre * 2}, 0) scale(-1, 1)`;
}

export type MeasuredBox = { x: number; y: number; width: number; height: number };

// Whether a fresh measurement is worth committing. Compares every edge: the
// old guard watched x, y and width only, so a face landing after the fallback
// -- which changes the height too -- was taken for no change at all, and the
// hatching and correction mark stayed drawn to the fallback's metrics.
export function boxMoved(
  previous: MeasuredBox | null | undefined,
  next: MeasuredBox,
  tolerancePx: number = 0.5
): boolean {
  if (!previous) return true;
  return (
    Math.abs(previous.x - next.x) >= tolerancePx ||
    Math.abs(previous.y - next.y) >= tolerancePx ||
    Math.abs(previous.width - next.width) >= tolerancePx ||
    Math.abs(previous.height - next.height) >= tolerancePx
  );
}
