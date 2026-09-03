export type WarpTextConfig = {
  lineHeight: number;
  warpStrength: number;
  warpScale: number;
  speed: number;
  pointerInfluence: number;
  pointerStrength: number;
  refraction: number;
  ripple: boolean;
};

export const DEFAULT_WARP_TEXT_CONFIG: WarpTextConfig = {
  lineHeight: 1,
  warpStrength: 0.18,
  warpScale: 2.5,
  speed: 0.55,
  pointerInfluence: 0.45,
  pointerStrength: 0.6,
  refraction: 0.05,
  ripple: true,
};

// One character's canvas TextMetrics, isolated: this component draws each
// character with its own fillText call rather than one string, so each is
// measured the same way it is actually rendered.
export type CharGlyphMetrics = {
  advance: number;
  boundingBoxLeft: number;
  boundingBoxRight: number;
  boundingBoxAscent: number;
  boundingBoxDescent: number;
};

export type CenteredRunLayout = {
  // Where to draw each character (textBaseline "alphabetic"), in the same
  // order as the metrics passed in.
  charX: number[];
  baselineY: number;
};

// Canvas has no built-in way to centre a run laid out character-by-character
// on its own combined ink bounds: textBaseline "middle" centres on the
// font's ascent/descent metrics, and a naive `hostWidth/2 - totalAdvance/2`
// start centres on the advance box. Both are the same class of mismatch
// already found and fixed on the sketch and ascii treatments -- a bold
// display face's side bearings are rarely equal left to right (or top to
// bottom), so centring on either proxy leaves the actual ink a few pixels
// off from the host's true centre. This is the "default" treatment every
// other treatment is meant to sit exactly on top of, so it gets the same
// fix: centre on the tight ink bounds of the whole run, not a proxy for it.
export function centeredRunLayout(
  charMetrics: CharGlyphMetrics[],
  letterSpacingPx: number,
  hostWidthPx: number,
  hostHeightPx: number
): CenteredRunLayout {
  if (charMetrics.length === 0) return { charX: [], baselineY: hostHeightPx / 2 };

  const rawX: number[] = [];
  let cursor = 0;
  let maxAscent = 0;
  let maxDescent = 0;
  charMetrics.forEach((metric, index) => {
    rawX.push(cursor);
    maxAscent = Math.max(maxAscent, metric.boundingBoxAscent);
    maxDescent = Math.max(maxDescent, metric.boundingBoxDescent);
    cursor += metric.advance + (index === charMetrics.length - 1 ? 0 : letterSpacingPx);
  });

  const first = charMetrics[0];
  const last = charMetrics[charMetrics.length - 1];
  const inkLeft = rawX[0] - first.boundingBoxLeft;
  const inkRight = rawX[rawX.length - 1] + last.boundingBoxRight;
  // Shifting so the ink interval's own midpoint lands on the host's midpoint,
  // not the run's start or its advance box.
  const shiftX = hostWidthPx / 2 - (inkLeft + inkRight) / 2;

  return {
    charX: rawX.map((x) => x + shiftX),
    baselineY: hostHeightPx / 2 + (maxAscent - maxDescent) / 2,
  };
}

// How long the scripted sweep runs when the warp treatment first appears.
export const WARP_DEMO_SWEEP_MS = 2200;
// How far either side of centre the simulated cursor travels, in uv.
const WARP_DEMO_REACH = 0.32;
// A restrained vertical excursion keeps the scripted pointer inside the word
// while making its path read as a sine curve instead of a ruler-straight pass.
const WARP_DEMO_VERTICAL_REACH = 0.18;
// How much of the sweep is eased. The remainder is linear, so the pointer is
// already moving on the first frame: a pure ease-in crept for the opening
// moments and the sweep looked like it started late.
const WARP_DEMO_EASE_SHARE = 0.8;

// A single pass from left to right across the headline, in the 0-1 uv space
// the shader's pointer uniform expects. The x travel eases in and out, fastest
// as it crosses the apex and slow at either edge; y
// traces one arc across that width -- level at both edges, highest over the
// middle of the word. A full sine cycle rose and fell twice, which read as a
// squiggle rather than a single sweep. Returns null once the sweep is done or
// was never asked for, so the real pointer takes over.
export function demoPointerAt(
  elapsedMs: number,
  durationMs: number
): { x: number; y: number } | null {
  if (!Number.isFinite(elapsedMs) || durationMs <= 0) return null;
  if (elapsedMs < 0 || elapsedMs >= durationMs) return null;

  const phase = elapsedMs / durationMs;
  // Cubic ease-in-out. Smoothstep was the same shape but peaked at only 1.5x
  // its average speed, too gentle to read as acceleration; this peaks at 3x,
  // so the pointer visibly gathers pace into the apex and settles out of it.
  const curve =
    phase < 0.5
      ? 4 * phase * phase * phase
      : 1 - Math.pow(2 - 2 * phase, 3) / 2;
  // Blended with a straight pass, which leaves the acceleration into the apex
  // intact while giving the sweep a speed to start from.
  const eased = curve * WARP_DEMO_EASE_SHARE + phase * (1 - WARP_DEMO_EASE_SHARE);
  return {
    x: 0.5 + (eased * 2 - 1) * WARP_DEMO_REACH,
    y: 0.5 + Math.sin(eased * Math.PI) * WARP_DEMO_VERTICAL_REACH,
  };
}

// How far from centre the circling demo pointer reaches, in the same 0-1 uv
// space -- deliberately tiny (a few pixels across the rendered headline, not
// a fraction of the word) per direct request for something "very subtle".
// Enough to prove the warp reacts to a pointer at all without touring the
// word.
const WARP_DEMO_CIRCLE_RADIUS_X = 0.015;
const WARP_DEMO_CIRCLE_RADIUS_Y = 0.01;

// A gentle circle held at the centre of the word, for a demo pass whose job
// is just to prove the warp reacts to a pointer at all -- unlike the sweep
// above, it doesn't need to cross the whole headline. The radius eases up
// from the centre and back down across the run (a sine envelope, 0 at both
// ends) rather than snapping onto the circle's edge on the first frame or
// stranding the pointer off to one side the moment the demo hands over.
export function demoCircleAt(
  elapsedMs: number,
  durationMs: number
): { x: number; y: number } | null {
  if (!Number.isFinite(elapsedMs) || durationMs <= 0) return null;
  if (elapsedMs < 0 || elapsedMs >= durationMs) return null;

  const phase = elapsedMs / durationMs;
  const angle = phase * Math.PI * 2;
  const radiusEnvelope = Math.sin(phase * Math.PI);
  return {
    x: 0.5 + Math.cos(angle) * WARP_DEMO_CIRCLE_RADIUS_X * radiusEnvelope,
    y: 0.5 + Math.sin(angle) * WARP_DEMO_CIRCLE_RADIUS_Y * radiusEnvelope,
  };
}
