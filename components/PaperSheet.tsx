"use client";

import type { ReactNode } from "react";
import {
  SHEET_OVERSCAN_PERCENT,
  computeSheetInset,
  sheetViewportLeftPercent,
} from "@/lib/fanSheet";

// Each sheet drops a shadow onto the one behind it, so the fanned bands read
// as separate pieces of paper rather than flat colour blocks.
const SHEET_SHADOW = "0 10px 30px rgba(0, 0, 0, 0.28)";
const SHEET_CORNER_RADIUS_PX = 16;
import type { FanSheetConfig } from "@/lib/fanSheet";

type PaperSheetProps = {
  depth: number;
  fanProgress: number;
  sweepProgress: number;
  sheetCount: number;
  config: FanSheetConfig;
  transitionMs: number;
  zIndex: number;
  children: ReactNode;
};

export function PaperSheet({
  depth,
  fanProgress,
  sweepProgress,
  sheetCount,
  config,
  transitionMs,
  zIndex,
  children,
}: PaperSheetProps) {
  const inset = computeSheetInset(depth, fanProgress, sweepProgress, config, sheetCount);
  const pivotXPercent = sheetViewportLeftPercent(inset.right);

  return (
    <div
      data-testid={`paper-sheet-${depth}`}
      className="absolute top-0 overflow-hidden"
      style={{
        bottom: `${inset.bottom}%`,
        left: `-${SHEET_OVERSCAN_PERCENT}%`,
        right: `${inset.right - SHEET_OVERSCAN_PERCENT}%`,
        zIndex,
        filter: `brightness(${inset.brightness})`,
        transform: `rotate(${inset.rotate}deg)`,
        // Pivoting at a corner keeps the whole sheet swinging up and to the
        // left in one direction. A centre pivot would drop one half as the
        // other rose, which reads as a see-saw.
        transformOrigin: `${pivotXPercent}% 100%`,
        boxShadow: SHEET_SHADOW,
        borderRadius: `${SHEET_CORNER_RADIUS_PX}px`,
        transition: `bottom ${transitionMs}ms linear, right ${transitionMs}ms linear, transform ${transitionMs}ms linear, filter ${transitionMs}ms linear`,
      }}
    >
      {children}
    </div>
  );
}
