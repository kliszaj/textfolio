export const LEGO_TEXT_PALETTE = [
  "#FFD60B", // yellow face
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
  LEGO_TILE_ASSET_PATHS[10],
] as const;
export const LEGO_TEXT_EXTRUSION_TILE_PATH = LEGO_TILE_ASSET_PATHS[15];
export const LEGO_BACKGROUND_TILE_PATH = LEGO_TILE_ASSET_PATHS[19];
export const LEGO_TEXT_SHADOW_COLOR = "#000000";
export const LEGO_TEXT_SHADOW_OPACITY = 0.25;
export const DEFAULT_LEGO_SHADOW_OFFSET_X = 3;
export const DEFAULT_LEGO_SHADOW_OFFSET_Y = 3;
export const LEGO_CANONICAL_COLUMNS = 56;
export const LEGO_CANONICAL_ROWS = 16;
export const LEGO_CANONICAL_STUD_SIZE = 18;

export function legoStudSizeForWidth(width: number): number {
  if (!Number.isFinite(width) || width <= 0) return LEGO_CANONICAL_STUD_SIZE;
  // The authored 56-column silhouette never changes. Narrow screens scale
  // the complete brick composition instead of resampling the font into a new
  // arrangement, which keeps every counter and letter gap stable.
  return Math.min(LEGO_CANONICAL_STUD_SIZE, width / LEGO_CANONICAL_COLUMNS);
}

export function legoBackgroundPosition(
  x: number,
  y: number,
  liftPercent: number
): string {
  return `${x}px calc(${y}px - ${liftPercent}vh)`;
}

export function legoShadowOffsetFromLight(
  lightX: number,
  lightY: number,
  centerX: number,
  centerY: number,
  radiusX: number,
  radiusY: number,
  maximumOffset = 4
): { x: number; y: number } {
  const safeMaximum = Number.isFinite(maximumOffset)
    ? Math.max(0, Math.round(Math.abs(maximumOffset)))
    : 0;
  const normalized = (value: number, center: number, radius: number) => {
    if (!Number.isFinite(value) || !Number.isFinite(center) || !Number.isFinite(radius) || radius <= 0) {
      return 0;
    }
    return Math.max(-1, Math.min(1, (value - center) / radius));
  };

  // A shadow travels away from its light source. Keep both axes snapped to
  // whole studs so the extrusion can never drift off the LEGO grid.
  const snap = (value: number) => {
    const offset = Math.round(-value * safeMaximum);
    return Object.is(offset, -0) ? 0 : offset;
  };
  return {
    x: snap(normalized(lightX, centerX, radiusX)),
    y: snap(normalized(lightY, centerY, radiusY)),
  };
}

export function legoCellKey(column: number, row: number): string {
  return `${column}:${row}`;
}

// Project a face through whole grid cells so its dimensional side can never
// drift between studs. Intermediate cells fill the extrusion continuously;
// face cells win when silhouettes overlap.
export function legoExtrusionCells(
  faceCells: Iterable<string>,
  offsetColumns: number,
  offsetRows: number
): Set<string> {
  const face = new Set(faceCells);
  const extrusion = new Set<string>();
  const columnOffset = Number.isFinite(offsetColumns) ? Math.round(offsetColumns) : 0;
  const rowOffset = Number.isFinite(offsetRows) ? Math.round(offsetRows) : 0;
  const depth = Math.max(Math.abs(columnOffset), Math.abs(rowOffset));
  if (depth === 0) return extrusion;

  face.forEach((cell) => {
    const match = /^(-?\d+):(-?\d+)$/.exec(cell);
    if (!match) return;
    const column = Number(match[1]);
    const row = Number(match[2]);
    for (let step = 1; step <= depth; step += 1) {
      const projected = legoCellKey(
        column + Math.round((columnOffset * step) / depth),
        row + Math.round((rowOffset * step) / depth)
      );
      if (!face.has(projected)) extrusion.add(projected);
    }
  });
  return extrusion;
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

// A single deterministic contour threshold replaces the previous hashed edge
// stipple. Partially covered cells either belong to the silhouette or do not;
// resizing can no longer scatter them into a different arrangement.
export function legoCellIsFilled(coverage: number, column: number, row: number): boolean {
  void column;
  void row;
  return Number.isFinite(coverage) && coverage >= 0.5;
}
