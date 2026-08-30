"use client";

import { useEffect, useRef } from "react";
import { getFocusVariant } from "@/lib/focusVariants";
import type { CaseStudy } from "@/data/caseStudies";

export type FocusOrigin = {
  xPercent: number;
  yPercent: number;
};

type CaseStudyFocusProps = {
  caseStudy: CaseStudy;
  variantId: string;
  origin: FocusOrigin;
  // Prototype harness: renders a Close button and closes on Escape.
  onClose?: () => void;
  // Real navigation: fires once the enter animation has finished, so the route
  // change lands exactly as the sheet finishes opening.
  onEntered?: () => void;
};

export function CaseStudyFocus({
  caseStudy,
  variantId,
  origin,
  onClose,
  onEntered,
}: CaseStudyFocusProps) {
  const variant = getFocusVariant(variantId);
  const enteredRef = useRef(false);

  useEffect(() => {
    if (!onClose) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [onClose]);

  // animationend is the accurate signal, but it never fires when the visitor
  // has asked for reduced motion (the animation is switched off) -- so back it
  // with a timer, and skip the wait entirely in that case.
  useEffect(() => {
    if (!onEntered) return;

    const settle = () => {
      if (enteredRef.current) return;
      enteredRef.current = true;
      onEntered();
    };

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const timer = window.setTimeout(settle, reduced ? 0 : variant.durationMs + 120);
    return () => window.clearTimeout(timer);
  }, [onEntered, variant.durationMs]);

  function handleAnimationEnd(event: React.AnimationEvent<HTMLDivElement>) {
    if (!onEntered || event.animationName !== `focus-${variant.id}`) return;
    if (enteredRef.current) return;
    enteredRef.current = true;
    onEntered();
  }

  return (
    <div
      data-testid="case-study-focus"
      data-variant={variant.id}
      role="dialog"
      aria-modal="true"
      aria-label={caseStudy.title}
      className={`focus-overlay ${variant.className}`}
      onAnimationEnd={handleAnimationEnd}
      style={
        {
          backgroundColor: caseStudy.thumbnailColor,
          "--focus-duration": `${variant.durationMs}ms`,
          "--focus-x": `${origin.xPercent}%`,
          "--focus-y": `${origin.yPercent}%`,
        } as React.CSSProperties
      }
    >
      <div className="focus-content absolute inset-0 p-12 flex flex-col justify-end">
        <h1 className="font-display text-5xl md:text-7xl">{caseStudy.title}</h1>
        <p className="font-body text-2xl mt-4">{caseStudy.blurb}</p>
      </div>
      {onClose && (
        <button
          type="button"
          data-testid="case-study-focus-close"
          onClick={onClose}
          className="focus-content absolute top-6 right-6 rounded-full border-2 border-current px-4 py-2 font-mono text-xs cursor-pointer"
        >
          Close
        </button>
      )}
    </div>
  );
}
