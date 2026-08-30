"use client";

import { useState } from "react";
import type { CaseStudy } from "@/data/caseStudies";
import { SHEET_OVERSCAN_PERCENT } from "@/lib/fanSheet";

type PageIndicatorProps = {
  caseStudies: CaseStudy[];
  // Shares the scroll arrow's rule: gone by the time the stack is a quarter
  // open, so the rail never competes with the sheets it points at.
  fanProgress?: number;
  onSelect?: (caseStudy: CaseStudy) => void;
};

const DOT_SIZE = 11;

export function PageIndicator({ caseStudies, fanProgress = 0, onSelect }: PageIndicatorProps) {
  const [revealed, setRevealed] = useState<number | null>(null);
  const opacity = 1 - Math.min(1, fanProgress * 2);
  const interactive = opacity > 0;

  return (
    <div
      data-testid="page-indicator"
      aria-label="Portfolio pages"
      className="absolute top-1/2 -translate-y-1/2 z-20 hidden lg:flex flex-col gap-4"
      style={{
        // Hero sits on a sheet that starts at left: -60%, so an inset measured
        // from the hero's own edge lands off-screen. Counter the overscan the
        // way .coolS does, but from the constant rather than a literal 60vw.
        left: `calc(${SHEET_OVERSCAN_PERCENT}vw + clamp(1.5rem, 3.5vw, 4rem))`,
        opacity,
        // Fades on the same curve the sheets move on, so the rail leaves as
        // the stack arrives rather than lagging behind it.
        transition: "opacity 320ms ease-out",
        pointerEvents: interactive ? "auto" : "none",
      }}
    >
      {caseStudies.map((caseStudy, index) => (
        <div key={caseStudy.slug} className="relative flex items-center">
          <button
            type="button"
            data-testid="page-indicator-dot"
            aria-label={caseStudy.title}
            onPointerEnter={() => setRevealed(index)}
            onPointerLeave={() => setRevealed((current) => (current === index ? null : current))}
            onFocus={() => setRevealed(index)}
            onBlur={() => setRevealed((current) => (current === index ? null : current))}
            onClick={() => onSelect?.(caseStudy)}
            className="rounded-full cursor-pointer transition-transform duration-200 ease-out hover:scale-150 focus-visible:scale-150 focus-visible:outline-none"
            style={{
              width: DOT_SIZE,
              height: DOT_SIZE,
              backgroundColor: caseStudy.thumbnailColor,
            }}
          />
          {revealed === index && (
            <span
              data-testid="page-indicator-chip"
              aria-hidden="true"
              className="absolute left-full ml-3 whitespace-nowrap rounded-full px-3 py-1 text-sm font-body font-bold"
              style={{ backgroundColor: caseStudy.thumbnailColor, color: "#1C1C1C" }}
            >
              {caseStudy.title}
            </span>
          )}
        </div>
      ))}
    </div>
  );
}
