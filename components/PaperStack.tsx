"use client";

import { caseStudies } from "@/data/caseStudies";
import { computeCardTransform } from "@/lib/fanTransform";
import { PaperCard } from "./PaperCard";

type PaperStackProps = {
  fanProgress: number;
};

export function PaperStack({ fanProgress }: PaperStackProps) {
  return (
    <div className="absolute inset-0 pointer-events-none">
      {caseStudies.map((caseStudy, index) => (
        <div key={caseStudy.slug} className="pointer-events-auto">
          <PaperCard
            caseStudy={caseStudy}
            transform={computeCardTransform(index, caseStudies.length, fanProgress)}
            zIndex={index}
          />
        </div>
      ))}
    </div>
  );
}
