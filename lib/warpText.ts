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

// How long the scripted sweep runs when the warp treatment first appears.
export const WARP_DEMO_SWEEP_MS = 2200;
// How far either side of centre the simulated cursor travels, in uv.
const WARP_DEMO_REACH = 0.32;
// A restrained vertical excursion keeps the scripted pointer inside the word
// while making its path read as a sine curve instead of a ruler-straight pass.
const WARP_DEMO_VERTICAL_REACH = 0.18;

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
  const eased =
    phase < 0.5
      ? 4 * phase * phase * phase
      : 1 - Math.pow(2 - 2 * phase, 3) / 2;
  return {
    x: 0.5 + (eased * 2 - 1) * WARP_DEMO_REACH,
    y: 0.5 + Math.sin(eased * Math.PI) * WARP_DEMO_VERTICAL_REACH,
  };
}
