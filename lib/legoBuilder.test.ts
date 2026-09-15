import {
  DEFAULT_LEGO_BUILDER_PREFERENCES,
  LEGO_TILE_OPTIONS,
  legoTileOptionForPath,
  parseLegoBuilderPreferences,
  sanitizeLegoBuilderPreferences,
} from "./legoBuilder";

test("offers every supplied LEGO render as a selectable color", () => {
  expect(LEGO_TILE_OPTIONS).toHaveLength(24);
  expect(new Set(LEGO_TILE_OPTIONS.map((option) => option.path)).size).toBe(24);
  expect(legoTileOptionForPath("/assets/lego-blocks/lego-block-16.png").name).toBe("Blue");
});

test("sanitizes saved builder cells and baseplate choices", () => {
  expect(sanitizeLegoBuilderPreferences({
    backgroundTilePath: "/assets/lego-blocks/lego-block-03.png",
    showDefaultText: false,
    cells: {
      "12:8": "/assets/lego-blocks/lego-block-20.png",
      "13:8": null,
      "-2:-3": "/assets/lego-blocks/lego-block-11.png",
      nope: "/assets/lego-blocks/lego-block-01.png",
      "14:8": "/not-a-lego.png",
    },
  })).toEqual({
    version: 1,
    backgroundTilePath: "/assets/lego-blocks/lego-block-03.png",
    faceTilePath: "/assets/lego-blocks/lego-block-11.png",
    extrusionTilePath: "/assets/lego-blocks/lego-block-16.png",
    extrusionOffsetColumns: 3,
    extrusionOffsetRows: 3,
    showDefaultText: false,
    cells: {
      "12:8": "/assets/lego-blocks/lego-block-20.png",
      "13:8": null,
      "-2:-3": "/assets/lego-blocks/lego-block-11.png",
    },
  });
});

test("falls back safely when saved builder data is malformed", () => {
  expect(parseLegoBuilderPreferences("not-json")).toEqual(DEFAULT_LEGO_BUILDER_PREFERENCES);
  expect(parseLegoBuilderPreferences(null)).toEqual(DEFAULT_LEGO_BUILDER_PREFERENCES);
});
