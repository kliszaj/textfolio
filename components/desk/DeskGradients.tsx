"use client";

import { useEffect, useState } from "react";

// The morning background gradient. (Twilight has its own radial sky, set in
// DeskTwilight.)
export type GradientOptions = {
  kind: "linear" | "radial"; angle: number; swap: boolean;
  start: number; end: number; x: number; y: number; radius: number;
};
export type DeskGradients = { morning: GradientOptions };
const defaults: GradientOptions = { kind: "linear", angle: 155, swap: false, start: 0, end: 100, x: 50, y: 70, radius: 85 };
export const DEFAULT_GRADIENTS: DeskGradients = { morning: { ...defaults } };
const key = "textfolio:desk-gradients-v1";

export function useDeskGradients() {
  const [gradients, setGradients] = useState(DEFAULT_GRADIENTS);
  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        const value = JSON.parse(localStorage.getItem(key) ?? "null")?.morning;
        if (!value) return;
        const next = { ...defaults };
        next.kind = value.kind === "radial" ? "radial" : "linear";
        next.swap = value.swap === true;
        for (const field of ["angle", "start", "end", "x", "y", "radius"] as const) {
          if (Number.isFinite(value[field])) next[field] = Math.max(field === "radius" ? 10 : 0, Math.min(field === "angle" ? 360 : field === "radius" ? 150 : 100, value[field]));
        }
        next.end = Math.max(next.start, next.end);
        setGradients({ morning: next });
      } catch { /* Fall back to defaults for unavailable or invalid storage. */ }
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);
  const updateGradients = (next: DeskGradients) => {
    setGradients(next);
    try { localStorage.setItem(key, JSON.stringify(next)); } catch { /* Keep live controls usable. */ }
  };
  return { gradients, updateGradients };
}

export function gradientCSS(options: GradientOptions, first: string, second: string) {
  const [a, b] = options.swap ? [second, first] : [first, second];
  const stops = `${a} ${options.start}%, ${b} ${options.end}%`;
  return options.kind === "radial"
    ? `radial-gradient(ellipse ${options.radius}% ${options.radius}% at ${options.x}% ${options.y}%, ${stops})`
    : `linear-gradient(${options.angle}deg, ${stops})`;
}

export function DeskGradientControls({ gradients, onChange }: { gradients: DeskGradients; onChange: (next: DeskGradients) => void }) {
  const value = gradients.morning;
  const update = (patch: Partial<GradientOptions>) => onChange({ morning: { ...value, ...patch } });
  const slider = (field: "angle" | "start" | "end" | "x" | "y" | "radius", label: string, min = 0, max = 100) => <label className="mt-3 block text-sm" key={field}>
    <span className="flex justify-between"><span>{label}</span><span>{value[field]}{field === "angle" ? "°" : "%"}</span></span>
    <input type="range" className="mt-1 w-full" min={min} max={max} value={value[field]} onChange={(event) => update({ [field]: Number(event.target.value) })} />
  </label>;
  return <fieldset className="mt-5 text-sm">
    <legend className="mb-3 font-medium">Morning gradient</legend>
    <label className="block">Gradient type<select className="mt-1 block w-full rounded border p-1" value={value.kind} onChange={(event) => update({ kind: event.target.value as GradientOptions["kind"] })}><option value="linear">Linear</option><option value="radial">Radial</option></select></label>
    <label className="mt-3 flex items-center justify-between">Swap color sides<input type="checkbox" checked={value.swap} onChange={(event) => update({ swap: event.target.checked })} /></label>
    {value.kind === "linear" ? slider("angle", "Direction", 0, 360) : <>{slider("x", "Center X")}{slider("y", "Center Y")}{slider("radius", "Spread", 10, 150)}</>}
    {slider("start", "First color stop", 0, value.end)}
    {slider("end", "Second color stop", value.start, 100)}
    <button className="mt-3 underline underline-offset-4" type="button" onClick={() => onChange(DEFAULT_GRADIENTS)}>Reset morning gradient</button>
  </fieldset>;
}
