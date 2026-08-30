"use client";

import { useState } from "react";
import type { ASCIITextConfig } from "@/lib/asciiText";
import type { WarpTextConfig } from "@/lib/warpText";
import type { StrokeTextConfig } from "@/lib/strokeText";
import type { FanSheetConfig } from "@/lib/fanSheet";

type FanDebugPanelProps = {
  config: FanSheetConfig;
  onConfigChange: (config: FanSheetConfig) => void;
  transitionMs: number;
  onTransitionMsChange: (ms: number) => void;
  thresholdPx: number;
  onThresholdPxChange: (px: number) => void;
  fanSplit: number;
  onFanSplitChange: (split: number) => void;
  smoothingMs: number;
  onSmoothingMsChange: (ms: number) => void;
  asciiConfig: ASCIITextConfig;
  onAsciiConfigChange: (config: ASCIITextConfig) => void;
  warpConfig: WarpTextConfig;
  onWarpConfigChange: (config: WarpTextConfig) => void;
  strokeConfig: StrokeTextConfig;
  onStrokeConfigChange: (config: StrokeTextConfig) => void;
};

const BAND_LABELS = ["Case One", "Case Two", "Case Three", "Case Four", "Case Five"];
const TREATMENT_LABELS = {
  warp: "Warp Text",
  ascii: "ASCII Text",
  stroke: "Stroke Text",
} as const;

type TreatmentId = keyof typeof TREATMENT_LABELS;

export function FanDebugPanel({
  config,
  onConfigChange,
  transitionMs,
  onTransitionMsChange,
  thresholdPx,
  onThresholdPxChange,
  fanSplit,
  onFanSplitChange,
  smoothingMs,
  onSmoothingMsChange,
  asciiConfig,
  onAsciiConfigChange,
  warpConfig,
  onWarpConfigChange,
  strokeConfig,
  onStrokeConfigChange,
}: FanDebugPanelProps) {
  const [open, setOpen] = useState(false);
  const [selectedTreatment, setSelectedTreatment] = useState<TreatmentId>("ascii");
  const [stackControlsOpen, setStackControlsOpen] = useState(false);
  const [panelWidth, setPanelWidth] = useState(320);

  function updateBand(index: number, value: number) {
    const next = [...config.bandPercents];
    next[index] = value;
    onConfigChange({ ...config, bandPercents: next });
  }

  function updateAscii<Key extends keyof ASCIITextConfig>(key: Key, value: ASCIITextConfig[Key]) {
    onAsciiConfigChange({ ...asciiConfig, [key]: value });
  }

  function updateWarp<Key extends keyof WarpTextConfig>(key: Key, value: WarpTextConfig[Key]) {
    onWarpConfigChange({ ...warpConfig, [key]: value });
  }

  function updateStroke<Key extends keyof StrokeTextConfig>(
    key: Key,
    value: StrokeTextConfig[Key],
  ) {
    onStrokeConfigChange({ ...strokeConfig, [key]: value });
  }

  if (!open) {
    return (
      <button
        type="button"
        data-testid="fan-debug-toggle"
        onClick={() => setOpen(true)}
        aria-expanded={false}
        className="fixed top-4 right-4 z-[100] rounded-md bg-[#252322]/95 text-white text-xs px-3 py-2 font-mono cursor-pointer shadow-[inset_0_1px_0_rgba(255,255,255,0.1)]"
      >
        Settings
      </button>
    );
  }

  return (
    <div
      data-testid="fan-debug-panel"
      className="fixed top-4 right-4 z-[100] max-h-[calc(100dvh-2rem)] overflow-y-auto rounded-md border border-white/10 bg-[#252322]/95 text-white text-xs p-3 space-y-3 font-mono shadow-[inset_0_1px_0_rgba(255,255,255,0.1)]"
      style={{ width: `${panelWidth}px`, maxWidth: "calc(100vw - 2rem)" }}
    >
      <div className="flex items-center justify-between">
        <span className="uppercase tracking-wide opacity-60">Settings</span>
        <button
          type="button"
          data-testid="fan-debug-close"
          onClick={() => setOpen(false)}
          aria-expanded
          className="rounded px-2 py-1 border border-white/40 cursor-pointer"
        >
          Close
        </button>
      </div>

      <label className="block leading-tight" htmlFor="settings-panel-width">
        Panel width: {panelWidth}px
        <input
          id="settings-panel-width"
          type="range"
          min={240}
          max={480}
          step={10}
          value={panelWidth}
          onChange={(event) => setPanelWidth(Number(event.target.value))}
          className="mt-1 w-full"
        />
      </label>

      <div className="space-y-3">
      <section>
      <button
        type="button"
        data-testid="stack-settings-toggle"
        aria-expanded={stackControlsOpen}
        onClick={() => setStackControlsOpen((isOpen) => !isOpen)}
        className="flex w-full items-center justify-between border-b border-white/20 pb-1 text-left uppercase tracking-wide opacity-60 cursor-pointer"
      >
        <span>Stack controls</span>
        <span aria-hidden="true">{stackControlsOpen ? "−" : "+"}</span>
      </button>
      {stackControlsOpen && (
      <div data-testid="stack-settings" className="mt-2 space-y-2">
      {config.bandPercents.map((band, index) => (
        <label key={index} className="block" htmlFor={`band-${index}`}>
          {BAND_LABELS[index] ?? `Sheet ${index + 1}`} band: {band}%
          <input
            id={`band-${index}`}
            type="range"
            min={0}
            max={40}
            value={band}
            onChange={(e) => updateBand(index, Number(e.target.value))}
            className="w-full"
          />
        </label>
      ))}

      <label className="block" htmlFor="emphasis-bonus">
        Emphasis bonus: {config.emphasisBonusPercent}%
        <input
          id="emphasis-bonus"
          type="range"
          min={0}
          max={40}
          value={config.emphasisBonusPercent}
          onChange={(e) =>
            onConfigChange({ ...config, emphasisBonusPercent: Number(e.target.value) })
          }
          className="w-full"
        />
      </label>

      <label className="block" htmlFor="emphasis-falloff">
        Emphasis falloff: {config.emphasisFalloff.toFixed(2)} sheets
        <input
          id="emphasis-falloff"
          type="range"
          min={0.5}
          max={4}
          step={0.1}
          value={config.emphasisFalloff}
          onChange={(e) =>
            onConfigChange({ ...config, emphasisFalloff: Number(e.target.value) })
          }
          className="w-full"
        />
      </label>

      <label className="block" htmlFor="reveal-lead">
        Reveal lead: {config.revealLeadSheets.toFixed(1)} sheets
        <input
          id="reveal-lead"
          type="range"
          min={0}
          max={5}
          step={0.1}
          value={config.revealLeadSheets}
          onChange={(e) =>
            onConfigChange({ ...config, revealLeadSheets: Number(e.target.value) })
          }
          className="w-full"
        />
      </label>

      <label className="block" htmlFor="tilt-step">
        Tilt per sheet: {config.tiltStepDegrees.toFixed(1)}&deg;
        <input
          id="tilt-step"
          type="range"
          min={-8}
          max={0}
          step={0.5}
          value={config.tiltStepDegrees}
          onChange={(e) =>
            onConfigChange({ ...config, tiltStepDegrees: Number(e.target.value) })
          }
          className="w-full"
        />
      </label>

      <label className="block" htmlFor="max-tilt">
        Max tilt: {config.maxTiltDegrees.toFixed(1)}&deg;
        <input
          id="max-tilt"
          type="range"
          min={0}
          max={20}
          step={0.5}
          value={config.maxTiltDegrees}
          onChange={(e) =>
            onConfigChange({ ...config, maxTiltDegrees: Number(e.target.value) })
          }
          className="w-full"
        />
      </label>

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

      <label className="block" htmlFor="fan-split">
        Fan/sweep split: {fanSplit.toFixed(2)}
        <input
          id="fan-split"
          type="range"
          min={0}
          max={1}
          step={0.05}
          value={fanSplit}
          onChange={(e) => onFanSplitChange(Number(e.target.value))}
          className="w-full"
        />
      </label>

      <label className="block" htmlFor="smoothing-ms">
        Smoothing: {smoothingMs}ms
        <input
          id="smoothing-ms"
          type="range"
          min={0}
          max={400}
          step={10}
          value={smoothingMs}
          onChange={(e) => onSmoothingMsChange(Number(e.target.value))}
          className="w-full"
        />
      </label>

      <label className="block" htmlFor="transition-ms">
        Transition: {transitionMs}ms
        <input
          id="transition-ms"
          type="range"
          min={0}
          max={400}
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
          min={150}
          max={900}
          step={10}
          value={thresholdPx}
          onChange={(e) => onThresholdPxChange(Number(e.target.value))}
          className="w-full"
        />
      </label>
      </div>
      )}
      </section>

      <section className="space-y-3">
        <h2 className="sr-only">Text treatments</h2>

        <div className="grid grid-cols-2 gap-1.5" role="tablist" aria-label="Text treatment settings">
          {(Object.keys(TREATMENT_LABELS) as TreatmentId[]).map((treatment) => (
            <button
              key={treatment}
              type="button"
              role="tab"
              aria-selected={selectedTreatment === treatment}
              onClick={() => setSelectedTreatment(treatment)}
              className={`rounded border px-2 py-1.5 text-left transition-colors duration-150 cursor-pointer active:scale-[0.98] ${
                selectedTreatment === treatment ? "bg-white text-black border-white" : "border-white/40 hover:border-white/75"
              }`}
            >
              {TREATMENT_LABELS[treatment]}
            </button>
          ))}
        </div>

        {selectedTreatment === "ascii" ? (
        <div data-testid="ascii-text-settings" className="grid grid-cols-1 gap-y-3">
        <label className="flex items-center justify-between gap-3" htmlFor="ascii-waves">
          <span>Enable waves</span>
          <input
            id="ascii-waves"
            type="checkbox"
            checked={asciiConfig.enableWaves}
            onChange={(event) => updateAscii("enableWaves", event.target.checked)}
            className="size-4 accent-white"
          />
        </label>

        <label className="flex items-center justify-between gap-3" htmlFor="ascii-random-glyph-colors">
          <span>Random color chips</span>
          <input
            id="ascii-random-glyph-colors"
            type="checkbox"
            checked={asciiConfig.randomizeGlyphColors}
            onChange={(event) => updateAscii("randomizeGlyphColors", event.target.checked)}
            className="size-4 accent-white"
          />
        </label>

        <label className="flex items-center justify-between gap-3" htmlFor="ascii-random-stage-color">
          <span>Random stage color</span>
          <input
            id="ascii-random-stage-color"
            type="checkbox"
            checked={asciiConfig.randomizeStageColor}
            onChange={(event) => updateAscii("randomizeStageColor", event.target.checked)}
            className="size-4 accent-white"
          />
        </label>

        <label className="block leading-tight" htmlFor="ascii-font-size">
          ASCII glyph size: {asciiConfig.asciiFontSize}px
          <input
            id="ascii-font-size"
            type="range"
            min={6}
            max={20}
            step={1}
            value={asciiConfig.asciiFontSize}
            onChange={(event) => updateAscii("asciiFontSize", Number(event.target.value))}
            className="mt-1 w-full"
          />
        </label>

        <label className="block leading-tight" htmlFor="ascii-text-font-size">
          Source text size: {asciiConfig.textFontSize}px
          <input
            id="ascii-text-font-size"
            type="range"
            min={100}
            max={360}
            step={10}
            value={asciiConfig.textFontSize}
            onChange={(event) => updateAscii("textFontSize", Number(event.target.value))}
            className="mt-1 w-full"
          />
        </label>

        <label className="block leading-tight" htmlFor="ascii-plane-height">
          Plane height: {asciiConfig.planeBaseHeight.toFixed(1)}
          <input
            id="ascii-plane-height"
            type="range"
            min={4}
            max={14}
            step={0.5}
            value={asciiConfig.planeBaseHeight}
            onChange={(event) => updateAscii("planeBaseHeight", Number(event.target.value))}
            className="mt-1 w-full"
          />
        </label>
        </div>
        ) : selectedTreatment === "warp" ? (
        <div data-testid="warp-text-settings" className="grid grid-cols-1 gap-y-3">

          <label className="block leading-tight" htmlFor="warp-line-height">
            Line height: {warpConfig.lineHeight.toFixed(2)}
            <input
              id="warp-line-height"
              type="range"
              min={0.7}
              max={1.3}
              step={0.05}
              value={warpConfig.lineHeight}
              onChange={(event) => updateWarp("lineHeight", Number(event.target.value))}
              className="mt-1 w-full"
            />
          </label>

          <label className="block leading-tight" htmlFor="warp-strength">
            Warp strength: {warpConfig.warpStrength.toFixed(2)}
            <input
              id="warp-strength"
              type="range"
              min={0}
              max={0.5}
              step={0.01}
              value={warpConfig.warpStrength}
              onChange={(event) => updateWarp("warpStrength", Number(event.target.value))}
              className="mt-1 w-full"
            />
          </label>

          <label className="block leading-tight" htmlFor="warp-scale">
            Warp scale: {warpConfig.warpScale.toFixed(1)}
            <input
              id="warp-scale"
              type="range"
              min={0.5}
              max={5}
              step={0.1}
              value={warpConfig.warpScale}
              onChange={(event) => updateWarp("warpScale", Number(event.target.value))}
              className="mt-1 w-full"
            />
          </label>

          <label className="block leading-tight" htmlFor="warp-speed">
            Speed: {warpConfig.speed.toFixed(2)}
            <input
              id="warp-speed"
              type="range"
              min={0}
              max={1.5}
              step={0.05}
              value={warpConfig.speed}
              onChange={(event) => updateWarp("speed", Number(event.target.value))}
              className="mt-1 w-full"
            />
          </label>

          <label className="block leading-tight" htmlFor="warp-pointer-radius">
            Pointer radius: {warpConfig.pointerInfluence.toFixed(2)}
            <input
              id="warp-pointer-radius"
              type="range"
              min={0.1}
              max={1}
              step={0.05}
              value={warpConfig.pointerInfluence}
              onChange={(event) => updateWarp("pointerInfluence", Number(event.target.value))}
              className="mt-1 w-full"
            />
          </label>

          <label className="block leading-tight" htmlFor="warp-pointer-strength">
            Pointer strength: {warpConfig.pointerStrength.toFixed(2)}
            <input
              id="warp-pointer-strength"
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={warpConfig.pointerStrength}
              onChange={(event) => updateWarp("pointerStrength", Number(event.target.value))}
              className="mt-1 w-full"
            />
          </label>

          <label className="block leading-tight" htmlFor="warp-refraction">
            Refraction: {warpConfig.refraction.toFixed(2)}
            <input
              id="warp-refraction"
              type="range"
              min={0}
              max={0.15}
              step={0.01}
              value={warpConfig.refraction}
              onChange={(event) => updateWarp("refraction", Number(event.target.value))}
              className="mt-1 w-full"
            />
          </label>

          <label className="flex items-center justify-between gap-3" htmlFor="warp-ripple">
            <span>Ripple</span>
            <input
              id="warp-ripple"
              type="checkbox"
              checked={warpConfig.ripple}
              onChange={(event) => updateWarp("ripple", event.target.checked)}
              className="size-4 accent-white"
            />
          </label>
        </div>
        ) : (
        <div data-testid="stroke-text-settings" className="grid grid-cols-1 gap-y-3">
          <div className="grid grid-cols-2 gap-2">
            <label className="block leading-tight" htmlFor="stroke-color">
              Stroke color
              <input
                id="stroke-color"
                type="color"
                value={strokeConfig.strokeColor}
                onChange={(event) => updateStroke("strokeColor", event.target.value)}
                className="mt-1 h-7 w-full cursor-pointer rounded border border-white/30 bg-transparent"
              />
            </label>

            <label className="block leading-tight" htmlFor="stroke-fill-color">
              Fill color
              <input
                id="stroke-fill-color"
                type="color"
                value={strokeConfig.fillColor}
                onChange={(event) => updateStroke("fillColor", event.target.value)}
                className="mt-1 h-7 w-full cursor-pointer rounded border border-white/30 bg-transparent"
              />
            </label>
          </div>

          <label className="block leading-tight" htmlFor="stroke-width">
            Stroke width: {strokeConfig.strokeWidth.toFixed(1)}px
            <input id="stroke-width" type="range" min={0.5} max={6} step={0.1} value={strokeConfig.strokeWidth} onChange={(event) => updateStroke("strokeWidth", Number(event.target.value))} className="mt-1 w-full" />
          </label>

          <label className="block leading-tight" htmlFor="stroke-draw-duration">
            Draw duration: {strokeConfig.drawDuration.toFixed(1)}s
            <input id="stroke-draw-duration" type="range" min={0.2} max={4} step={0.1} value={strokeConfig.drawDuration} onChange={(event) => updateStroke("drawDuration", Number(event.target.value))} className="mt-1 w-full" />
          </label>

          <label className="block leading-tight" htmlFor="stroke-fill-delay">
            Fill delay: {strokeConfig.fillDelay.toFixed(2)}s
            <input id="stroke-fill-delay" type="range" min={0} max={1} step={0.05} value={strokeConfig.fillDelay} onChange={(event) => updateStroke("fillDelay", Number(event.target.value))} className="mt-1 w-full" />
          </label>

          <label className="block leading-tight" htmlFor="stroke-stagger">
            Character stagger: {strokeConfig.stagger.toFixed(2)}s
            <input id="stroke-stagger" type="range" min={0} max={0.3} step={0.01} value={strokeConfig.stagger} onChange={(event) => updateStroke("stagger", Number(event.target.value))} className="mt-1 w-full" />
          </label>

          <label className="block leading-tight" htmlFor="stroke-ease">
            Easing
            <select id="stroke-ease" value={strokeConfig.ease} onChange={(event) => updateStroke("ease", event.target.value)} className="mt-1 w-full rounded border border-white/30 bg-[#252322] px-2 py-1">
              <option value="power2.out">Power 2 out</option>
              <option value="expo.out">Expo out</option>
              <option value="power3.out">Power 3 out</option>
              <option value="linear">Linear</option>
            </select>
          </label>

          <label className="block leading-tight" htmlFor="stroke-trigger">
            Animation trigger
            <select id="stroke-trigger" value={strokeConfig.trigger} onChange={(event) => updateStroke("trigger", event.target.value as StrokeTextConfig["trigger"])} className="mt-1 w-full rounded border border-white/30 bg-[#252322] px-2 py-1">
              <option value="mount">On mount</option>
              <option value="hover">On hover</option>
              <option value="scroll">On scroll</option>
              <option value="loop">Loop</option>
            </select>
          </label>

          <label className="block leading-tight" htmlFor="stroke-fill-mode">
            Fill treatment
            <select id="stroke-fill-mode" value={strokeConfig.fillMode} onChange={(event) => updateStroke("fillMode", event.target.value as StrokeTextConfig["fillMode"])} className="mt-1 w-full rounded border border-white/30 bg-[#252322] px-2 py-1">
              <option value="fade">Fade</option>
              <option value="wipe">Wipe</option>
              <option value="none">None</option>
            </select>
          </label>

          <label className="block leading-tight" htmlFor="stroke-font-size">
            Source text size: {strokeConfig.fontSize}px
            <input id="stroke-font-size" type="range" min={80} max={360} step={10} value={strokeConfig.fontSize} onChange={(event) => updateStroke("fontSize", Number(event.target.value))} className="mt-1 w-full" />
          </label>

          <label className="block leading-tight" htmlFor="stroke-font-weight">
            Font weight: {strokeConfig.fontWeight}
            <input id="stroke-font-weight" type="range" min={300} max={900} step={100} value={strokeConfig.fontWeight} onChange={(event) => updateStroke("fontWeight", Number(event.target.value))} className="mt-1 w-full" />
          </label>

          <label className="block leading-tight" htmlFor="stroke-letter-spacing">
            Letter spacing: {strokeConfig.letterSpacing}px
            <input id="stroke-letter-spacing" type="range" min={-20} max={20} step={1} value={strokeConfig.letterSpacing} onChange={(event) => updateStroke("letterSpacing", Number(event.target.value))} className="mt-1 w-full" />
          </label>

          <label className="flex items-center justify-between gap-3" htmlFor="stroke-reverse">
            <span>Reverse draw</span>
            <input id="stroke-reverse" type="checkbox" checked={strokeConfig.reverse} onChange={(event) => updateStroke("reverse", event.target.checked)} className="size-4 accent-white" />
          </label>
        </div>
        )}
      </section>
      </div>
    </div>
  );
}
