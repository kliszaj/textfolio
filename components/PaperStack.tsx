"use client";

import { caseStudies } from "@/data/caseStudies";
import type { FanSheetConfig } from "@/lib/fanSheet";
import { Hero } from "./Hero";
import { PaperSheet } from "./PaperSheet";
import { CaseStudyPreview } from "./CaseStudyPreview";

const BASE_Z_INDEX = 40;
const Z_INDEX_STEP = 10;

type PaperStackProps = {
  fanProgress: number;
  config: FanSheetConfig;
  transitionMs: number;
};

export function PaperStack({ fanProgress, config, transitionMs }: PaperStackProps) {
  return (
    <>
      <PaperSheet
        depth={0}
        fanProgress={fanProgress}
        config={config}
        transitionMs={transitionMs}
        zIndex={BASE_Z_INDEX}
      >
        <Hero fanProgress={fanProgress} />
      </PaperSheet>
      {caseStudies.map((caseStudy, index) => {
        const depth = index + 1;
        return (
          <PaperSheet
            key={caseStudy.slug}
            depth={depth}
            fanProgress={fanProgress}
            config={config}
            transitionMs={transitionMs}
            zIndex={BASE_Z_INDEX - depth * Z_INDEX_STEP}
          >
            <CaseStudyPreview caseStudy={caseStudy} />
          </PaperSheet>
        );
      })}
    </>
  );
}
