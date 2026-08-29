import { computeSheetInset, computeFocusedInset } from "./fanSheet";
import type { FanSheetConfig } from "./fanSheet";

const baseConfig: FanSheetConfig = {
  mechanic: "bottom",
  recedePercents: [12, 8, 4, 0],
  rotateDegrees: [0, -4, -8, -12],
  brightnessFalloff: 0.05,
  focusRevealPercent: 45,
};

describe("computeSheetInset", () => {
  test("fanProgress 0 collapses every sheet flush with no recede or rotation", () => {
    expect(computeSheetInset(0, 0, baseConfig)).toEqual({
      bottom: 0,
      right: 0,
      rotate: 0,
      brightness: 1,
    });
    expect(computeSheetInset(3, 0, baseConfig)).toEqual({
      bottom: 0,
      right: 0,
      rotate: 0,
      brightness: 0.85,
    });
  });

  test("bottom mechanic only recedes vertically", () => {
    const inset = computeSheetInset(0, 1, baseConfig);
    expect(inset.bottom).toBe(12);
    expect(inset.right).toBe(0);
  });

  test("corner mechanic splits the recede across both axes evenly", () => {
    const config: FanSheetConfig = { ...baseConfig, mechanic: "corner" };
    const inset = computeSheetInset(0, 1, config);
    expect(inset.bottom).toBe(6);
    expect(inset.right).toBe(6);
  });

  test("recede scales linearly with fanProgress", () => {
    const inset = computeSheetInset(1, 0.5, baseConfig);
    expect(inset.bottom).toBe(4);
  });

  test("the backmost configured depth stays fully flush regardless of fanProgress", () => {
    const inset = computeSheetInset(3, 1, baseConfig);
    expect(inset.bottom).toBe(0);
  });

  test("brightness dims progressively with depth", () => {
    expect(computeSheetInset(0, 0, baseConfig).brightness).toBe(1);
    expect(computeSheetInset(1, 0, baseConfig).brightness).toBeCloseTo(0.95);
    expect(computeSheetInset(2, 0, baseConfig).brightness).toBeCloseTo(0.9);
  });

  test("rotation scales with depth and fanProgress, tilting deeper sheets further left", () => {
    expect(computeSheetInset(0, 1, baseConfig).rotate).toBe(0);
    expect(computeSheetInset(1, 1, baseConfig).rotate).toBe(-4);
    expect(computeSheetInset(3, 1, baseConfig).rotate).toBe(-12);
    expect(computeSheetInset(3, 0.5, baseConfig).rotate).toBe(-6);
  });
});

describe("computeFocusedInset", () => {
  test("reveals the configured focus percentage, upright and at full brightness", () => {
    expect(computeFocusedInset(baseConfig)).toEqual({
      bottom: 45,
      right: 0,
      rotate: 0,
      brightness: 1,
    });
  });
});
