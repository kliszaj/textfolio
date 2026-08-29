"use client";

import type { ReactNode } from "react";
import { computeFocusedInset, computeSheetInset } from "@/lib/fanSheet";
import type { FanSheetConfig } from "@/lib/fanSheet";

type PaperSheetProps = {
  depth: number;
  fanProgress: number;
  config: FanSheetConfig;
  transitionMs: number;
  zIndex: number;
  focused?: boolean;
  focusedZIndex?: number;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
  children: ReactNode;
};

export function PaperSheet({
  depth,
  fanProgress,
  config,
  transitionMs,
  zIndex,
  focused = false,
  focusedZIndex,
  onMouseEnter,
  onMouseLeave,
  children,
}: PaperSheetProps) {
  const inset = focused
    ? computeFocusedInset(config)
    : computeSheetInset(depth, fanProgress, config);
  const effectiveZIndex = focused && focusedZIndex !== undefined ? focusedZIndex : zIndex;

  return (
    <div
      data-testid={`paper-sheet-${depth}`}
      className="absolute top-0 left-0 overflow-hidden"
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      style={{
        bottom: `${inset.bottom}%`,
        right: `${inset.right}%`,
        zIndex: effectiveZIndex,
        filter: `brightness(${inset.brightness})`,
        transform: `rotate(${inset.rotate}deg)`,
        transformOrigin: "bottom center",
        transition: `bottom ${transitionMs}ms cubic-bezier(0.22, 1, 0.36, 1), right ${transitionMs}ms cubic-bezier(0.22, 1, 0.36, 1), transform ${transitionMs}ms cubic-bezier(0.22, 1, 0.36, 1), filter ${transitionMs}ms ease`,
      }}
    >
      {children}
    </div>
  );
}
