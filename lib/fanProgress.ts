export const FAN_THRESHOLD_PX = 450;
export const FAN_SPLIT = 0.45;
// Time constant for easing the stack toward the cursor.
export const FAN_SMOOTHING_MS = 90;
// Wheel distance that covers the whole gesture, so a scroll reveals the stack
// at much the same rate as walking the cursor down would.
export const FAN_WHEEL_RANGE_PX = 700;
// How far the pointer must travel after a scroll before it takes the gesture
// back. Without it, the smallest jog of the mouse would undo the scroll.
export const FAN_POINTER_TAKEOVER_PX = 12;

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

// Scroll is relative where the cursor is absolute, so a wheel event nudges the
// travel it already had rather than replacing it.
export function travelAfterWheel(
  travel: number,
  deltaY: number,
  rangePx: number = FAN_WHEEL_RANGE_PX
): number {
  if (!Number.isFinite(deltaY) || rangePx <= 0) return clamp01(travel);
  return clamp01(travel + deltaY / rangePx);
}
