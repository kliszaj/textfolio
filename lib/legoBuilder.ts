import {
  LEGO_BACKGROUND_TILE_PATH,
  LEGO_TILE_ASSET_PATHS,
} from "./legoText";

export const LEGO_BUILDER_STORAGE_KEY = "textfolio:lego-builder-v1";
export const LEGO_LAYOUT_STORAGE_KEY = "textfolio:lego-layout-v1";

export type LegoCellValue = string | null;

export type LegoBuilderPreferences = {
  version: 1;
  backgroundTilePath: string;
  showDefaultText: boolean;
  cells: Record<string, LegoCellValue>;
};

export type LegoTileOption = {
  name: string;
  path: string;
  swatch: string;
};

const TILE_NAMES = [
  "Black",
  "Charcoal",
  "Gray",
  "Light gray",
  "White",
  "Brown",
  "Sand",
  "Caramel",
  "Orange",
  "Cream",
  "Yellow",
  "Green",
  "Lime",
  "Teal",
  "Mint",
  "Blue",
  "Sky blue",
  "Ice blue",
  "Purple",
  "Magenta",
  "Pink",
  "Blush",
  "Dark red",
  "Red",
] as const;

const TILE_SWATCHES = [
  "#292929",
  "#6B6B6B",
  "#A0A0A0",
  "#D6D6D6",
  "#FFFFFF",
  "#5A3626",
  "#BCAB77",
  "#9B551E",
  "#FF8915",
  "#FFD79F",
  "#FFD60B",
  "#008E2E",
  "#B0D81A",
  "#06A8AA",
  "#A7E5DA",
  "#2060B4",
  "#4BA6D0",
  "#B7E8FF",
  "#6E218A",
  "#E139A8",
  "#FF8EBD",
  "#FFDADD",
  "#7A0013",
  "#C00000",
] as const;

export const LEGO_TILE_OPTIONS: readonly LegoTileOption[] = LEGO_TILE_ASSET_PATHS.map(
  (path, index) => ({
    name: TILE_NAMES[index],
    path,
    swatch: TILE_SWATCHES[index],
  })
);

export const DEFAULT_LEGO_BUILDER_PREFERENCES: LegoBuilderPreferences = {
  version: 1,
  backgroundTilePath: LEGO_BACKGROUND_TILE_PATH,
  showDefaultText: true,
  cells: {},
};

const VALID_TILE_PATHS = new Set<string>(LEGO_TILE_ASSET_PATHS);
const CELL_KEY_PATTERN = /^-?\d+:-?\d+$/;

export function legoTileOptionForPath(path: string): LegoTileOption {
  return LEGO_TILE_OPTIONS.find((option) => option.path === path)
    ?? LEGO_TILE_OPTIONS[LEGO_TILE_OPTIONS.length - 1];
}

export function sanitizeLegoBuilderPreferences(value: unknown): LegoBuilderPreferences {
  if (!value || typeof value !== "object") return DEFAULT_LEGO_BUILDER_PREFERENCES;
  const candidate = value as {
    backgroundTilePath?: unknown;
    showDefaultText?: unknown;
    cells?: unknown;
  };
  const backgroundTilePath =
    typeof candidate.backgroundTilePath === "string"
    && VALID_TILE_PATHS.has(candidate.backgroundTilePath)
      ? candidate.backgroundTilePath
      : DEFAULT_LEGO_BUILDER_PREFERENCES.backgroundTilePath;
  const cells: Record<string, LegoCellValue> = {};
  if (candidate.cells && typeof candidate.cells === "object" && !Array.isArray(candidate.cells)) {
    Object.entries(candidate.cells).forEach(([cell, tile]) => {
      if (!CELL_KEY_PATTERN.test(cell)) return;
      if (tile === null || (typeof tile === "string" && VALID_TILE_PATHS.has(tile))) {
        cells[cell] = tile;
      }
    });
  }
  return {
    version: 1,
    backgroundTilePath,
    showDefaultText: candidate.showDefaultText !== false,
    cells,
  };
}

export function parseLegoBuilderPreferences(serialized: string | null): LegoBuilderPreferences {
  if (!serialized) return DEFAULT_LEGO_BUILDER_PREFERENCES;
  try {
    return sanitizeLegoBuilderPreferences(JSON.parse(serialized));
  } catch {
    return DEFAULT_LEGO_BUILDER_PREFERENCES;
  }
}
