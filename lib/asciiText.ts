export type ASCIITextConfig = {
  enableWaves: boolean;
  asciiFontSize: number;
  textFontSize: number;
  // Multiplier on the plane size that matches the original font. 1 is a match.
  planeScale: number;
  // Depth of the extruded body behind the letters, as a fraction of the font
  // size. The body shades from near-white just behind the face down to black
  // at the back, which is what gives the depth ramp its full range to colour.
  extrudeDepth: number;
  // How far the plane leans toward the cursor, in radians across the full
  // width of the host. 0 holds it flat.
  tiltStrength: number;
  // Barrel distortion in the CRT source pass. 0 is flat; 1 is the full CRT
  // curve, before the text is sampled into ASCII cells.
  crtCurvature: number;
  randomizeGlyphColors: boolean;
  randomizeStageColor: boolean;
};

// Glyph colours. The swatches pair a container (the cell behind a glyph) with
// the ink drawn on it: blue on the light containers, lime on the saturated and
// dark ones. Blue carries the treatment; lime is a rare accent, so the blue
// chips are weighted far heavier.
export const ASCII_INK_BLUE = "#3A1AF0";
export const ASCII_INK_LIME = "#C6F03F";

export type AsciiColorChip = {
  foreground: string;
  background: string;
};

// Ordered face-first, then down through the edges into shadow. The lit front
// plane of a letter is blue on light grey; everything darker is an extruded
// edge or a shadow, so the colour carries the 3D form instead of scattering
// across it. Blue naturally dominates because most of a glyph is face, and
// lime only turns up in the deep shadow.
export const ASCII_DEPTH_RAMP: AsciiColorChip[] = [
  { background: "#DDE0DD", foreground: ASCII_INK_BLUE }, // face
  { background: "#2DF58C", foreground: ASCII_INK_BLUE }, // catching the light
  { background: "#FF3D1A", foreground: ASCII_INK_BLUE }, // turning away
  { background: "#7683AC", foreground: ASCII_INK_LIME }, // edge
  { background: "#D2007E", foreground: ASCII_INK_LIME }, // edge in shadow
  { background: "#6B2244", foreground: ASCII_INK_LIME }, // shadow
  { background: "#1E5334", foreground: ASCII_INK_LIME }, // deepest
];

// How many ramp steps an edge cell may be nudged by its jitter, so the shadow
// colours scatter along the edges instead of banding into clean stripes.
export const ASCII_EDGE_SPRINKLE = 1.6;

// Brightest cells take the face; darker cells step down the ramp. `jitter`
// (0-1, stable per cell) only ever scatters cells that already left the face,
// so the lit front plane stays a solid blue-on-grey.
export function chipForBrightness(brightness: number, jitter = 0.5): AsciiColorChip {
  // A non-finite sample means we learned nothing about the light, so treat it
  // as unlit rather than letting NaN fall through the arithmetic.
  const clamp01 = (value: number, fallback: number) =>
    Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : fallback;

  const lit = clamp01(brightness, 0);
  const depth = (1 - lit) * ASCII_DEPTH_RAMP.length;
  const last = ASCII_DEPTH_RAMP.length - 1;

  if (depth < 1) return ASCII_DEPTH_RAMP[0];

  const scatter = (clamp01(jitter, 0.5) - 0.5) * 2 * ASCII_EDGE_SPRINKLE;
  const index = Math.min(last, Math.max(1, Math.round(depth + scatter)));
  return ASCII_DEPTH_RAMP[index];
}

// The plane's own half-width works out to roughly 32 world units -- wider
// than the camera used to sit from it (30). Rotating a plane that size on a
// camera that close is severe keystoning in disguise: at the tilt's own
// design maximum, one edge sits at depth ~25 and the other ~35, a ~38%
// difference in how large each edge projects. That read as the whole word
// shrinking and drifting, not leaning, whenever the cursor (or the intro's
// demo sweep) left it rotated. Moving the camera much farther away and
// narrowing the FOV to match keeps visibleWorldHeight() -- and therefore
// every on-screen size this file computes -- exactly where it was, while
// making the plane's edges close to equidistant from the camera regardless
// of rotation, so a lean stays a lean instead of a resize.
const LEGACY_ASCII_CAMERA_FOV_DEG = 45;
const LEGACY_ASCII_CAMERA_DISTANCE = 30;
export const ASCII_CAMERA_DISTANCE = LEGACY_ASCII_CAMERA_DISTANCE * 10;
export const ASCII_CAMERA_FOV_DEG =
  (2 *
    Math.atan(
      (Math.tan((LEGACY_ASCII_CAMERA_FOV_DEG * Math.PI) / 360) * LEGACY_ASCII_CAMERA_DISTANCE) /
        ASCII_CAMERA_DISTANCE
    ) *
    180) /
  Math.PI;
// Keep the cell grid legible on narrow phones without letting the configured
// desktop size turn into oversized blocks. The reference width is the shared
// headline frame at a 1280px desktop viewport.
export const ASCII_REFERENCE_HOST_WIDTH = 1100;
export const ASCII_MIN_FONT_SIZE = 6;

export function asciiFontSizeForHost(
  configuredFontSize: number,
  hostWidth: number,
  referenceWidth: number = ASCII_REFERENCE_HOST_WIDTH,
): number {
  if (!Number.isFinite(configuredFontSize) || configuredFontSize <= 0) {
    return ASCII_MIN_FONT_SIZE;
  }
  if (
    !Number.isFinite(hostWidth) ||
    hostWidth <= 0 ||
    !Number.isFinite(referenceWidth) ||
    referenceWidth <= 0
  ) {
    return configuredFontSize;
  }
  return Math.max(
    ASCII_MIN_FONT_SIZE,
    configuredFontSize * Math.min(1, hostWidth / referenceWidth),
  );
}

// Used only if the host cannot be measured yet.
export const ASCII_FALLBACK_PLANE_HEIGHT = 13;
// The share of the frame's width the word may occupy.
export const ASCII_MAX_WIDTH_SHARE = 0.98;
// The vertical lean is slightly shallower than the horizontal one, which is
// what stops the tilt reading as a wobble.
export const ASCII_TILT_Y_RATIO = 0.78;

// World height visible at the plane, given the camera's cone and distance.
export function visibleWorldHeight(
  fovDeg: number = ASCII_CAMERA_FOV_DEG,
  distance: number = ASCII_CAMERA_DISTANCE
): number {
  return 2 * Math.tan((fovDeg * Math.PI) / 360) * distance;
}

// The plane height that renders the texture at exactly the size the original
// font would occupy on screen.
//
// The texture canvas maps onto the plane, and the host's pixel height maps onto
// the camera's visible world height. Setting the two scales equal and solving
// for the plane height cancels the text's own height out entirely -- only the
// canvas height, the font sizes and the host height matter.
export function planeHeightForFontSize({
  textureCanvasWidthPx = 0,
  textureCanvasHeightPx,
  hostWidthPx = 0,
  hostHeightPx,
  targetFontSizePx,
  textureFontSizePx,
}: {
  textureCanvasWidthPx?: number;
  textureCanvasHeightPx: number;
  hostWidthPx?: number;
  hostHeightPx: number;
  targetFontSizePx: number;
  textureFontSizePx: number;
}): number {
  // The frame deliberately does not clip, so a plane wider than the frame does
  // not get cut off -- it runs off both edges of the screen. On a phone the
  // headline is a third of its desktop size while the word keeps its
  // proportions, so this is the binding constraint, not the font match.
  const fitFrame = (height: number) => {
    if (textureCanvasWidthPx <= 0 || textureCanvasHeightPx <= 0 || hostWidthPx <= 0) {
      return height;
    }
    const aspect = textureCanvasWidthPx / textureCanvasHeightPx;
    const perWorldUnit = hostHeightPx / visibleWorldHeight();
    const widest = (hostWidthPx * ASCII_MAX_WIDTH_SHARE) / (aspect * perWorldUnit);
    return Math.min(height, widest);
  };

  if (hostHeightPx <= 0 || textureFontSizePx <= 0 || targetFontSizePx <= 0) {
    // Last resort only. A fixed world height ignores the viewport entirely,
    // which is precisely how the ascii stopped tracking the headline on small
    // screens, so even this is held inside the frame.
    return fitFrame(ASCII_FALLBACK_PLANE_HEIGHT);
  }

  return fitFrame(
    (textureCanvasHeightPx * visibleWorldHeight() * targetFontSizePx) /
      (hostHeightPx * textureFontSizePx)
  );
}

export const DEFAULT_ASCII_TEXT_CONFIG: ASCIITextConfig = {
  enableWaves: false,
  asciiFontSize: 11,
  textFontSize: 340,
  planeScale: 1,
  // Keep the depth as a quiet edge rather than a stack of noisy offset glyphs.
  extrudeDepth: 0.06,
  tiltStrength: 0.3,
  crtCurvature: 0.32,
  randomizeGlyphColors: true,
  randomizeStageColor: false,
};

// How long the scripted tilt sweep runs when the treatment first appears.
export const ASCII_DEMO_TILT_MS = 2200;
// The sweep leans one way only and stops short of what hovering could reach,
// so it reads as a settle rather than a demonstration.
const DEMO_TILT_REACH = 0.42;

// One gentle lean in a single direction: level at the start, eased up to its
// peak angle partway through, then eased back to level by the end -- never
// crossing to the other side, so it never reads as two separate moves.
// This used to hold at the peak rather than ease back, relying on the
// handover fade to hide the plane disappearing mid-lean. That stopped being
// safe once a handover could be a hard cut with no fade at all
// (HEADLINE_HANDOVER_MS can be 0): a hard cut caught the plane still at its
// peak lean, and a perspective camera reads a tilted plane as shifted and
// shrunk, not just angled -- "sitting a bit low and to the right" rather than
// "leaning". Returns null once the sweep is done or was never asked for, so
// the caller leaves the real pointer target alone.
export function demoTiltAt(
  elapsedMs: number,
  durationMs: number,
  tiltStrength: number
): number | null {
  if (!Number.isFinite(elapsedMs) || durationMs <= 0) return null;
  if (elapsedMs < 0 || elapsedMs >= durationMs) return null;

  const phase = elapsedMs / durationMs;
  const envelope = Math.sin(phase * Math.PI);
  return envelope * tiltStrength * DEMO_TILT_REACH;
}

// Layers used to build the extruded body. Enough that the shading reads as a
// solid side rather than a stack of copies.
export const ASCII_EXTRUDE_LAYERS = 22;
// The body runs down and to the right of the face.
export const ASCII_EXTRUDE_RISE = 0.62;

// Grey for one layer of the extruded body: black at the back, close to the
// white face at the front.
export function extrudeLayerShade(layer: number, layers: number): number {
  if (layers <= 0) return 0;
  const depth = Math.min(1, Math.max(0, layer / layers));
  return Math.round(255 * (1 - depth) * 0.9);
}

export type TextTextureLayout = {
  canvasWidth: number;
  canvasHeight: number;
  // Where the face's own baseline origin lands on the canvas.
  baseX: number;
  baseY: number;
};

// A centred, unrotated plane centres its whole texture canvas on screen --
// not just the face drawn on it. The extruded body only ever trails
// down-and-right from the face, so sizing the canvas with a flat margin plus
// just that trailing reach leaves more empty canvas on the right and bottom
// than the left and top. That asymmetry is what put the ASCII word visibly
// left of, and above, the same headline rendered by the other treatments.
// Matching the margin on every side keeps the face itself centred instead.
//
// Horizontally this centres on the ink's own tight bounds (inkLeftPx +
// inkRightPx from canvas's actualBoundingBoxLeft/Right), not the advance
// width `measureText` reports as `width` -- the same distinction that
// mattered for the sketch treatment's vertical centring (see
// inkCentringOffset in strokeText.ts). A bold display face's side bearings
// are rarely equal left to right, so centring on the wider advance box left
// the tighter ink sitting a few pixels off from where the sum of symmetric
// margins put it. Vertically this was already ink-tight via
// actualBoundingBoxAscent/Descent, which is why only the horizontal side
// needed the same fix.
export function textTextureLayout({
  inkLeftPx,
  inkRightPx,
  ascentPx,
  descentPx,
  extrudeXPx,
  extrudeYPx,
  edgeMarginPx = 20,
}: {
  inkLeftPx: number;
  inkRightPx: number;
  ascentPx: number;
  descentPx: number;
  extrudeXPx: number;
  extrudeYPx: number;
  edgeMarginPx?: number;
}): TextTextureLayout {
  const marginX = edgeMarginPx + Math.max(0, extrudeXPx);
  const marginY = edgeMarginPx + Math.max(0, extrudeYPx);
  return {
    canvasWidth: Math.ceil(inkLeftPx + inkRightPx + marginX * 2),
    canvasHeight: Math.ceil(ascentPx + descentPx + marginY * 2),
    baseX: marginX + inkLeftPx,
    baseY: marginY + ascentPx,
  };
}

// Share of the ascii stage spent typing the word in. The rain lands with time
// to spare rather than still filling in as the stage hands over, which reads
// as quick and deliberate instead of laboured.
export const ASCII_TYPE_SHARE = 0.65;
// How long a cell shows junk before settling on its real character.
const TYPE_CHURN = 0.16;
export const ASCII_TYPE_JUNK = "01<>[]{}/\|=+*#%@$&";

export type AsciiCellState = "hidden" | "churning" | "settled";

// Share of the type-in spent staggering when each column starts. The rest is
// the time a column takes to run from its top row to its bottom one.
export const ASCII_TYPE_COLUMN_SPREAD = 0.45;

// Matrix rain rather than a wipe or a scatter: every column streams downward,
// and columns start at staggered moments so the word fills raggedly rather
// than as one front. A cell shows junk for a beat before settling.
//
// `columnHash` is a stable 0-1 value for the column (not the cell), and
// `rowFraction` is how far down the grid the cell sits.
export function asciiCellStateAt(
  columnHash: number,
  rowFraction: number,
  progress: number
): AsciiCellState {
  if (!Number.isFinite(progress) || progress >= 1) return "settled";
  if (!Number.isFinite(columnHash) || !Number.isFinite(rowFraction)) return "settled";

  const column = Math.min(1, Math.max(0, columnHash));
  const row = Math.min(1, Math.max(0, rowFraction));
  // Squeezed so the very last cell still has its full churn window inside the
  // type-in. Without this it arrived exactly at the end and popped.
  const arrival =
    (column * ASCII_TYPE_COLUMN_SPREAD + row * (1 - ASCII_TYPE_COLUMN_SPREAD)) *
    (1 - TYPE_CHURN);

  const t = Math.min(1, Math.max(0, progress));
  if (t < arrival) return "hidden";
  if (t < arrival + TYPE_CHURN) return "churning";
  return "settled";
}

// A junk glyph for a churning cell, chosen from the same stable hash so it
// does not reshuffle every frame.
export function asciiJunkGlyph(hash: number, tick: number): string {
  const index = Math.abs(Math.floor(hash * 977 + tick)) % ASCII_TYPE_JUNK.length;
  return ASCII_TYPE_JUNK[index];
}
