"use client";

import { useRef, useState } from "react";
import { notFound } from "next/navigation";
import { PaperStack } from "@/components/PaperStack";
import { CaseStudyFocus } from "@/components/CaseStudyFocus";
import type { FocusOrigin } from "@/components/CaseStudyFocus";
import { FOCUS_VARIANTS } from "@/lib/focusVariants";
import type { FanSheetConfig } from "@/lib/fanSheet";
import type { CaseStudy } from "@/data/caseStudies";

// Held open and evenly fanned so every case study is a generous click target.
// The point here is the transition out of the stack, not the fan itself.
const PROTOTYPE_CONFIG: FanSheetConfig = {
  mechanic: "bottom",
  bandPercents: [11, 11, 11, 11, 11],
  emphasisBonusPercent: 0,
  emphasisFalloff: 1.5,
  revealLeadSheets: 0,
  tiltStepDegrees: -2,
  maxTiltDegrees: 6,
  brightnessFalloff: 0.05,
};

export default function FocusPrototypePage() {
  // A design harness, not part of the site. Reachable in dev only.
  if (process.env.NODE_ENV === "production") notFound();

  const [variantId, setVariantId] = useState(FOCUS_VARIANTS[0].id);
  const [focused, setFocused] = useState<{ caseStudy: CaseStudy; origin: FocusOrigin } | null>(
    null
  );
  const [replayKey, setReplayKey] = useState(0);
  const originRef = useRef<FocusOrigin>({ xPercent: 50, yPercent: 80 });

  function rememberOrigin(event: React.MouseEvent) {
    originRef.current = {
      xPercent: (event.clientX / window.innerWidth) * 100,
      yPercent: (event.clientY / window.innerHeight) * 100,
    };
  }

  function open(caseStudy: CaseStudy) {
    setFocused({ caseStudy, origin: originRef.current });
    setReplayKey((key) => key + 1);
  }

  return (
    <>
      <div
        className="fixed inset-0 overflow-hidden"
        onClickCapture={rememberOrigin}
        data-testid="prototype-stack"
      >
        <PaperStack
          fanProgress={1}
          sweepProgress={1}
          config={PROTOTYPE_CONFIG}
          transitionMs={0}
          onSelectCaseStudy={open}
        />
      </div>

      {focused && (
        <CaseStudyFocus
          key={`${variantId}-${replayKey}`}
          caseStudy={focused.caseStudy}
          variantId={variantId}
          origin={focused.origin}
          onClose={() => setFocused(null)}
        />
      )}

      <div className="fixed top-4 left-4 z-[300] w-80 rounded-lg bg-black/85 text-white p-4 font-mono text-xs space-y-3">
        <div>
          <p className="uppercase tracking-wide opacity-60">Focus transition</p>
          <p className="mt-1 opacity-60 leading-relaxed">
            Pick a direction, then click any case study in the stack.
          </p>
        </div>

        <div className="space-y-2">
          {FOCUS_VARIANTS.map((variant) => (
            <label
              key={variant.id}
              className={`block rounded border p-2 cursor-pointer ${
                variantId === variant.id ? "bg-white text-black" : "border-white/30"
              }`}
            >
              <span className="flex items-center justify-between gap-2">
                <span className="font-bold">{variant.name}</span>
                <span className="opacity-60">{variant.durationMs}ms</span>
              </span>
              <input
                type="radio"
                name="focus-variant"
                className="sr-only"
                value={variant.id}
                checked={variantId === variant.id}
                onChange={() => setVariantId(variant.id)}
              />
              <span className="mt-1 block leading-relaxed opacity-70">
                {variant.description}
              </span>
            </label>
          ))}
        </div>

        {focused && (
          <button
            type="button"
            onClick={() => setReplayKey((key) => key + 1)}
            className="w-full rounded border border-white/40 px-2 py-1 cursor-pointer"
          >
            Replay
          </button>
        )}
      </div>
    </>
  );
}
