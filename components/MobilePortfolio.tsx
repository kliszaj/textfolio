"use client";

import type { MouseEvent } from "react";
import { caseStudies } from "@/data/caseStudies";
import type { CaseStudy } from "@/data/caseStudies";
import type { FocusOrigin } from "./CaseStudyFocus";
import { Hero } from "./Hero";

type MobilePortfolioProps = {
  onSelectCaseStudy: (caseStudy: CaseStudy, origin: FocusOrigin) => void;
};

function originForEvent(event: MouseEvent<HTMLButtonElement>): FocusOrigin {
  return {
    xPercent: (event.clientX / Math.max(window.innerWidth, 1)) * 100,
    yPercent: (event.clientY / Math.max(window.innerHeight, 1)) * 100,
  };
}

export function MobilePortfolio({ onSelectCaseStudy }: MobilePortfolioProps) {
  return (
    <main data-testid="mobile-portfolio" className="min-h-[100dvh] bg-cream text-ink">
      <Hero fanProgress={0} />
      <section
        data-testid="mobile-case-list"
        aria-label="Selected work"
        className="relative bg-cream px-4 pb-4"
      >
        {caseStudies.map((caseStudy, index) => (
          <button
            key={caseStudy.slug}
            data-testid={`mobile-case-${caseStudy.slug}`}
            type="button"
            onClick={(event) => onSelectCaseStudy(caseStudy, originForEvent(event))}
            className="relative flex min-h-[56svh] w-full flex-col justify-end overflow-hidden px-6 py-8 text-left text-ink transition-transform duration-200 ease-out active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
            style={{
              backgroundColor: caseStudy.thumbnailColor,
              marginTop: index === 0 ? 0 : "0.75rem",
            }}
          >
            <span className="mb-auto font-mono text-xs tracking-wide">
              {String(index + 1).padStart(2, "0")} / {String(caseStudies.length).padStart(2, "0")}
            </span>
            <span className="font-display text-5xl leading-none">{caseStudy.title}</span>
            <span className="font-script mt-4 text-2xl leading-tight">{caseStudy.blurb}</span>
          </button>
        ))}
      </section>
    </main>
  );
}
