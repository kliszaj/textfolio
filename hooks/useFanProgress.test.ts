import { renderHook, act } from "@testing-library/react";
import { useFanProgress } from "./useFanProgress";
import { usePointerType } from "./usePointerType";

jest.mock("./usePointerType");
const mockUsePointerType = usePointerType as jest.Mock;

function setViewportHeight(height: number) {
  Object.defineProperty(window, "innerHeight", { value: height, configurable: true });
}

const SPLIT = 0.45;
const SMOOTHING = 90;

function render() {
  return renderHook(() => useFanProgress(400, SPLIT, SMOOTHING));
}

function moveTo(clientY: number) {
  act(() => {
    window.dispatchEvent(new MouseEvent("mousemove", { clientY }));
  });
}

// Let the animation loop run until the stack has caught up with the cursor.
function settle() {
  act(() => {
    jest.advanceTimersByTime(2000);
  });
}

describe("useFanProgress", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    mockUsePointerType.mockReturnValue("fine");
    setViewportHeight(800);
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  test("fine pointer: starts with the stack closed and the sweep unstarted", () => {
    const { result } = render();
    expect(result.current).toEqual({ fanProgress: 0, sweepProgress: 0 });
  });

  test("fine pointer: settles at the split point with the fan open, sweep unstarted", () => {
    const { result } = render();
    moveTo(800 - 400 * (1 - SPLIT));
    settle();
    expect(result.current.fanProgress).toBeCloseTo(1);
    expect(result.current.sweepProgress).toBeCloseTo(0);
  });

  test("fine pointer: reaching the bottom edge completes both phases", () => {
    const { result } = render();
    moveTo(800);
    settle();
    expect(result.current).toEqual({ fanProgress: 1, sweepProgress: 1 });
  });

  test("fine pointer: mouse leaving the document eases both phases back to rest", () => {
    const { result } = render();
    moveTo(800);
    settle();
    expect(result.current.sweepProgress).toBe(1);
    act(() => {
      document.documentElement.dispatchEvent(new MouseEvent("mouseleave"));
    });
    settle();
    expect(result.current).toEqual({ fanProgress: 0, sweepProgress: 0 });
  });

  test("coarse pointer: scroll position drives both phases through the same split", () => {
    mockUsePointerType.mockReturnValue("coarse");
    Object.defineProperty(document.documentElement, "scrollHeight", {
      value: 1600,
      configurable: true,
    });
    Object.defineProperty(window, "scrollY", { value: 800, configurable: true });
    const { result } = render();
    settle();
    expect(result.current).toEqual({ fanProgress: 1, sweepProgress: 1 });
  });

  test("eases toward the cursor rather than snapping to it", () => {
    const { result } = render();
    moveTo(800);
    act(() => {
      jest.advanceTimersByTime(16);
    });
    const afterOneFrame = result.current.fanProgress;
    expect(afterOneFrame).toBeGreaterThan(0);
    expect(afterOneFrame).toBeLessThan(1);
    settle();
    expect(result.current.fanProgress).toBe(1);
  });

  test("pointer events do not each drive a render", () => {
    // Mice report faster than the screen refreshes. Events only record where
    // the cursor is; the animation loop decides when the stack re-renders.
    const { result } = render();
    for (let i = 0; i < 12; i++) moveTo(800 - i);
    expect(result.current).toEqual({ fanProgress: 0, sweepProgress: 0 });
    settle();
    expect(result.current.fanProgress).toBeGreaterThan(0);
  });
});

// Parked alongside the wheel handler in useFanProgress. Unskip when the
// scroll gesture is brought back.
describe.skip("scrolling with a mouse", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    mockUsePointerType.mockReturnValue("fine");
    setViewportHeight(800);
  });
  afterEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  function wheel(deltaY: number) {
    act(() => {
      window.dispatchEvent(new WheelEvent("wheel", { deltaY }));
    });
  }

  test("the wheel opens the stack, the same as walking the cursor down", () => {
    const { result } = render();
    wheel(700);
    settle();
    expect(result.current.fanProgress).toBe(1);
    expect(result.current.sweepProgress).toBe(1);
  });

  test("scrolling back up closes it again", () => {
    const { result } = render();
    wheel(700);
    settle();
    wheel(-700);
    settle();
    expect(result.current.fanProgress).toBe(0);
  });

  test("scrolling accumulates rather than jumping to an absolute position", () => {
    const { result } = render();
    wheel(175);
    settle();
    const quarter = result.current.fanProgress;
    wheel(175);
    settle();
    expect(result.current.fanProgress).toBeGreaterThan(quarter);
  });

  test("a jog of the mouse does not undo a scroll", () => {
    // Otherwise the smallest tremor would snap the stack back to the cursor.
    const { result } = render();
    act(() => {
      window.dispatchEvent(new MouseEvent("mousemove", { clientX: 300, clientY: 400 }));
    });
    wheel(700);
    settle();
    expect(result.current.fanProgress).toBe(1);

    // A few pixels of tremor, well inside the takeover distance.
    act(() => {
      window.dispatchEvent(new MouseEvent("mousemove", { clientX: 304, clientY: 403 }));
    });
    settle();
    expect(result.current.fanProgress).toBe(1);
  });

  test("but genuinely moving the cursor takes the gesture back", () => {
    const { result } = render();
    act(() => {
      window.dispatchEvent(new MouseEvent("mousemove", { clientX: 0, clientY: 400 }));
    });
    wheel(700);
    settle();
    act(() => {
      window.dispatchEvent(new MouseEvent("mousemove", { clientX: 500, clientY: 100 }));
    });
    settle();
    expect(result.current.fanProgress).toBe(0);
  });
});
