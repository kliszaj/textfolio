"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useFanProgress } from "@/hooks/useFanProgress";
import { useStackCollapse } from "@/hooks/useStackCollapse";
import { usePointerType } from "@/hooks/usePointerType";
import { PaperStack } from "@/components/PaperStack";
import { useIntroOnce } from "@/hooks/useIntroOnce";
import { FanDebugPanel } from "@/components/FanDebugPanel";
import { CaseStudyFocus } from "@/components/CaseStudyFocus";
import type { FocusOrigin } from "@/components/CaseStudyFocus";
import { DEFAULT_FOCUS_VARIANT_ID } from "@/lib/focusVariants";
import { caseStudies } from "@/data/caseStudies";
import type { CaseStudy } from "@/data/caseStudies";
import { FAN_SMOOTHING_MS, FAN_SPLIT, FAN_THRESHOLD_PX, splitTravel } from "@/lib/fanProgress";
import type { FanSheetConfig } from "@/lib/fanSheet";
import { DEFAULT_ASCII_TEXT_CONFIG } from "@/lib/asciiText";
import type { ASCIITextConfig } from "@/lib/asciiText";
import { DEFAULT_WARP_TEXT_CONFIG } from "@/lib/warpText";
import type { WarpTextConfig } from "@/lib/warpText";
import { DEFAULT_STROKE_TEXT_CONFIG } from "@/lib/strokeText";
import type { StrokeTextConfig } from "@/lib/strokeText";
import { DEFAULT_PAPER_TEXTURE_CONFIG } from "@/lib/paperTexture";
import type { PaperTextureConfig } from "@/lib/paperTexture";

const DEFAULT_CONFIG: FanSheetConfig = {
  mechanic: "bottom",
  // Fully swept, the bands add up to roughly half the viewport height. At the
  // old 4/8 they reached about 30% and the stack read as a sliver.
  bandPercents: [6, 6, 6, 6, 6],
  emphasisBonusPercent: 16,
  emphasisFalloff: 1.5,
  revealLeadSheets: 1.5,
  tiltStepDegrees: -2,
  maxTiltDegrees: 6,
  brightnessFalloff: 0.05,
};

// The easing now happens in the animation loop, on the value itself. A CSS
// transition on top of that would retarget every frame and fight it.
const DEFAULT_TRANSITION_MS = 0;

// Tuning controls are a development tool, not something visitors should meet.
const SHOW_DEBUG_PANEL = process.env.NODE_ENV !== "production";

export default function HomePage() {
  const router = useRouter();
  // The story is a first-arrival thing. Coming back from a case study is a
  // client-side navigation, so without this the hero would replay it every time.
  const playIntro = useIntroOnce();
  const [config, setConfig] = useState<FanSheetConfig>(DEFAULT_CONFIG);
  const [lifting, setLifting] = useState<{ caseStudy: CaseStudy; origin: FocusOrigin } | null>(
    null
  );
  const focusOriginRef = useRef<FocusOrigin>({ xPercent: 50, yPercent: 85 });
  const [transitionMs, setTransitionMs] = useState(DEFAULT_TRANSITION_MS);
  const [thresholdPx, setThresholdPx] = useState(FAN_THRESHOLD_PX);
  const [fanSplit, setFanSplit] = useState(FAN_SPLIT);
  const [smoothingMs, setSmoothingMs] = useState(FAN_SMOOTHING_MS);
  const [asciiConfig, setAsciiConfig] = useState<ASCIITextConfig>(DEFAULT_ASCII_TEXT_CONFIG);
  const [warpConfig, setWarpConfig] = useState<WarpTextConfig>(DEFAULT_WARP_TEXT_CONFIG);
  const [strokeConfig, setStrokeConfig] = useState<StrokeTextConfig>(DEFAULT_STROKE_TEXT_CONFIG);
  const [paperTextureConfig, setPaperTextureConfig] = useState<PaperTextureConfig>(
    DEFAULT_PAPER_TEXTURE_CONFIG
  );
  const pointerType = usePointerType();
  const isMobileLayout = pointerType === "coarse";
  // Touch drives the same stack by scrolling rather than getting a different
  // layout: the reveal is the interaction, so it belongs on every screen.
  const pointerFan = useFanProgress(thresholdPx, fanSplit, smoothingMs, true);
  // Coming back from a case study, the stack starts open where it was left and
  // folds shut. Run through the same split as a real gesture, so the collapse
  // is the reveal played backwards rather than a separate animation.
  const collapseTravel = useStackCollapse();
  const { fanProgress, sweepProgress } =
    collapseTravel === null ? pointerFan : splitTravel(collapseTravel, fanSplit);
  // A phone is tall and narrow, so the revealed stack can afford more of it.
  const activeConfig = isMobileLayout
    ? {
        ...config,
        bandPercents: config.bandPercents.map((band) => band * 1.5),
        emphasisBonusPercent: config.emphasisBonusPercent * 1.35,
      }
    : config;

  // Warm every case study route so the push at the end of the lift is instant
  // and the colour carries straight through.
  useEffect(() => {
    caseStudies.forEach((caseStudy) => router.prefetch(`/work/${caseStudy.slug}`));
  }, [router]);

  // onClickCapture runs before the sheet's own handler, so by the time
  // liftCaseStudy fires the origin is already current.
  function rememberOrigin(event: React.MouseEvent) {
    focusOriginRef.current = {
      xPercent: (event.clientX / window.innerWidth) * 100,
      yPercent: (event.clientY / window.innerHeight) * 100,
    };
  }

  function liftCaseStudy(caseStudy: CaseStudy, origin: FocusOrigin = focusOriginRef.current) {
    setLifting({ caseStudy, origin });
  }

  return (
    <>
      <div className="fixed inset-0 overflow-hidden" onClickCapture={rememberOrigin}>
        <PaperStack
          playIntro={playIntro}
          fanProgress={fanProgress}
          sweepProgress={sweepProgress}
          config={activeConfig}
          transitionMs={transitionMs}
          asciiConfig={asciiConfig}
          warpConfig={warpConfig}
          strokeConfig={strokeConfig}
          paperTextureConfig={paperTextureConfig}
          onSelectCaseStudy={liftCaseStudy}

        />
      </div>
      {/* The stack is fixed, so touch needs something to actually scroll
          against. Its height is what the whole gesture is spread over. */}
      {isMobileLayout && (
        <div data-testid="scroll-spacer" style={{ height: "260vh" }} aria-hidden="true" />
      )}
      {lifting && (
        <CaseStudyFocus
          caseStudy={lifting.caseStudy}
          variantId={DEFAULT_FOCUS_VARIANT_ID}
          origin={lifting.origin}
          onEntered={() => router.push(`/work/${lifting.caseStudy.slug}`)}
        />
      )}
      {SHOW_DEBUG_PANEL && !isMobileLayout && (
      <FanDebugPanel
        config={config}
        onConfigChange={setConfig}
        transitionMs={transitionMs}
        onTransitionMsChange={setTransitionMs}
        thresholdPx={thresholdPx}
        onThresholdPxChange={setThresholdPx}
        fanSplit={fanSplit}
        onFanSplitChange={setFanSplit}
        smoothingMs={smoothingMs}
        onSmoothingMsChange={setSmoothingMs}
        asciiConfig={asciiConfig}
        onAsciiConfigChange={setAsciiConfig}
        warpConfig={warpConfig}
        onWarpConfigChange={setWarpConfig}
        strokeConfig={strokeConfig}
        onStrokeConfigChange={setStrokeConfig}
        paperTextureConfig={paperTextureConfig}
        onPaperTextureConfigChange={setPaperTextureConfig}
      />
      )}
    </>
  );
}
