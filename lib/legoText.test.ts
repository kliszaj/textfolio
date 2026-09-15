import {
  DEFAULT_LEGO_SHADOW_OFFSET_X,
  DEFAULT_LEGO_SHADOW_OFFSET_Y,
  LEGO_TEXT_PALETTE,
  LEGO_BACKGROUND_TILE_PATH,
  LEGO_TEXT_SHADOW_COLOR,
  LEGO_TEXT_SHADOW_OPACITY,
  LEGO_TEXT_EXTRUSION_TILE_PATH,
  LEGO_TEXT_TILE_PATHS,
  LEGO_TILE_ASSET_PATHS,
  LEGO_TILE_ATLAS_COLUMNS,
  LEGO_TILE_ATLAS_PATH,
  LEGO_TILE_SOURCE_SIZE,
  legoCellAtPoint,
  legoCellAtRelativePoint,
  legoBackgroundPosition,
  legoCellKey,
  legoExtrusionCells,
  legoCellIsFilled,
  legoCellIsVisible,
  legoLetterColorAt,
  legoLetterTileAt,
  legoLetterIndexForCoverage,
  legoShadowOffsetFromLight,
  legoStudSizeForWidth,
  legoTileAtlasRect,
} from "./legoText";

test("keeps the LEGO grid chunky but responsive", () => {
  expect(legoStudSizeForWidth(320)).toBeCloseTo(320 / 56);
  expect(legoStudSizeForWidth(768)).toBeCloseTo(768 / 56);
  expect(legoStudSizeForWidth(1152)).toBe(18);
  expect(legoStudSizeForWidth(1600)).toBe(18);
});

test("keeps the baseplate registered to a headline that lifts during scroll", () => {
  expect(legoBackgroundPosition(24, 180, 12)).toBe("24px calc(180px - 12vh)");
  expect(legoBackgroundPosition(31.5, 96, 0)).toBe("31.5px calc(96px - 0vh)");
});

test("moves a grid-snapped shadow away from the cursor light", () => {
  expect(legoShadowOffsetFromLight(0, 0, 50, 50, 50, 50)).toEqual({ x: 4, y: 4 });
  expect(legoShadowOffsetFromLight(100, 100, 50, 50, 50, 50)).toEqual({ x: -4, y: -4 });
  expect(legoShadowOffsetFromLight(50, 50, 50, 50, 50, 50)).toEqual({ x: 0, y: 0 });
  expect(legoShadowOffsetFromLight(-100, 200, 50, 50, 50, 50, 3)).toEqual({ x: 3, y: -3 });
});

test("uses the supplied 64px PNG renders for every LEGO surface", () => {
  expect(LEGO_TILE_ASSET_PATHS).toHaveLength(24);
  expect(new Set(LEGO_TILE_ASSET_PATHS).size).toBe(24);
  expect(LEGO_TILE_ASSET_PATHS.every((path) => path.endsWith(".png"))).toBe(true);
  expect(LEGO_TEXT_TILE_PATHS).toEqual([
    "/assets/lego-blocks/lego-block-11.png",
  ]);
  expect(LEGO_TEXT_EXTRUSION_TILE_PATH).toBe(
    "/assets/lego-blocks/lego-block-16.png"
  );
  expect(Array.from({ length: 6 }, (_, index) => legoLetterTileAt(index))).toEqual(
    Array(6).fill(LEGO_TEXT_TILE_PATHS[0])
  );
  expect(legoLetterTileAt(6)).toBe(LEGO_TEXT_TILE_PATHS[0]);
  expect(LEGO_BACKGROUND_TILE_PATH).toBe("/assets/lego-blocks/lego-block-20.png");
});

test("maps every supplied block into the shared six-column atlas", () => {
  expect(LEGO_TILE_ATLAS_PATH).toBe("/assets/lego-blocks/lego-atlas.png");
  expect(LEGO_TILE_ATLAS_COLUMNS).toBe(6);
  expect(LEGO_TILE_SOURCE_SIZE).toBe(64);
  expect(legoTileAtlasRect(LEGO_TILE_ASSET_PATHS[0])).toEqual({ x: 0, y: 0, size: 64 });
  expect(legoTileAtlasRect(LEGO_TILE_ASSET_PATHS[6])).toEqual({ x: 0, y: 64, size: 64 });
  expect(legoTileAtlasRect(LEGO_TILE_ASSET_PATHS[23])).toEqual({ x: 320, y: 192, size: 64 });
});

test("addresses each removable brick by its grid position", () => {
  expect(legoCellKey(12, 8)).toBe("12:8");
  expect(legoCellAtPoint(204, 139, 17)).toBe("12:8");
  expect(legoCellAtPoint(203.99, 135.99, 17)).toBe("11:7");
  expect(legoCellAtPoint(-1, 10, 17)).toBeNull();
  expect(legoCellAtPoint(10, 10, 0)).toBeNull();
});

test("addresses editable cells outside the word frame with relative coordinates", () => {
  expect(legoCellAtRelativePoint(-1, 10, 18)).toBe("-1:0");
  expect(legoCellAtRelativePoint(18, -1, 18)).toBe("1:-1");
  expect(legoCellAtRelativePoint(10, 10, 0)).toBeNull();
});

test("uses one toggle to remove a word tile or add a tile to an empty cell", () => {
  expect(legoCellIsVisible(true, false)).toBe(true);
  expect(legoCellIsVisible(true, true)).toBe(false);
  expect(legoCellIsVisible(false, false)).toBe(false);
  expect(legoCellIsVisible(false, true)).toBe(true);
});

test("uses a yellow default face and leaves accent blocks to the builder", () => {
  expect(LEGO_TEXT_PALETTE).toEqual(["#FFD60B"]);
  expect(Array.from({ length: 6 }, (_, index) => legoLetterColorAt(index))).toEqual(
    Array(6).fill(LEGO_TEXT_PALETTE[0])
  );
  expect(legoLetterColorAt(6)).toBe(LEGO_TEXT_PALETTE[0]);
  expect(LEGO_TEXT_SHADOW_COLOR).toBe("#000000");
  expect(LEGO_TEXT_SHADOW_OPACITY).toBe(0.25);
  expect(LEGO_TEXT_PALETTE).not.toContain(LEGO_TEXT_SHADOW_COLOR);
  expect(DEFAULT_LEGO_SHADOW_OFFSET_X).toBe(3);
  expect(DEFAULT_LEGO_SHADOW_OFFSET_Y).toBe(3);
});

test("builds a continuous down-right extrusion on exact grid cells", () => {
  expect(Array.from(legoExtrusionCells(["1:1"], 3, 3))).toEqual([
    "2:2",
    "3:3",
    "4:4",
  ]);
  expect(legoExtrusionCells(["1:1", "2:2"], 3, 3)).toEqual(
    new Set(["3:3", "4:4", "5:5"])
  );
  expect(legoExtrusionCells(["1:1"], 0, 0)).toEqual(new Set());
});

test("assigns edge bricks to the glyph that actually covers them", () => {
  expect(legoLetterIndexForCoverage([0, 0.08, 0.62, 0], 1)).toBe(2);
  expect(legoLetterIndexForCoverage([0, 0, 0, 0], 3)).toBe(3);
});

test("uses one deterministic coverage threshold for every glyph edge", () => {
  expect(legoCellIsFilled(1, 2, 3)).toBe(true);
  expect(legoCellIsFilled(0, 2, 3)).toBe(false);
  expect(legoCellIsFilled(0.49, 2, 3)).toBe(false);
  expect(legoCellIsFilled(0.5, 2, 3)).toBe(true);
  expect(legoCellIsFilled(0.5, 2, 3)).toBe(true);
  expect(legoCellIsFilled(0.5, 2, 3)).toBe(legoCellIsFilled(0.5, 99, 42));
});
