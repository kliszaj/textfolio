import { DEFAULT_PAPER_TEXTURE_CONFIG } from "./paperTexture";

test("keeps the paper material restrained and its colours usable by the shader", () => {
  expect(DEFAULT_PAPER_TEXTURE_CONFIG.colorBack).toMatch(/^#[0-9A-F]{6}$/i);
  expect(DEFAULT_PAPER_TEXTURE_CONFIG.colorFront).toMatch(/^#[0-9A-F]{6}$/i);
  for (const key of [
    "opacity",
    "contrast",
    "roughness",
    "fiber",
    "fiberSize",
    "crumples",
    "crumpleSize",
    "folds",
    "drops",
    "fade",
  ] as const) {
    expect(DEFAULT_PAPER_TEXTURE_CONFIG[key]).toBeGreaterThanOrEqual(0);
    expect(DEFAULT_PAPER_TEXTURE_CONFIG[key]).toBeLessThanOrEqual(1);
  }
  expect(DEFAULT_PAPER_TEXTURE_CONFIG.foldCount).toBeGreaterThanOrEqual(1);
  expect(DEFAULT_PAPER_TEXTURE_CONFIG.foldCount).toBeLessThanOrEqual(15);
});
