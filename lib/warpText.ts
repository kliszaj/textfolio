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
