"use client";

import { useEffect, useRef, useState } from "react";
import type { CaseStudy } from "@/data/caseStudies";
import { SHEET_OVERSCAN_PERCENT } from "@/lib/fanSheet";

type PageIndicatorProps = {
  caseStudies: CaseStudy[];
  // Shares the scroll arrow's rule: gone by the time the stack is a quarter
  // open, so the rail never competes with the sheets it points at.
  fanProgress?: number;
  onSelect?: (caseStudy: CaseStudy) => void;
  // How many dots, from the top, have popped in. Defaults to all of them --
  // most callers want every page reachable immediately; the intro's own
  // reveal beat is what actually staggers this.
  revealedCount?: number;
};

const DOT_SIZE = 14;
const HOVER_TARGET_RIGHT_EXTENSION = 80;
// The dot's hover/focus-visible scale, applied regardless of whether the
// cursor is over the 14px dot itself or just somewhere in the wider hit
// area that reveals its chip.
const HOVER_DOT_SCALE = 1.5;
// Starting scale for a dot's own pop-in, before the intro's reveal beat
// reaches it.
const POP_IN_DOT_SCALE = 0.5;

export function PageIndicator({
  caseStudies,
  fanProgress = 0,
  onSelect,
  revealedCount = caseStudies.length,
}: PageIndicatorProps) {
  const [revealed, setRevealed] = useState<number | null>(null);
  const opacity = 1 - Math.min(1, fanProgress * 2);
  const interactive = opacity > 0;
  const rootRef = useRef<HTMLDivElement>(null);

  // Wheel input does not touch this rail at all -- it drives the stack's own
  // reveal instead (see useFanProgress), and mixing the two read as the wheel
  // doing two unrelated things at once. This rail only ever highlights by
  // hover or keyboard focus.

  // Enter selects whichever page is highlighted -- by hover or by keyboard
  // focus. A tabbed-to dot already gets this for free from its own <button>
  // (Enter dispatches a click, which bubbles to the hit area's onClick
  // below), so skip firing twice for that case.
  useEffect(() => {
    if (revealed === null) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Enter") return;
      const dots = rootRef.current?.querySelectorAll<HTMLButtonElement>(
        '[data-testid="page-indicator-dot"]'
      );
      if (dots?.[revealed] && document.activeElement === dots[revealed]) return;
      event.preventDefault();
      onSelect?.(caseStudies[revealed]);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [revealed, caseStudies, onSelect]);

  return (
    <div
      ref={rootRef}
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
      {caseStudies.map((caseStudy, index) => {
        const isRevealed = index < revealedCount;
        return (
        <div
          key={caseStudy.slug}
          data-testid="page-indicator-hit-area"
          data-revealed={isRevealed}
          className="relative flex items-center cursor-pointer"
          style={{
            width: DOT_SIZE + HOVER_TARGET_RIGHT_EXTENSION,
            // The pop-in itself lives on the dot below, not here: this hit
            // area is wide (it reaches right for the hover chip), so a
            // scale on it grows from that whole rectangle's centre --
            // pulling the dot, which sits at its left edge, sideways as it
            // grows, which read as sliding in from the right instead of
            // popping in place. Interaction is still gated here.
            pointerEvents: isRevealed ? undefined : "none",
          }}
          onPointerEnter={() => isRevealed && setRevealed(index)}
          onPointerLeave={() => setRevealed((current) => (current === index ? null : current))}
          // The dot's own click already bubbles here (a native <button>
          // dispatches click on Enter/Space too), so this is what actually
          // fires -- and it's what lets a click on the revealed chip, not
          // just the 14px dot, also select the page. Guarded on isRevealed
          // itself, not just the pointer-events style above: that style is
          // a real-browser affordance, but jsdom's fireEvent.click doesn't
          // honour it, and a script-dispatched click bypasses it too.
          onClick={() => isRevealed && onSelect?.(caseStudy)}
        >
          <button
            type="button"
            data-testid="page-indicator-dot"
            aria-label={caseStudy.title}
            onFocus={() => setRevealed(index)}
            onBlur={() => setRevealed((current) => (current === index ? null : current))}
            className="rounded-full cursor-pointer focus-visible:outline-none"
            style={{
              width: DOT_SIZE,
              height: DOT_SIZE,
              backgroundColor: caseStudy.thumbnailColor,
              opacity: isRevealed ? 1 : 0,
              // Combined into one scale rather than fighting over separate
              // transforms: the hover scale (driven by the same `revealed`
              // state as the chip, not CSS :hover/:focus-visible, which only
              // fire with the cursor directly over the dot, not the wider
              // hit area around it) and the intro's own pop-in scale can
              // both be in effect on the same dot.
              transform: `scale(${(revealed === index ? HOVER_DOT_SCALE : 1) * (isRevealed ? 1 : POP_IN_DOT_SCALE)})`,
              transition: "opacity 220ms ease-out, transform 200ms ease-out",
            }}
          />
          {revealed === index && (
            <span
              data-testid="page-indicator-chip"
              // Not pointer-events-none any more -- a click here should
              // select the page too -- but still aria-hidden: it duplicates
              // the button's own accessible name, and a div's onClick isn't
              // independently reachable by a screen reader anyway.
              aria-hidden="true"
              className="absolute top-1/2 -translate-y-1/2 whitespace-nowrap rounded-full px-4 py-1.5 text-base font-body font-bold"
              style={{
                left: DOT_SIZE + 12,
                backgroundColor: caseStudy.thumbnailColor,
                color: "#1C1C1C",
              }}
            >
              {caseStudy.title}
            </span>
          )}
        </div>
        );
      })}
    </div>
  );
}
