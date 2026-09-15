export const LEGO_TEXT_PALETTE = [
  "#006CB6", // blue face
] as const;
export const LEGO_TILE_ASSET_PATHS = [
  "/assets/lego-blocks/lego-block-01.png",
  "/assets/lego-blocks/lego-block-02.png",
  "/assets/lego-blocks/lego-block-03.png",
  "/assets/lego-blocks/lego-block-04.png",
  "/assets/lego-blocks/lego-block-05.png",
  "/assets/lego-blocks/lego-block-06.png",
  "/assets/lego-blocks/lego-block-07.png",
  "/assets/lego-blocks/lego-block-08.png",
  "/assets/lego-blocks/lego-block-09.png",
  "/assets/lego-blocks/lego-block-10.png",
  "/assets/lego-blocks/lego-block-11.png",
  "/assets/lego-blocks/lego-block-12.png",
  "/assets/lego-blocks/lego-block-13.png",
  "/assets/lego-blocks/lego-block-14.png",
  "/assets/lego-blocks/lego-block-15.png",
  "/assets/lego-blocks/lego-block-16.png",
  "/assets/lego-blocks/lego-block-17.png",
  "/assets/lego-blocks/lego-block-18.png",
  "/assets/lego-blocks/lego-block-19.png",
  "/assets/lego-blocks/lego-block-20.png",
  "/assets/lego-blocks/lego-block-21.png",
  "/assets/lego-blocks/lego-block-22.png",
  "/assets/lego-blocks/lego-block-23.png",
  "/assets/lego-blocks/lego-block-24.png",
] as const;

export const LEGO_TILE_ATLAS_PATH = "/assets/lego-blocks/lego-atlas.png";
export const LEGO_TILE_ATLAS_COLUMNS = 6;
export const LEGO_TILE_SOURCE_SIZE = 64;

export function legoTileAtlasRect(path: string): {
  x: number;
  y: number;
  size: number;
} {
  const index = Math.max(0, LEGO_TILE_ASSET_PATHS.indexOf(
    path as (typeof LEGO_TILE_ASSET_PATHS)[number]
  ));
  return {
    x: (index % LEGO_TILE_ATLAS_COLUMNS) * LEGO_TILE_SOURCE_SIZE,
    y: Math.floor(index / LEGO_TILE_ATLAS_COLUMNS) * LEGO_TILE_SOURCE_SIZE,
    size: LEGO_TILE_SOURCE_SIZE,
  };
}

// Like the ASCII treatment, LEGO now uses one dominant face color and a
// contrasting depth color instead of distributing a rainbow across letters.
// Keep the original 24-color catalog above intact so future experiments can
// still swap in any supplied render without adding another loading path.
export const LEGO_TEXT_TILE_PATHS = [
  LEGO_TILE_ASSET_PATHS[15],
] as const;
export const LEGO_BACKGROUND_TILE_PATH = LEGO_TILE_ASSET_PATHS[23];
export const LEGO_TEXT_SHADOW_COLOR = "#000000";
export const LEGO_TEXT_SHADOW_OPACITY = 0.25;
export const DEFAULT_LEGO_SHADOW_OFFSET_X = 3;
export const DEFAULT_LEGO_SHADOW_OFFSET_Y = 3;

function hashCell(column: number, row: number, salt = 0): number {
  const value = Math.sin(column * 12.9898 + row * 78.233 + salt * 37.719) * 43758.5453;
  return value - Math.floor(value);
}

export function legoStudSizeForWidth(width: number): number {
  if (!Number.isFinite(width) || width <= 0) return 16;
  const scale = Math.max(0, Math.min(1, (width - 320) / (1152 - 320)));
  return Math.round(16 + scale * 2);
}

export function legoBackgroundPosition(
  x: number,
  y: number,
  liftPercent: number
): string {
  return `${x}px calc(${y}px - ${liftPercent}vh)`;
}

export function legoCellKey(column: number, row: number): string {
  return `${column}:${row}`;
}

export function legoCellIsVisible(defaultFilled: boolean, toggled: boolean): boolean {
  return defaultFilled !== toggled;
}

export function legoCellAtPoint(
  x: number,
  y: number,
  studSize: number
): string | null {
  if (
    !Number.isFinite(x)
    || !Number.isFinite(y)
    || !Number.isFinite(studSize)
    || x < 0
    || y < 0
    || studSize <= 0
  ) {
    return null;
  }
  return legoCellKey(Math.floor(x / studSize), Math.floor(y / studSize));
}

export function legoCellAtRelativePoint(
  x: number,
  y: number,
  studSize: number
): string | null {
  if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(studSize) || studSize <= 0) {
    return null;
  }
  return legoCellKey(Math.floor(x / studSize), Math.floor(y / studSize));
}

export function legoLetterColorAt(letterIndex: number): string {
  const normalizedIndex = Number.isFinite(letterIndex)
    ? Math.max(0, Math.floor(letterIndex))
    : 0;
  return LEGO_TEXT_PALETTE[normalizedIndex % LEGO_TEXT_PALETTE.length];
}

export function legoLetterTileAt(letterIndex: number): string {
  const normalizedIndex = Number.isFinite(letterIndex)
    ? Math.max(0, Math.floor(letterIndex))
    : 0;
  return LEGO_TEXT_TILE_PATHS[normalizedIndex % LEGO_TEXT_TILE_PATHS.length];
}

export function legoLetterIndexForCoverage(
  coverages: readonly number[],
  fallbackIndex: number
): number {
  let strongestIndex = Math.max(0, Math.floor(fallbackIndex));
  let strongestCoverage = 0;
  coverages.forEach((coverage, index) => {
    if (Number.isFinite(coverage) && coverage > strongestCoverage) {
      strongestCoverage = coverage;
      strongestIndex = index;
    }
  });
  return strongestIndex;
}

// Fully covered cells always become bricks. Along a glyph edge, coverage is
// converted into a stable stipple instead of a hard pixel stair-step.
export function legoCellIsFilled(coverage: number, column: number, row: number): boolean {
  if (!Number.isFinite(coverage) || coverage <= 0.22) return false;
  if (coverage >= 0.72) return true;
  const easedCoverage = Math.max(0, Math.min(1, (coverage - 0.22) / 0.5));
  return hashCell(column, row, 2) < easedCoverage;
}
