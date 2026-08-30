"use client";

import { caseStudies } from "@/data/caseStudies";
import { computeEmphasis, computeSheetInset } from "@/lib/fanSheet";
import type { FanSheetConfig } from "@/lib/fanSheet";
import type { CaseStudy } from "@/data/caseStudies";
import { DEFAULT_ASCII_TEXT_CONFIG } from "@/lib/asciiText";
import type { ASCIITextConfig } from "@/lib/asciiText";
import { DEFAULT_WARP_TEXT_CONFIG } from "@/lib/warpText";
import type { WarpTextConfig } from "@/lib/warpText";
import { DEFAULT_STROKE_TEXT_CONFIG } from "@/lib/strokeText";
import type { StrokeTextConfig } from "@/lib/strokeText";
import { DEFAULT_PAPER_TEXTURE_CONFIG } from "@/lib/paperTexture";
import type { PaperTextureConfig } from "@/lib/paperTexture";
import { Hero } from "./Hero";
import { PaperSheet } from "./PaperSheet";
import { CaseStudyPreview } from "./CaseStudyPreview";

const Z_INDEX_STEP = 10;
// Half the hero's recede, which keeps the name centred in the cream that is
// left rather than letting it drift toward the bottom edge.
const HERO_LIFT_RATIO = 0.5;

// Counted up from the back so the whole stack stays above the backdrop however
// many case studies there are. A fixed base would push the deepest sheets to
// zero and below once the stack grew.
function zIndexForDepth(depth: number, sheetCount: number): number {
  return (sheetCount - depth + 1) * Z_INDEX_STEP;
}

type PaperStackProps = {
  fanProgress: number;
  sweepProgress: number;
  config: FanSheetConfig;
  transitionMs: number;
  asciiConfig?: ASCIITextConfig;
  warpConfig?: WarpTextConfig;
  strokeConfig?: StrokeTextConfig;
  paperTextureConfig?: PaperTextureConfig;
  onSelectCaseStudy?: (caseStudy: CaseStudy) => void;
  playIntro?: boolean;
};

export function PaperStack({
  fanProgress,
  sweepProgress,
  config,
  transitionMs,
  asciiConfig = DEFAULT_ASCII_TEXT_CONFIG,
  warpConfig = DEFAULT_WARP_TEXT_CONFIG,
  strokeConfig = DEFAULT_STROKE_TEXT_CONFIG,
  paperTextureConfig = DEFAULT_PAPER_TEXTURE_CONFIG,
  onSelectCaseStudy,
  playIntro,
}: PaperStackProps) {
  const sheetCount = caseStudies.length;
  const heroInset = computeSheetInset(0, fanProgress, sweepProgress, config, sheetCount);
  const heroLift = heroInset.bottom * HERO_LIFT_RATIO;
  return (
    <>
      <PaperSheet
        depth={0}
        fanProgress={fanProgress}
        sweepProgress={sweepProgress}
        sheetCount={sheetCount}
        config={config}
        transitionMs={transitionMs}
        zIndex={zIndexForDepth(0, sheetCount)}
      >
        <Hero playIntro={playIntro} fanProgress={fanProgress} liftPercent={heroLift} asciiConfig={asciiConfig} warpConfig={warpConfig} strokeConfig={strokeConfig} paperTextureConfig={paperTextureConfig} />
      </PaperSheet>
      {caseStudies.map((caseStudy, index) => {
        const depth = index + 1;
        const emphasis = computeEmphasis(
          depth,
          sweepProgress,
          sheetCount,
          config.emphasisFalloff
        );
        return (
          <PaperSheet
            key={caseStudy.slug}
            depth={depth}
            fanProgress={fanProgress}
            sweepProgress={sweepProgress}
            sheetCount={sheetCount}
            config={config}
            transitionMs={transitionMs}
            zIndex={zIndexForDepth(depth, sheetCount)}
          >
            <CaseStudyPreview
              caseStudy={caseStudy}
              emphasis={emphasis}
              onSelect={onSelectCaseStudy}
            />
          </PaperSheet>
        );
      })}
    </>
  );
}
