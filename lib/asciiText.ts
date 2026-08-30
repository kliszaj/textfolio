export type ASCIITextConfig = {
  enableWaves: boolean;
  asciiFontSize: number;
  textFontSize: number;
  planeBaseHeight: number;
  randomizeGlyphColors: boolean;
  randomizeStageColor: boolean;
};

// Glyph colours. The swatches pair a container (the cell behind a glyph) with
// the ink drawn on it: blue on the light containers, lime on the saturated and
// dark ones. Blue carries the treatment; lime is a rare accent, so the blue
// chips are weighted far heavier.
export const ASCII_INK_BLUE = "#3A1AF0";
export const ASCII_INK_LIME = "#C6F03F";

export type AsciiColorChip = {
  foreground: string;
  background: string;
  weight: number;
};

export const ASCII_COLOR_CHIPS: AsciiColorChip[] = [
  { background: "#DDE0DD", foreground: ASCII_INK_BLUE, weight: 20 },
  { background: "#2DF58C", foreground: ASCII_INK_BLUE, weight: 20 },
  { background: "#FF3D1A", foreground: ASCII_INK_BLUE, weight: 20 },
  { background: "#7683AC", foreground: ASCII_INK_LIME, weight: 1 },
  { background: "#D2007E", foreground: ASCII_INK_LIME, weight: 1 },
  { background: "#FF3D1A", foreground: ASCII_INK_LIME, weight: 1 },
  { background: "#6B2244", foreground: ASCII_INK_LIME, weight: 1 },
  { background: "#1E5334", foreground: ASCII_INK_LIME, weight: 1 },
];

const TOTAL_CHIP_WEIGHT = ASCII_COLOR_CHIPS.reduce((sum, chip) => sum + chip.weight, 0);

// Weighted pick from a 0-1 value, so the caller can drive it from whatever
// noise it already has rather than reaching for Math.random per cell.
export function pickAsciiChip(t: number): AsciiColorChip {
  let remaining = Math.min(0.999999, Math.max(0, t)) * TOTAL_CHIP_WEIGHT;
  for (const chip of ASCII_COLOR_CHIPS) {
    remaining -= chip.weight;
    if (remaining < 0) return chip;
  }
  return ASCII_COLOR_CHIPS[0];
}

export const DEFAULT_ASCII_TEXT_CONFIG: ASCIITextConfig = {
  enableWaves: false,
  asciiFontSize: 12,
  textFontSize: 340,
  planeBaseHeight: 13,
  randomizeGlyphColors: true,
  randomizeStageColor: false,
};
