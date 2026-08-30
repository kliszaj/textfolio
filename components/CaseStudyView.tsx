"use client";

import type { CaseStudy } from "@/data/caseStudies";

type CaseStudyViewProps = {
  caseStudy: CaseStudy;
};

export function CaseStudyView({ caseStudy }: CaseStudyViewProps) {
  return (
    <main data-testid="case-study-view" className="min-h-screen bg-cream text-ink">
      {/* Starts full-bleed and settles to header height, so the colour the
          sheet lift left filling the screen contracts into the header rather
          than popping. Content is bottom-aligned and matches CaseStudyFocus's
          final frame exactly, so it rides up with the collapse. */}
      <header
        data-testid="case-study-header"
        className="case-study-header flex flex-col justify-end p-12"
        style={{ backgroundColor: caseStudy.thumbnailColor }}
      >
        <h1 className="font-display text-5xl md:text-7xl">{caseStudy.title}</h1>
        <p className="font-script text-2xl mt-4">{caseStudy.blurb}</p>
      </header>

      <div data-testid="case-study-body" className="case-study-body p-12">
        {caseStudy.videoSrc && (
          <video
            data-testid="case-study-video"
            className="w-full max-w-5xl mx-auto rounded-2xl"
            src={caseStudy.videoSrc}
            style={{ backgroundColor: caseStudy.thumbnailColor }}
            autoPlay
            muted
            loop
            playsInline
            controls
          />
        )}
        <p className="text-lg leading-relaxed max-w-3xl mt-8">
          Placeholder body copy for {caseStudy.title}. The real write-up goes
          here — process, decisions, and the work itself.
        </p>
      </div>
    </main>
  );
}
