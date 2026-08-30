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
export const WARP_DEMO_SWEEP_MS = 1500;
// How far either side of centre the simulated cursor travels, in uv.
const WARP_DEMO_REACH = 0.32;

// One left-right pass across the headline, in the 0-1 uv space the shader's
// pointer uniform expects. Returns null once the sweep is done or was never
// asked for, so the caller lets the real pointer take over.
export function demoPointerAt(
  elapsedMs: number,
  durationMs: number
): { x: number; y: number } | null {
  if (!Number.isFinite(elapsedMs) || durationMs <= 0) return null;
  if (elapsedMs < 0 || elapsedMs >= durationMs) return null;

  const phase = elapsedMs / durationMs;
  return { x: 0.5 + Math.sin(phase * Math.PI * 2) * WARP_DEMO_REACH, y: 0.5 };
}
