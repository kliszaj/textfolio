"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { showLocalTools } from "@/lib/localTools";

// A localhost-only panel for the case-study header's knobs (globals.css, top
// of :root): tune them on real pages -- the desk's monitor copy follows, as
// it shares this browser's storage -- then copy the CSS it prints into
// globals.css. Visitors never see it.

export type HeaderTuning = { heightVh: number; ratio: number; maxRem: number };

const STORAGE_KEY = "textfolio:case-study-header-v1";
const VARS = {
  heightVh: "--case-study-header-height",
  ratio: "--case-study-title-ratio",
  maxRem: "--case-study-title-max",
} as const;
const SLIDERS: { key: keyof HeaderTuning; label: string; min: number; max: number; step: number; unit: string }[] = [
  { key: "heightVh", label: "Header height", min: 14, max: 45, step: 1, unit: "vh" },
  { key: "ratio", label: "Title × standfirst", min: 1.5, max: 3.5, step: 0.1, unit: "×" },
  { key: "maxRem", label: "Title at most", min: 4, max: 10, step: 0.25, unit: "rem" },
];

export function tuningCss(tuning: HeaderTuning) {
  return [
    `  ${VARS.heightVh}: ${tuning.heightVh}vh;`,
    `  ${VARS.ratio}: ${tuning.ratio};`,
    `  ${VARS.maxRem}: ${tuning.maxRem}rem;`,
  ].join("\n");
}

// The values globals.css sets, read back so the sliders start from them and
// nothing here repeats them.
function cssDefaults(): HeaderTuning {
  const root = getComputedStyle(document.documentElement);
  const read = (name: string) => parseFloat(root.getPropertyValue(name));
  return { heightVh: read(VARS.heightVh), ratio: read(VARS.ratio), maxRem: read(VARS.maxRem) };
}

function savedTuning(): HeaderTuning | null {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "null");
    if (saved && Object.keys(VARS).every((key) => typeof saved[key] === "number")) return saved;
  } catch { /* No storage: the CSS values stand. */ }
  return null;
}

function apply(tuning: HeaderTuning | null) {
  const style = document.documentElement.style;
  for (const key of Object.keys(VARS) as (keyof HeaderTuning)[]) {
    if (!tuning) style.removeProperty(VARS[key]);
    else style.setProperty(VARS[key], key === "heightVh" ? `${tuning[key]}vh` : key === "maxRem" ? `${tuning[key]}rem` : String(tuning[key]));
  }
}

const noSubscription = () => () => {};
const isLocal = () => showLocalTools();
const isLocalOnServer = () => false;
const isEmbedded = () => document.documentElement.dataset.embedded === "1";

export function CaseStudyTuning() {
  const local = useSyncExternalStore(noSubscription, isLocal, isLocalOnServer);
  const embedded = useSyncExternalStore(noSubscription, isEmbedded, isLocalOnServer);
  // null: no override, the CSS values stand.
  const [tuning, setTuning] = useState<HeaderTuning | null>(() => (typeof window === "undefined" ? null : savedTuning()));
  const [open, setOpen] = useState(false);
  const [titlePx, setTitlePx] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!local) return;
    apply(tuning);
    try {
      if (tuning) localStorage.setItem(STORAGE_KEY, JSON.stringify(tuning));
      else localStorage.removeItem(STORAGE_KEY);
    } catch { /* Keep the panel usable without storage. */ }
  }, [local, tuning]);

  if (!local || embedded) return null;

  const shown = tuning ?? cssDefaults();
  const measure = () => {
    const title = document.querySelector(".case-study-title");
    setTitlePx(title ? Math.round(parseFloat(getComputedStyle(title).fontSize)) : null);
  };
  const update = (key: keyof HeaderTuning, value: number) => {
    setTuning({ ...shown, [key]: value });
    setCopied(false);
    requestAnimationFrame(measure);
  };

  return (
    <div className="fixed bottom-4 left-4 z-50 font-body text-sm text-ink">
      {open && (
        <div className="mb-3 w-72 rounded-lg bg-cream p-4 shadow-lg ring-1 ring-ink/10">
          <p className="mb-3 font-bold">Case-study header</p>
          {SLIDERS.map(({ key, label, min, max, step, unit }) => (
            <label key={key} className="mb-3 block">
              <span className="flex justify-between">
                <span>{label}</span>
                <span className="tabular-nums">{shown[key]}{unit}</span>
              </span>
              <input
                type="range"
                className="w-full"
                min={min}
                max={max}
                step={step}
                value={shown[key]}
                onChange={(event) => update(key, Number(event.target.value))}
              />
            </label>
          ))}
          <p className="mb-3 opacity-60">Title here: {titlePx ?? "–"}px</p>
          <div className="flex gap-3">
            <button
              type="button"
              className="cursor-pointer underline underline-offset-4"
              onClick={() => {
                navigator.clipboard?.writeText(tuningCss(shown)).then(() => setCopied(true), () => {});
              }}
            >
              {copied ? "Copied" : "Copy CSS"}
            </button>
            <button
              type="button"
              className="cursor-pointer underline underline-offset-4"
              onClick={() => {
                setTuning(null);
                setCopied(false);
                requestAnimationFrame(measure);
              }}
            >
              Reset
            </button>
          </div>
        </div>
      )}
      <button
        type="button"
        aria-expanded={open}
        onClick={() => {
          setOpen((wasOpen) => !wasOpen);
          measure();
        }}
        className="cursor-pointer rounded-full border border-current bg-cream px-4 py-2"
      >
        Header
      </button>
    </div>
  );
}
