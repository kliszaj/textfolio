"use client";

import { useRouter } from "next/navigation";
import { sheetViewportLeftPercent } from "@/lib/fanSheet";
import type { CaseStudy } from "@/data/caseStudies";

// The sheet bleeds past both side edges; its text must not go with it.
const VIEWPORT_INSET_PERCENT = sheetViewportLeftPercent(0);

// The blurb only starts fading in once a sheet's band has opened far enough to
// have room for it, so the ramp begins partway up the emphasis curve.
const BLURB_RAMP_START = 0.35;
const BLURB_RAMP_LENGTH = 0.4;

type CaseStudyPreviewProps = {
  caseStudy: CaseStudy;
  emphasis: number;
  // Prototypes intercept the click to play a focus transition in place.
  // Left off, a click navigates to the case study's own route as before.
  onSelect?: (caseStudy: CaseStudy) => void;
};

export function CaseStudyPreview({
  caseStudy,
  emphasis,
  onSelect,
}: CaseStudyPreviewProps) {
  const router = useRouter();

  const blurbOpacity = Math.min(
    1,
    Math.max(0, (emphasis - BLURB_RAMP_START) / BLURB_RAMP_LENGTH)
  );

  return (
    <button
      type="button"
      onClick={() =>
        onSelect ? onSelect(caseStudy) : router.push(`/work/${caseStudy.slug}`)
      }
      className="relative w-full h-full text-left cursor-pointer"
      style={{ backgroundColor: caseStudy.thumbnailColor }}
    >
      <div
        className="absolute bottom-0 p-6"
        style={{
          left: `${VIEWPORT_INSET_PERCENT}%`,
          right: `${VIEWPORT_INSET_PERCENT}%`,
        }}
      >
        <span className="font-display text-2xl md:text-4xl block">{caseStudy.title}</span>
        <span className="font-script text-xl block mt-2" style={{ opacity: blurbOpacity }}>
          {caseStudy.blurb}
        </span>
      </div>
    </button>
  );
}
