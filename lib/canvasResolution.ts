// A 2x canvas contains four times as many pixels as a 1x canvas. This cap
// keeps text crisp on high-density screens without making the interactive
// renderers pay the full Retina allocation/readback cost.
export const INTERACTIVE_CANVAS_DPR_CAP = 1.5;

export function cappedCanvasDpr(devicePixelRatio: number): number {
  const safeRatio = Number.isFinite(devicePixelRatio)
    ? Math.max(1, devicePixelRatio)
    : 1;
  return Math.min(safeRatio, INTERACTIVE_CANVAS_DPR_CAP);
}
