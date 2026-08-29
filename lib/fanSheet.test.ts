import { computeSheetInset } from "./fanSheet";
import type { FanSheetConfig } from "./fanSheet";

const baseConfig: FanSheetConfig = {
  mechanic: "bottom",
  recedePercents: [12, 8, 4, 0],
  brightnessFalloff: 0.05,
};

describe("computeSheetInset", () => {
  test("fanProgress 0 collapses every sheet flush with no recede", () => {
    expect(computeSheetInset(0, 0, baseConfig)).toEqual({ bottom: 0, right: 0, brightness: 1 });
    expect(computeSheetInset(3, 0, baseConfig)).toEqual({ bottom: 0, right: 0, brightness: 0.85 });
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
});
