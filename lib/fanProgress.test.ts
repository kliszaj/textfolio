import {
  computeCursorTravel,
  computeScrollTravel,
  splitTravel,
  travelAfterWheel,
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

describe("travelAfterWheel", () => {
  test("scrolling down opens the stack, scrolling up closes it", () => {
    expect(travelAfterWheel(0.4, 350, 700)).toBeCloseTo(0.9);
    expect(travelAfterWheel(0.4, -350, 700)).toBeCloseTo(-0.1 + 0.1);
    expect(travelAfterWheel(0.9, -350, 700)).toBeCloseTo(0.4);
  });

  test("cannot be scrolled past either end of the gesture", () => {
    expect(travelAfterWheel(0.9, 5000, 700)).toBe(1);
    expect(travelAfterWheel(0.1, -5000, 700)).toBe(0);
  });

  test("a full range of scrolling covers the whole gesture", () => {
    expect(travelAfterWheel(0, 700, 700)).toBe(1);
  });

  test("survives a nonsense delta or range rather than stranding the stack", () => {
    expect(travelAfterWheel(0.5, NaN, 700)).toBe(0.5);
    expect(travelAfterWheel(0.5, 100, 0)).toBe(0.5);
    expect(travelAfterWheel(0.5, 100, -1)).toBe(0.5);
  });
});
