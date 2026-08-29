export const FAN_THRESHOLD_PX = 250;

export function computeCursorFanProgress(
  mouseY: number,
  viewportHeight: number,
  thresholdPx: number = FAN_THRESHOLD_PX
): number {
  const distanceFromBottom = viewportHeight - mouseY;
  const raw = 1 - distanceFromBottom / thresholdPx;
  return Math.min(1, Math.max(0, raw));
}

export function computeScrollFanProgress(scrollY: number, scrollableHeight: number): number {
  if (scrollableHeight <= 0) return 0;
  const raw = scrollY / scrollableHeight;
  return Math.min(1, Math.max(0, raw));
}
