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

export const ASCII_CAMERA_FOV_DEG = 45;
export const ASCII_CAMERA_DISTANCE = 30;
// Used only if the host cannot be measured yet.
export const ASCII_FALLBACK_PLANE_HEIGHT = 13;
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
  textureCanvasHeightPx,
  hostHeightPx,
  targetFontSizePx,
  textureFontSizePx,
}: {
  textureCanvasHeightPx: number;
  hostHeightPx: number;
  targetFontSizePx: number;
  textureFontSizePx: number;
}): number {
  if (hostHeightPx <= 0 || textureFontSizePx <= 0 || targetFontSizePx <= 0) {
    return ASCII_FALLBACK_PLANE_HEIGHT;
  }
  return (
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
// A real cursor crossing the whole host spans half the tilt strength. The
// sweep aims a little past that to offset what the lerp eats, but not so far
// that it leans harder than hovering ever could -- which read as hurried.
const DEMO_TILT_REACH = 0.6;

// A single pass from left to right, eased at both ends so it starts and stops
// like a hand rather than a slide. Returns null once the sweep is done or was
// never asked for, so the caller leaves the real pointer target alone.
export function demoTiltAt(
  elapsedMs: number,
  durationMs: number,
  tiltStrength: number
): number | null {
  if (!Number.isFinite(elapsedMs) || durationMs <= 0) return null;
  if (elapsedMs < 0 || elapsedMs >= durationMs) return null;

  const phase = elapsedMs / durationMs;
  const eased = phase * phase * (3 - 2 * phase);
  return (eased * 2 - 1) * tiltStrength * DEMO_TILT_REACH;
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
