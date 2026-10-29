"use client";

import { useRef, useState } from "react";
import type { PointerEvent } from "react";

// A compact colour picker for the desk settings: a saturation/brightness
// square, a hue strip, a hex field and, where the browser offers one, an
// eyedropper. Opens inline under its swatch so the settings panel can scroll.

type Hsv = { h: number; s: number; v: number };
type EyeDropperResult = { sRGBHex: string };
type EyeDropperWindow = Window & { EyeDropper?: new () => { open: () => Promise<EyeDropperResult> } };

const clamp01 = (n: number) => Math.min(1, Math.max(0, n));

function hexToHsv(hex: string): Hsv {
  const n = parseInt(hex.slice(1), 16);
  const r = ((n >> 16) & 255) / 255, g = ((n >> 8) & 255) / 255, b = (n & 255) / 255;
  const max = Math.max(r, g, b), d = max - Math.min(r, g, b);
  let h = 0;
  if (d) h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return { h: (h * 60 + 360) % 360, s: max ? d / max : 0, v: max };
}

function hsvToHex({ h, s, v }: Hsv) {
  const channel = (n: number) => {
    const k = (n + h / 60) % 6;
    return v - v * s * Math.max(0, Math.min(k, 4 - k, 1));
  };
  return `#${[channel(5), channel(3), channel(1)].map((c) => Math.round(c * 255).toString(16).padStart(2, "0")).join("")}`;
}

const THUMB = "[&::-webkit-slider-thumb]:size-4 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white [&::-webkit-slider-thumb]:bg-transparent [&::-webkit-slider-thumb]:shadow [&::-moz-range-thumb]:size-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-white [&::-moz-range-thumb]:bg-transparent";

export function ColorPicker({ label, value, onChange }: { label: string; value: string; onChange: (hex: string) => void }) {
  const [open, setOpen] = useState(false);
  const [hsv, setHsv] = useState(() => hexToHsv(value));
  const [seen, setSeen] = useState(value);
  const [draft, setDraft] = useState(value);
  const square = useRef<HTMLDivElement>(null);
  const [eyedropper] = useState(() => typeof window !== "undefined" && "EyeDropper" in window);

  // Follow outside changes (a reset) but keep the current hue when the colour
  // is unchanged: greys have no hue of their own to come back to.
  if (value !== seen) {
    setSeen(value);
    setDraft(value);
    if (hsvToHex(hsv) !== value.toLowerCase()) setHsv(hexToHsv(value));
  }

  const commit = (next: Hsv) => {
    const hex = hsvToHex(next);
    setHsv(next);
    setSeen(hex);
    setDraft(hex);
    onChange(hex);
  };

  const pickFromSquare = (event: PointerEvent<HTMLDivElement>) => {
    const box = square.current?.getBoundingClientRect();
    if (!box) return;
    commit({ ...hsv, s: clamp01((event.clientX - box.left) / box.width), v: 1 - clamp01((event.clientY - box.top) / box.height) });
  };

  const typeHex = (text: string) => {
    setDraft(text);
    const hex = (text.trim().startsWith("#") ? text.trim() : `#${text.trim()}`).toLowerCase();
    if (/^#[0-9a-f]{6}$/.test(hex)) commit(hexToHsv(hex));
  };

  const sampleScreen = async () => {
    const Dropper = (window as EyeDropperWindow).EyeDropper;
    if (!Dropper) return;
    try {
      const { sRGBHex } = await new Dropper().open();
      commit(hexToHsv(sRGBHex.toLowerCase()));
    } catch { /* Cancelled. */ }
  };

  return (
    <div className="mb-3 text-sm">
      <button type="button" aria-expanded={open} onClick={() => setOpen(!open)} className="flex w-full cursor-pointer items-center justify-between gap-3 text-left">
        <span>{label}</span>
        <span className="flex items-center gap-2">
          <span className="font-mono text-xs uppercase opacity-70">{value}</span>
          <span className="size-7 rounded-md border border-ink/20" style={{ backgroundColor: value }} />
        </span>
      </button>
      {open && (
        <div className="mt-2 flex flex-col gap-2.5">
          <div
            ref={square}
            // Pointer-only; the hex field below is the keyboard route.
            aria-hidden="true"
            onPointerDown={(event) => {
              event.currentTarget.setPointerCapture(event.pointerId);
              pickFromSquare(event);
            }}
            onPointerMove={(event) => {
              if (event.buttons) pickFromSquare(event);
            }}
            className="relative h-32 cursor-crosshair touch-none rounded-md"
            style={{
              backgroundColor: `hsl(${hsv.h} 100% 50%)`,
              backgroundImage: "linear-gradient(to top, #000, transparent), linear-gradient(to right, #fff, transparent)",
            }}
          >
            <span
              className="pointer-events-none absolute size-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow"
              style={{ left: `${hsv.s * 100}%`, top: `${(1 - hsv.v) * 100}%`, backgroundColor: value }}
            />
          </div>
          <input
            type="range"
            min={0}
            max={360}
            value={Math.round(hsv.h)}
            aria-label={`${label}: hue`}
            onChange={(event) => commit({ ...hsv, h: Number(event.target.value) })}
            className={`h-3 w-full cursor-pointer appearance-none rounded-full ${THUMB}`}
            style={{ background: "linear-gradient(to right, #f00, #ff0, #0f0, #0ff, #00f, #f0f, #f00)" }}
          />
          <div className="flex items-center gap-2">
            <input
              value={draft}
              aria-label={`${label}: hex`}
              spellCheck={false}
              onChange={(event) => typeHex(event.target.value)}
              onBlur={() => setDraft(value)}
              className="w-24 rounded border border-ink/20 bg-transparent px-2 py-1 font-mono text-xs uppercase"
            />
            {eyedropper && (
              <button type="button" onClick={sampleScreen} className="rounded border border-ink/20 px-2 py-1 text-xs">
                Pick from screen
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
