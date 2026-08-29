"use client";

import type { ReactNode } from "react";
import { computeSheetInset } from "@/lib/fanSheet";
import type { FanSheetConfig } from "@/lib/fanSheet";

type PaperSheetProps = {
  depth: number;
  fanProgress: number;
  config: FanSheetConfig;
  transitionMs: number;
  zIndex: number;
  children: ReactNode;
};

export function PaperSheet({
  depth,
  fanProgress,
  config,
  transitionMs,
  zIndex,
  children,
}: PaperSheetProps) {
  const { bottom, right, brightness } = computeSheetInset(depth, fanProgress, config);

  return (
    <div
      data-testid={`paper-sheet-${depth}`}
      className="absolute top-0 left-0 overflow-hidden"
      style={{
        bottom: `${bottom}%`,
        right: `${right}%`,
        zIndex,
        filter: `brightness(${brightness})`,
        transition: `bottom ${transitionMs}ms cubic-bezier(0.22, 1, 0.36, 1), right ${transitionMs}ms cubic-bezier(0.22, 1, 0.36, 1), filter ${transitionMs}ms ease`,
      }}
    >
      {children}
    </div>
  );
}
