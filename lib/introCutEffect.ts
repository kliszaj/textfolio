// What rides on top of each hard cut between intro stages. The cut itself
// never fades (HEADLINE_HANDOVER_MS is 0) -- these are optional, separate
// transients that fire exactly at the cut instant and clear with no
// transition of their own, so a plain instant cut can read as "glitch"
// instead of just "abrupt". "tear" was prototyped but not built here.
export type IntroCutEffect = "none" | "rgb" | "noise";

export const INTRO_CUT_EFFECTS: IntroCutEffect[] = ["none", "rgb", "noise"];

// How long the chromatic-aberration flash holds before snapping back to
// normal. Short enough to read as a flash, not a fade -- there is no
// transition on the filter itself, only this hard on/off window.
export const INTRO_CUT_RGB_FLASH_MS = 70;

// How long one frame of static stays up. A single visible frame's worth at
// a typical refresh rate, not a sustained overlay.
export const INTRO_CUT_NOISE_BURST_MS = 45;

// Tunable knobs for the rgb-split filter itself (see the feColorMatrix /
// feOffset / feBlend recipe in Hero.tsx). offsetX/offsetY are px: red shifts
// by -offset, blue by +offset, on each axis independently, so offsetY at 0
// is the original pure horizontal split and a nonzero value adds a diagonal
// component. offsetY specifically is only the *magnitude* Hero.tsx alternates
// the sign of on every cut (see alternatingRgbOffsetY below) -- the value
// actually applied to a given cut is rarely this field's own value verbatim.
// durationMs is a per-config override of INTRO_CUT_RGB_FLASH_MS, kept as a
// separate field rather than reusing that constant directly so the two can
// drift once someone actually drags the slider.
export type IntroCutRgbConfig = {
  offsetX: number;
  offsetY: number;
  durationMs: number;
};

export const DEFAULT_INTRO_CUT_RGB_CONFIG: IntroCutRgbConfig = {
  offsetX: 4,
  offsetY: 0,
  durationMs: INTRO_CUT_RGB_FLASH_MS,
};

// A vertical split under this magnitude reads as barely-there rather than
// deliberate -- the alternating Y offset never goes quieter than this,
// regardless of how small the configured offsetY is (0 by default).
export const INTRO_CUT_RGB_MIN_Y_MAGNITUDE = 10;

// Each intro cut alternates the split's vertical component between positive
// and negative, per direct request, rather than holding one fixed value --
// three real cuts in a row (into ascii, into warp, into final) each land on
// a different sign this way, without needing to know which treatment is
// which. `sign` is whatever the caller is alternating between calls (1 or
// -1); this only owns the floor on magnitude.
export function alternatingRgbOffsetY(configuredOffsetY: number, sign: 1 | -1): number {
  return sign * Math.max(INTRO_CUT_RGB_MIN_Y_MAGNITUDE, Math.abs(configuredOffsetY));
}

// The intro only ever plays once per page load (useIntroOnce), so trying an
// effect means picking it, then reloading to watch it -- the picker's own
// selection has to survive that reload itself, via localStorage, or every
// attempt to preview one silently lands back on "none".
export const INTRO_CUT_EFFECT_STORAGE_KEY = "textfolio:intro-cut-effect";
export const INTRO_CUT_RGB_CONFIG_STORAGE_KEY = "textfolio:intro-cut-rgb-config";

export function isIntroCutEffect(value: unknown): value is IntroCutEffect {
  return typeof value === "string" && (INTRO_CUT_EFFECTS as string[]).includes(value);
}

// Merges whatever came back from localStorage onto the defaults field by
// field, rather than trusting or discarding the whole object -- a slider
// dragged since an older build added a field (or a hand-edited value) should
// only lose the one field that's actually bad, not silently reset every
// knob back to default.
export function sanitizeIntroCutRgbConfig(value: unknown): IntroCutRgbConfig {
  const input = (value && typeof value === "object" ? value : {}) as Record<string, unknown>;
  const field = (key: keyof IntroCutRgbConfig): number =>
    typeof input[key] === "number" && Number.isFinite(input[key])
      ? (input[key] as number)
      : DEFAULT_INTRO_CUT_RGB_CONFIG[key];
  return {
    offsetX: field("offsetX"),
    offsetY: field("offsetY"),
    durationMs: field("durationMs"),
  };
}
