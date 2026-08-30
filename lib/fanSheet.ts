export type FanMechanic = "bottom" | "corner";

// Sheets run far wider than the viewport on both sides, so a tilted sheet
// never shows its own side edge -- the sheet behind is revealed along the
// bottom only.
export const SHEET_OVERSCAN_PERCENT = 60;

export function sheetWidthPercent(rightInset: number): number {
  return 100 + 2 * SHEET_OVERSCAN_PERCENT - rightInset;
}

// Where the viewport's left edge falls inside the oversized sheet, as a
// percentage of the sheet's width. Doubles as the tilt pivot and as the inset
// that keeps sheet content within the visible viewport.
export function sheetViewportLeftPercent(rightInset: number): number {
  return (SHEET_OVERSCAN_PERCENT / sheetWidthPercent(rightInset)) * 100;
}

// Hermite ease. A triangular peak kinks at its tip and edges, which makes a
// sheet change speed abruptly as the sweep crosses it; easing both ends keeps
// the motion continuous.
function smoothstep(t: number): number {
  const x = Math.min(1, Math.max(0, t));
  return x * x * (3 - 2 * x);
}

export type FanSheetConfig = {
  mechanic: FanMechanic;
  // Visible band thickness per case-study sheet, indexed by depth - 1.
  // The hero has no band of its own; it lifts to expose the ones beneath it.
  bandPercents: number[];
  emphasisBonusPercent: number;
  emphasisFalloff: number;
  // How many sheets ahead of the emphasis peak the stack has opened. The
  // deeper sheets stay tucked away until the cursor travels down to them.
  revealLeadSheets: number;
  // Degrees of tilt added per sheet down the stack. The hero is the first
  // sheet, not a fixed backdrop, so it takes the first step like the rest.
  tiltStepDegrees: number;
  // Ceiling on the accumulated tilt. Without it the step compounds with depth
  // and the deepest sheets end up far more slanted than the top of the stack.
  maxTiltDegrees: number;
  brightnessFalloff: number;
};

export type SheetInset = {
  bottom: number;
  right: number;
  rotate: number;
  brightness: number;
  emphasis: number;
};

// A triangular peak that glides from the first case study to the last across
// the sweep. Depth 0 is the hero and never carries emphasis.
export function computeEmphasis(
  depth: number,
  sweepProgress: number,
  sheetCount: number,
  falloff: number
): number {
  if (depth < 1 || sheetCount < 1 || falloff <= 0) return 0;

  const peak = 1 + sweepProgress * (sheetCount - 1);
  return smoothstep(1 - Math.abs(depth - peak) / falloff);
}

// A wavefront that travels down the stack with the peak, opening each sheet's
// band as the cursor reaches it rather than dealing the whole stack out at
// once. Monotonic in sweepProgress, so a sheet never shuts again mid-gesture.
export function computeReveal(
  depth: number,
  sweepProgress: number,
  sheetCount: number,
  leadSheets: number
): number {
  if (depth < 1 || leadSheets <= 0) return 1;
  if (sheetCount < 1) return 0;

  const peak = 1 + sweepProgress * (sheetCount - 1);
  return smoothstep((peak + leadSheets - depth) / leadSheets);
}

export function computeBandThickness(
  depth: number,
  fanProgress: number,
  sweepProgress: number,
  config: FanSheetConfig,
  sheetCount: number
): number {
  const base = config.bandPercents[depth - 1] ?? 0;
  const emphasis = computeEmphasis(depth, sweepProgress, sheetCount, config.emphasisFalloff);
  const reveal = computeReveal(depth, sweepProgress, sheetCount, config.revealLeadSheets);

  return (base + emphasis * config.emphasisBonusPercent) * fanProgress * reveal;
}

export function computeSheetInset(
  depth: number,
  fanProgress: number,
  sweepProgress: number,
  config: FanSheetConfig,
  sheetCount: number
): SheetInset {
  // A sheet's bottom edge sits above the accumulated bands of everything
  // behind it, so widening one band pushes every sheet in front of it up.
  let inset = 0;
  for (let behind = depth + 1; behind <= sheetCount; behind++) {
    inset += computeBandThickness(behind, fanProgress, sweepProgress, config, sheetCount);
  }

  const emphasis = computeEmphasis(depth, sweepProgress, sheetCount, config.emphasisFalloff);
  const reveal = computeReveal(depth, sweepProgress, sheetCount, config.revealLeadSheets);

  const dimmed = 1 - depth * config.brightnessFalloff;
  const brightness = dimmed + (1 - dimmed) * emphasis;
  // Tilt is deliberately independent of emphasis. Folding the peak into the
  // angle rocks a sheet one way and back as the sweep crosses it; leaving it
  // out keeps the whole gesture a single, unreversing rotation.
  //
  // The backmost sheet is the fixed base the stack is dealt onto: it never
  // tilts and never moves, so it always covers the viewport squarely and no
  // gap can open behind the stack.
  //
  // Tilt rides the same reveal wavefront as the bands, so a sheet turns into
  // its fanned angle as it opens rather than the whole stack snapping to its
  // angles the moment the fan finishes. Both factors only ever grow with the
  // gesture, so the rotation still never reverses.
  const isBase = depth >= sheetCount;
  const rawTilt = config.tiltStepDegrees * (depth + 1) * fanProgress * reveal;
  const cap = Math.abs(config.maxTiltDegrees);
  const rotate = isBase ? 0 : Math.max(-cap, Math.min(cap, rawTilt));

  if (config.mechanic === "bottom") {
    return { bottom: inset, right: 0, rotate, brightness, emphasis };
  }

  return { bottom: inset / 2, right: inset / 2, rotate, brightness, emphasis };
}
