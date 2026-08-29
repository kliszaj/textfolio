"use client";

import type { FanMechanic, FanSheetConfig } from "@/lib/fanSheet";

type FanDebugPanelProps = {
  config: FanSheetConfig;
  onConfigChange: (config: FanSheetConfig) => void;
  transitionMs: number;
  onTransitionMsChange: (ms: number) => void;
  thresholdPx: number;
  onThresholdPxChange: (px: number) => void;
};

const DEPTH_LABELS = ["Home", "Case One", "Case Two", "Case Three"];

export function FanDebugPanel({
  config,
  onConfigChange,
  transitionMs,
  onTransitionMsChange,
  thresholdPx,
  onThresholdPxChange,
}: FanDebugPanelProps) {
  function setMechanic(mechanic: FanMechanic) {
    onConfigChange({ ...config, mechanic });
  }

  function updateRecede(depth: number, value: number) {
    const next = [...config.recedePercents] as FanSheetConfig["recedePercents"];
    next[depth] = value;
    onConfigChange({ ...config, recedePercents: next });
  }

  return (
    <div
      data-testid="fan-debug-panel"
      className="fixed top-4 right-4 z-[100] w-72 rounded-lg bg-black/80 text-white text-xs p-4 space-y-3 font-mono"
    >
      <div className="flex gap-2">
        {(["bottom", "corner"] as const).map((mechanic) => (
          <button
            key={mechanic}
            type="button"
            onClick={() => setMechanic(mechanic)}
            className={`flex-1 rounded px-2 py-1 border ${
              config.mechanic === mechanic ? "bg-white text-black" : "border-white/40"
            }`}
          >
            {mechanic === "bottom" ? "Bottom Peek" : "Corner Cascade"}
          </button>
        ))}
      </div>

      {DEPTH_LABELS.map((label, depth) => (
        <label key={label} className="block" htmlFor={`recede-${depth}`}>
          {label} recede: {config.recedePercents[depth]}%
          <input
            id={`recede-${depth}`}
            type="range"
            min={0}
            max={40}
            value={config.recedePercents[depth]}
            onChange={(e) => updateRecede(depth, Number(e.target.value))}
            className="w-full"
          />
        </label>
      ))}

      <label className="block" htmlFor="brightness-falloff">
        Brightness falloff: {config.brightnessFalloff.toFixed(2)}
        <input
          id="brightness-falloff"
          type="range"
          min={0}
          max={0.2}
          step={0.01}
          value={config.brightnessFalloff}
          onChange={(e) => onConfigChange({ ...config, brightnessFalloff: Number(e.target.value) })}
          className="w-full"
        />
      </label>

      <label className="block" htmlFor="transition-ms">
        Transition: {transitionMs}ms
        <input
          id="transition-ms"
          type="range"
          min={0}
          max={800}
          step={10}
          value={transitionMs}
          onChange={(e) => onTransitionMsChange(Number(e.target.value))}
          className="w-full"
        />
      </label>

      <label className="block" htmlFor="threshold-px">
        Bottom trigger threshold: {thresholdPx}px
        <input
          id="threshold-px"
          type="range"
          min={80}
          max={500}
          step={10}
          value={thresholdPx}
          onChange={(e) => onThresholdPxChange(Number(e.target.value))}
          className="w-full"
        />
      </label>
    </div>
  );
}
