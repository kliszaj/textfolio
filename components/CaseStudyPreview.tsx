"use client";

import { useRouter } from "next/navigation";
import type { CaseStudy } from "@/data/caseStudies";

type CaseStudyPreviewProps = {
  caseStudy: CaseStudy;
  focused: boolean;
};

export function CaseStudyPreview({ caseStudy, focused }: CaseStudyPreviewProps) {
  const router = useRouter();

  return (
    <button
      type="button"
      onClick={() => router.push(`/work/${caseStudy.slug}`)}
      className="relative w-full h-full text-left cursor-pointer"
      style={{ backgroundColor: caseStudy.thumbnailColor }}
    >
      <div className="absolute bottom-0 left-0 right-0 p-6">
        <span className="font-display text-2xl md:text-4xl block">{caseStudy.title}</span>
        {focused && (
          <span className="font-script text-xl block mt-2">{caseStudy.blurb}</span>
        )}
      </div>
    </button>
  );
}
