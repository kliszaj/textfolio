import {
  computeCursorTravel,
  computeScrollTravel,
  splitTravel,
  combineTravel,
  travelForDepth,
  FAN_THRESHOLD_PX,
} from "./fanProgress";

describe("computeCursorTravel", () => {
  test("returns 0 when far from the bottom edge", () => {
    expect(computeCursorTravel(0, 800)).toBe(0);
  });

  test("returns 1 when the cursor is at the very bottom", () => {
    expect(computeCursorTravel(800, 800)).toBe(1);
  });

  test("returns a mid value within the threshold band", () => {
    const mouseY = 800 - FAN_THRESHOLD_PX / 2;
    expect(computeCursorTravel(mouseY, 800)).toBeCloseTo(0.5);
  });

  test("honors a custom threshold override", () => {
    expect(computeCursorTravel(800, 800, 100)).toBe(1);
    expect(computeCursorTravel(750, 800, 100)).toBeCloseTo(0.5);
  });
});

describe("computeScrollTravel", () => {
  test("returns 0 at scrollY 0", () => {
    expect(computeScrollTravel(0, 800)).toBe(0);
  });

  test("returns 1 at max scroll", () => {
    expect(computeScrollTravel(800, 800)).toBe(1);
  });

  test("returns 0 when scrollableHeight is 0 (no scroll possible)", () => {
    expect(computeScrollTravel(0, 0)).toBe(0);
  });
});

describe("splitTravel", () => {
  test("the fan phase owns the travel below the split", () => {
    expect(splitTravel(0, 0.45)).toEqual({ fanProgress: 0, sweepProgress: 0 });
    const half = splitTravel(0.225, 0.45);
    expect(half.fanProgress).toBeCloseTo(0.5);
    expect(half.sweepProgress).toBe(0);
  });

  test("at the split the fan is fully open and the sweep has not started", () => {
    const atSplit = splitTravel(0.45, 0.45);
    expect(atSplit.fanProgress).toBe(1);
    expect(atSplit.sweepProgress).toBe(0);
  });

  test("the sweep phase owns the travel above the split, fan staying open", () => {
    const mid = splitTravel(0.725, 0.45);
    expect(mid.fanProgress).toBe(1);
    expect(mid.sweepProgress).toBeCloseTo(0.5);
  });

  test("both phases are complete at the end of the travel", () => {
    expect(splitTravel(1, 0.45)).toEqual({ fanProgress: 1, sweepProgress: 1 });
  });

  test("clamps travel outside 0-1 at both ends", () => {
    expect(splitTravel(-0.5, 0.45)).toEqual({ fanProgress: 0, sweepProgress: 0 });
    expect(splitTravel(2, 0.45)).toEqual({ fanProgress: 1, sweepProgress: 1 });
  });

  test("a split of 0 skips the fan phase entirely", () => {
    expect(splitTravel(0, 0)).toEqual({ fanProgress: 1, sweepProgress: 0 });
    expect(splitTravel(0.5, 0)).toEqual({ fanProgress: 1, sweepProgress: 0.5 });
  });

  test("a split of 1 leaves no room for the sweep", () => {
    const atEnd = splitTravel(1, 1);
    expect(atEnd.fanProgress).toBe(1);
    expect(atEnd.sweepProgress).toBe(0);
  });
});

describe("combineTravel", () => {
  test("round-trips with splitTravel across the fan phase", () => {
    const { fanProgress, sweepProgress } = splitTravel(0.2, 0.45);
    expect(combineTravel(fanProgress, sweepProgress, 0.45)).toBeCloseTo(0.2);
  });

  test("round-trips with splitTravel across the sweep phase", () => {
    const { fanProgress, sweepProgress } = splitTravel(0.8, 0.45);
    expect(combineTravel(fanProgress, sweepProgress, 0.45)).toBeCloseTo(0.8);
  });

  test("round-trips exactly at the split", () => {
    const { fanProgress, sweepProgress } = splitTravel(0.45, 0.45);
    expect(combineTravel(fanProgress, sweepProgress, 0.45)).toBeCloseTo(0.45);
  });

  test("handles a fanSplit of 0 -- sweepProgress alone carries the travel", () => {
    const { fanProgress, sweepProgress } = splitTravel(0.5, 0);
    expect(combineTravel(fanProgress, sweepProgress, 0)).toBeCloseTo(0.5);
  });

  test("handles a fanSplit of 1 -- fanProgress alone carries the travel", () => {
    const { fanProgress, sweepProgress } = splitTravel(0.5, 1);
    expect(combineTravel(fanProgress, sweepProgress, 1)).toBeCloseTo(0.5);
  });

  test("a fully closed stack combines back to 0", () => {
    expect(combineTravel(0, 0, 0.45)).toBe(0);
  });
});

describe("travelForDepth", () => {
  test("the first case study's peak lands right at the fan/sweep split", () => {
    expect(travelForDepth(1, 6, 0.45)).toBeCloseTo(0.45);
  });

  test("the last case study's peak lands at full travel", () => {
    expect(travelForDepth(6, 6, 0.45)).toBeCloseTo(1);
  });

  test("a middle depth lands proportionally between the split and full travel", () => {
    // depth 3 of 6: sweepProgress = (3-1)/(6-1) = 0.4
    expect(travelForDepth(3, 6, 0.45)).toBeCloseTo(0.45 + 0.4 * 0.55);
  });

  test("falls back to a fully-fanned travel when there is only one sheet", () => {
    expect(travelForDepth(1, 1, 0.45)).toBe(0.45);
  });
});
