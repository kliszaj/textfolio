import {
  EXIT_PULL_THRESHOLD_PX,
  pullAfterWheel,
  pullOffset,
  pullProgress,
  shouldExit,
} from "./scrollExit";

describe("pullAfterWheel", () => {
  test("gathers pull only while the page is already at the top", () => {
    // Mid-page an upward wheel is ordinary scrolling, not an exit gesture.
    expect(pullAfterWheel(0, -40, false)).toBe(0);
    expect(pullAfterWheel(80, -40, false)).toBe(0);
  });

  test("accumulates upward intent at the top", () => {
    expect(pullAfterWheel(0, -40, true)).toBe(40);
    expect(pullAfterWheel(40, -40, true)).toBe(80);
  });

  test("gives the pull back as soon as the gesture reverses", () => {
    expect(pullAfterWheel(80, 30, true)).toBe(50);
  });

  test("never goes negative, so a downward flick cannot bank credit", () => {
    expect(pullAfterWheel(10, 200, true)).toBe(0);
  });
});

describe("pullOffset", () => {
  test("damps the page's travel so it lags the gesture", () => {
    // Following one-to-one felt loose; the resistance is what makes it read
    // as pulling against the stack.
    expect(pullOffset(100)).toBeLessThan(100);
    expect(pullOffset(100)).toBeGreaterThan(0);
  });

  test("grows with the pull and stays bounded", () => {
    expect(pullOffset(200)).toBeGreaterThan(pullOffset(100));
    expect(pullOffset(100000)).toBeLessThanOrEqual(pullOffset(100001));
    expect(pullOffset(100000)).toBeLessThan(400);
  });

  test("sits still until the gesture starts", () => {
    expect(pullOffset(0)).toBe(0);
  });
});

describe("pullProgress", () => {
  test("reports how close the gesture is to committing", () => {
    expect(pullProgress(0)).toBe(0);
    expect(pullProgress(EXIT_PULL_THRESHOLD_PX / 2)).toBeCloseTo(0.5, 5);
    expect(pullProgress(EXIT_PULL_THRESHOLD_PX)).toBe(1);
    expect(pullProgress(EXIT_PULL_THRESHOLD_PX * 4)).toBe(1);
  });
});

describe("shouldExit", () => {
  test("needs a deliberate pull, not a stray flick", () => {
    expect(shouldExit(20)).toBe(false);
    expect(shouldExit(EXIT_PULL_THRESHOLD_PX - 1)).toBe(false);
    expect(shouldExit(EXIT_PULL_THRESHOLD_PX)).toBe(true);
  });

  test("asks for enough travel that rubber-banding cannot trip it", () => {
    expect(EXIT_PULL_THRESHOLD_PX).toBeGreaterThanOrEqual(120);
  });
});
