"use client";

import { useEffect, useState } from "react";
import { ColorPicker } from "./ColorPicker";
import { TWILIGHT_PALETTES, TWILIGHT_STYLES, type TwilightStyle } from "./DuskSky";

// The dusk sky, in one of a few styles (see DuskSky). All of them use the
// glow, middle and edge colours; the radial glow also has its own shape
// controls: a glow low where the sun went down, fading through the middle
// colour to edges already part way to night, shrinking as the sun gets lower.
export type DeskTwilight = {
  style: TwilightStyle;
  glow: string;
  middle: string;
  edge: string;
  towardNight: number;
  reachDay: number;
  reachSunset: number;
  middleStop: number;
  width: number;
  sunX: number;
  sunY: number;
};

export const DEFAULT_DESK_TWILIGHT: DeskTwilight = {
  style: "radial",
  glow: "#f5ede6",
  middle: "#181828",
  edge: "#3b2f6e",
  towardNight: 0.45,
  reachDay: 2.4,
  reachSunset: 0.72,
  middleStop: 0.5,
  width: 1.4,
  sunX: 0.28,
  sunY: 1.08,
};

const STORAGE_KEY = "textfolio:desk-twilight-v1";
const COLORS = [
  { key: "glow", label: "Glow, where the sun set" },
  { key: "middle", label: "Middle" },
  { key: "edge", label: "Edges" },
] as const;

const percent = (n: number) => `${Math.round(n * 100)}%`;
const SLIDERS = [
  { key: "towardNight", label: "Edges already towards night", min: 0, max: 1, step: 0.01, show: percent },
  { key: "reachSunset", label: "Glow size at sunset", min: 0.2, max: 2, step: 0.01, show: percent },
  { key: "reachDay", label: "Glow size earlier in the day", min: 0.5, max: 4, step: 0.05, show: percent },
  { key: "middleStop", label: "Middle colour position", min: 0.1, max: 0.9, step: 0.01, show: percent },
  { key: "width", label: "Glow width", min: 0.6, max: 3, step: 0.05, show: (n: number) => `${n.toFixed(2)}×` },
  { key: "sunX", label: "Sun across", min: -0.2, max: 1.2, step: 0.01, show: percent },
  { key: "sunY", label: "Sun down", min: 0.5, max: 1.4, step: 0.01, show: percent },
] as const;

export function useDeskTwilight() {
  const [twilight, setTwilight] = useState(DEFAULT_DESK_TWILIGHT);
  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "null");
        if (!saved) return;
        const next = { ...DEFAULT_DESK_TWILIGHT };
        const style = TWILIGHT_STYLES.find(({ id }) => id === saved.style);
        if (style) next.style = style.id;
        for (const { key } of COLORS) if (typeof saved[key] === "string" && /^#[0-9a-f]{6}$/i.test(saved[key])) next[key] = saved[key];
        for (const { key, min, max } of SLIDERS) if (Number.isFinite(saved[key])) next[key] = Math.min(max, Math.max(min, saved[key]));
        setTwilight(next);
      } catch { /* Defaults when storage is unavailable. */ }
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);
  const updateTwilight = (next: DeskTwilight) => {
    setTwilight(next);
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch { /* Controls still work for the session. */ }
  };
  return { twilight, updateTwilight };
}

export function DeskTwilightControls({ twilight, onChange, onShowSunset }: { twilight: DeskTwilight; onChange: (next: DeskTwilight) => void; onShowSunset: () => void }) {
  return (
    <fieldset className="mt-5">
      <legend className="mb-3 flex w-full items-center justify-between text-sm font-medium">
        Twilight
        <button type="button" onClick={onShowSunset} className="rounded-full border border-current px-3 py-1 text-xs font-normal">Show sunset</button>
      </legend>
      <div role="radiogroup" aria-label="Twilight style" className="mb-4 flex flex-wrap gap-1.5">
        {TWILIGHT_STYLES.map(({ id, label }) => (
          <button
            key={id}
            type="button"
            role="radio"
            aria-checked={twilight.style === id}
            onClick={() => onChange({ ...twilight, style: id })}
            className="rounded-full border border-ink/30 px-3 py-1 text-xs aria-checked:border-ink aria-checked:bg-ink aria-checked:text-cream"
          >
            {label}
          </button>
        ))}
      </div>
      <p className="mb-2 text-xs opacity-70">Colour combos</p>
      <div className="mb-4 grid grid-cols-2 gap-1.5">
        {TWILIGHT_PALETTES.map((palette) => {
          const selected = COLORS.every(({ key }) => twilight[key].toLowerCase() === palette[key]);
          return (
            <button
              key={palette.name}
              type="button"
              aria-pressed={selected}
              onClick={() => onChange({ ...twilight, glow: palette.glow, middle: palette.middle, edge: palette.edge })}
              className="flex items-center gap-2 rounded-md border border-ink/20 px-2 py-1.5 text-left text-xs aria-pressed:border-ink aria-pressed:bg-ink/10"
            >
              <span className="flex shrink-0 overflow-hidden rounded-sm border border-ink/20">
                {[palette.middle, palette.edge, palette.glow].map((color) => <span key={color} className="h-4 w-2.5" style={{ backgroundColor: color }} />)}
              </span>
              {palette.name}
            </button>
          );
        })}
      </div>
      {COLORS.map(({ key, label }) => (
        <ColorPicker key={key} label={label} value={twilight[key]} onChange={(hex) => onChange({ ...twilight, [key]: hex })} />
      ))}
      {/* The rest shape the radial glow; edges-towards-night applies to every style. */}
      {SLIDERS.filter(({ key }) => twilight.style === "radial" || key === "towardNight").map(({ key, label, min, max, step, show }) => (
        <label key={key} className="mb-3 block text-sm">
          <span className="flex justify-between"><span>{label}</span><span className="tabular-nums">{show(twilight[key])}</span></span>
          <input className="mt-1.5 w-full" type="range" min={min} max={max} step={step} value={twilight[key]} onChange={(event) => onChange({ ...twilight, [key]: Number(event.target.value) })} />
        </label>
      ))}
      <button type="button" className="text-sm underline underline-offset-4" onClick={() => onChange(DEFAULT_DESK_TWILIGHT)}>Reset twilight</button>
    </fieldset>
  );
}
