"use client";

import { useState } from "react";
import { useFanProgress } from "@/hooks/useFanProgress";
import { usePointerType } from "@/hooks/usePointerType";
import { PaperStack } from "@/components/PaperStack";
import { FanDebugPanel } from "@/components/FanDebugPanel";
import type { FanSheetConfig } from "@/lib/fanSheet";

const DEFAULT_CONFIG: FanSheetConfig = {
  mechanic: "bottom",
  recedePercents: [12, 8, 4, 0],
  brightnessFalloff: 0.05,
};

const DEFAULT_TRANSITION_MS = 280;
const DEFAULT_THRESHOLD_PX = 250;

export default function HomePage() {
  const [config, setConfig] = useState<FanSheetConfig>(DEFAULT_CONFIG);
  const [transitionMs, setTransitionMs] = useState(DEFAULT_TRANSITION_MS);
  const [thresholdPx, setThresholdPx] = useState(DEFAULT_THRESHOLD_PX);
  const fanProgress = useFanProgress(thresholdPx);
  const pointerType = usePointerType();

  return (
    <>
      <div className="fixed inset-0 overflow-hidden">
        <PaperStack fanProgress={fanProgress} config={config} transitionMs={transitionMs} />
      </div>
      {pointerType === "coarse" && <div style={{ height: "150vh" }} aria-hidden="true" />}
      <FanDebugPanel
        config={config}
        onConfigChange={setConfig}
        transitionMs={transitionMs}
        onTransitionMsChange={setTransitionMs}
        thresholdPx={thresholdPx}
        onThresholdPxChange={setThresholdPx}
      />
    </>
  );
}
