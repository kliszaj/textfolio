"use client";

import { useEffect, useState } from "react";
import { ColorPicker } from "./ColorPicker";
import { DeskGradientControls, type DeskGradients } from "./DeskGradients";
import { DeskTwilightControls, type DeskTwilight } from "./DeskTwilight";

export type DeskFraming = { zoom: number; x: number; y: number };
export const DEFAULT_DESK_FRAMING: DeskFraming = { zoom: 1.23, x: -3, y: -2 };
const STORAGE_KEY = "textfolio:desk-framing-v1";
// Twilight's colours live with the rest of the dusk sky in DeskTwilight.
export const DEFAULT_DESK_COLORS = {
  morning: "#f5ede6", sunriseGlow: "#f5ede6", afternoon: "#f5ede6", night: "#181828",
};
export type DeskColors = typeof DEFAULT_DESK_COLORS;
const COLOR_LABELS: Record<keyof DeskColors, string> = {
  morning: "Morning base", sunriseGlow: "Morning accent", afternoon: "Midday", night: "Night",
};

export function useDeskColors() {
  const [colors, setColors] = useState(DEFAULT_DESK_COLORS);
  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        const saved = JSON.parse(localStorage.getItem("textfolio:desk-colors-v4") ?? "null");
        if (!saved) return;
        const next = { ...DEFAULT_DESK_COLORS };
        for (const key of Object.keys(next) as (keyof DeskColors)[]) {
          if (typeof saved[key] === "string" && /^#[0-9a-f]{6}$/i.test(saved[key])) next[key] = saved[key];
        }
        setColors(next);
      } catch { /* Use the original palette when storage is unavailable. */ }
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);
  const updateColors = (next: DeskColors) => {
    setColors(next);
    try { localStorage.setItem("textfolio:desk-colors-v4", JSON.stringify(next)); } catch { /* Keep controls usable without storage. */ }
  };
  return { colors, updateColors };
}

export function useDeskFraming() {
  const [framing, setFraming] = useState(DEFAULT_DESK_FRAMING);
  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "null");
        if (saved && [saved.zoom, saved.x, saved.y].every(Number.isFinite)) {
          setFraming({ zoom: Math.max(0.7, Math.min(1.4, saved.zoom)), x: Math.max(-30, Math.min(30, saved.x)), y: Math.max(-25, Math.min(25, saved.y)) });
        }
      } catch { /* Use defaults when storage is unavailable. */ }
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);
  const update = (next: DeskFraming) => {
    setFraming(next);
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch { /* Session controls remain usable. */ }
  };
  return { framing, update };
}

export function DeskFramingControls({ framing, onChange, colors, onColorsChange, gradients, onGradientsChange, twilight, onTwilightChange, onShowSunset }: { framing: DeskFraming; onChange: (next: DeskFraming) => void; colors: DeskColors; onColorsChange: (next: DeskColors) => void; gradients: DeskGradients; onGradientsChange: (next: DeskGradients) => void; twilight: DeskTwilight; onTwilightChange: (next: DeskTwilight) => void; onShowSunset: () => void }) {
  const [open, setOpen] = useState(false);
  // data-desk-settings: scrolling the panel shouldn't also step the time of day.
  return <div data-desk-settings className="absolute bottom-6 left-6 font-body md:bottom-10 md:left-10">
    {open && <div className="mb-3 max-h-[75dvh] w-72 overflow-y-auto rounded-lg bg-cream p-4 text-ink shadow-lg">
      <p className="mb-4 text-sm font-medium">Default desk view</p>
      {([
        { key: "zoom", label: "Zoom", min: 0.7, max: 1.4, step: 0.01 },
        { key: "x", label: "Horizontal position", min: -30, max: 30, step: 1 },
        { key: "y", label: "Vertical position", min: -25, max: 25, step: 1 },
      ] as const).map(({ key, label, min, max, step }) => <label key={key} className="mb-4 block text-sm">
        <span className="flex justify-between"><span>{label}</span><span>{Math.round(framing[key] * (key === "zoom" ? 100 : 1))}%</span></span>
        <input className="mt-2 w-full" type="range" min={min} max={max} step={step} value={framing[key]} onChange={(event) => onChange({ ...framing, [key]: Number(event.target.value) })} />
      </label>)}
      <button type="button" className="text-sm underline underline-offset-4" onClick={() => onChange(DEFAULT_DESK_FRAMING)}>Reset view</button>
      <fieldset className="mt-5">
        <legend className="mb-3 text-sm font-medium">Backgrounds</legend>
        {(Object.keys(DEFAULT_DESK_COLORS) as (keyof DeskColors)[]).map((period) => (
          <ColorPicker key={period} label={COLOR_LABELS[period]} value={colors[period]} onChange={(hex) => onColorsChange({ ...colors, [period]: hex })} />
        ))}
        <button type="button" className="text-sm underline underline-offset-4" onClick={() => onColorsChange(DEFAULT_DESK_COLORS)}>Reset colors</button>
        <p className="mt-2 text-xs opacity-70">Scroll over the desk to preview each time of day.</p>
      </fieldset>
      <DeskTwilightControls twilight={twilight} onChange={onTwilightChange} onShowSunset={onShowSunset} />
      <DeskGradientControls gradients={gradients} onChange={onGradientsChange} />
      <p className="mt-3 text-xs opacity-70">Saved in this browser. Negative positions move left or down.</p>
    </div>}
    <button type="button" aria-expanded={open} onClick={() => setOpen(!open)} className="rounded-full border border-current px-4 py-2 text-sm">{open ? "Close settings" : "Desk settings"}</button>
  </div>;
}
