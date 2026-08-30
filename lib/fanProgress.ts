export const FAN_THRESHOLD_PX = 450;
export const FAN_SPLIT = 0.45;
// Time constant for easing the stack toward the cursor.
export const FAN_SMOOTHING_MS = 90;

export type FanPhases = {
  fanProgress: number;
  sweepProgress: number;
};

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

export function computeCursorTravel(
  mouseY: number,
  viewportHeight: number,
  thresholdPx: number = FAN_THRESHOLD_PX
): number {
  const distanceFromBottom = viewportHeight - mouseY;
  return clamp01(1 - distanceFromBottom / thresholdPx);
}

export function computeScrollTravel(scrollY: number, scrollableHeight: number): number {
  if (scrollableHeight <= 0) return 0;
  return clamp01(scrollY / scrollableHeight);
}

// The cursor's descent does two jobs in sequence: it opens the fan, then it
// sweeps the emphasis peak down the stack. fanSplit is where the handover sits.
export function splitTravel(travel: number, fanSplit: number): FanPhases {
  const t = clamp01(travel);

  const fanProgress = fanSplit <= 0 ? 1 : clamp01(t / fanSplit);
  const sweepProgress = fanSplit >= 1 ? 0 : clamp01((t - fanSplit) / (1 - fanSplit));

  return { fanProgress, sweepProgress };
}
