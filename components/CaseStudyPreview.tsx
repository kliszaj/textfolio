"use client";

import { useRouter } from "next/navigation";
import type { CaseStudy } from "@/data/caseStudies";

type CaseStudyPreviewProps = {
  caseStudy: CaseStudy;
};

export function CaseStudyPreview({ caseStudy }: CaseStudyPreviewProps) {
  const router = useRouter();

  return (
    <button
      type="button"
      onClick={() => router.push(`/work/${caseStudy.slug}`)}
      className="w-full h-full flex flex-col items-start justify-end p-10 text-left cursor-pointer"
      style={{ backgroundColor: caseStudy.thumbnailColor }}
    >
      <span className="font-display text-4xl block">{caseStudy.title}</span>
      <span className="font-script text-xl block mt-2">{caseStudy.blurb}</span>
    </button>
  );
}
