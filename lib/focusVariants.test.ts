import { FOCUS_VARIANTS, getFocusVariant } from "./focusVariants";

test("offers five directions to compare", () => {
  expect(FOCUS_VARIANTS).toHaveLength(5);
});

test("every variant is addressable by a unique id", () => {
  const ids = FOCUS_VARIANTS.map((v) => v.id);
  expect(new Set(ids).size).toBe(ids.length);
});

test("every variant carries what the picker needs to describe it", () => {
  for (const variant of FOCUS_VARIANTS) {
    expect(variant.name).not.toHaveLength(0);
    expect(variant.description).not.toHaveLength(0);
    expect(variant.durationMs).toBeGreaterThan(0);
  }
});

test("every variant names the css class that animates it", () => {
  for (const variant of FOCUS_VARIANTS) {
    expect(variant.className).toBe(`focus-enter-${variant.id}`);
  }
});

test("looks a variant up by id", () => {
  expect(getFocusVariant("flood")?.name).toBe("Colour Flood");
});

test("falls back to the first variant for an unknown id", () => {
  expect(getFocusVariant("nonsense")).toBe(FOCUS_VARIANTS[0]);
});
