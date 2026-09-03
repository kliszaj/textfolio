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

function wheelDown() {
  act(() => {
    window.dispatchEvent(new WheelEvent("wheel", { deltaY: 1, cancelable: true }));
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

describe("a wheel notch gives the cursor a floor, not a competing driver", () => {
  // The cursor already opens further on down and closes on up -- that stays
  // completely unchanged. The wheel's only job is to kick the reveal open to
  // "the first card" without making the cursor travel there first, and to
  // survive the incidental mousemove that almost always follows a wheel
  // notch (the visitor's hand is on the wheel, not deliberately steering the
  // cursor at that instant).
  beforeEach(() => {
    jest.useFakeTimers();
    mockUsePointerType.mockReturnValue("fine");
    setViewportHeight(800);
  });
  afterEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  test("scrolling down from closed reveals the first card, no cursor movement needed", () => {
    const { result } = render();
    wheelDown();
    settle();
    expect(result.current.fanProgress).toBeCloseTo(1);
    expect(result.current.sweepProgress).toBe(0);
  });

  test("prevents the page from actually scrolling when it acts on the notch", () => {
    render();
    let event!: WheelEvent;
    act(() => {
      event = new WheelEvent("wheel", { deltaY: 1, cancelable: true });
      window.dispatchEvent(event);
    });
    expect(event.defaultPrevented).toBe(true);
  });

  test("an incidental cursor position right after the notch does not undo it", () => {
    const { result } = render();
    wheelDown();
    settle();
    // No prior mousemove to compare against -- exactly the situation a real
    // visitor is in immediately after using a wheel, not a mouse.
    moveTo(0);
    settle();
    expect(result.current.fanProgress).toBeCloseTo(1);
  });

  test("moving the cursor up afterward still closes it -- the floor is not a lock", () => {
    const { result } = render();
    wheelDown();
    settle();
    moveTo(400); // establishes a baseline position to move "up" from
    settle();
    moveTo(100); // a real upward move
    settle();
    expect(result.current.fanProgress).toBeLessThan(1);
  });

  test("moving the cursor down keeps opening further, same as without the wheel", () => {
    const { result } = render();
    wheelDown();
    settle();
    moveTo(800);
    settle();
    expect(result.current).toEqual({ fanProgress: 1, sweepProgress: 1 });
  });

  test("does nothing once the cursor has already opened past the first card", () => {
    const { result } = render();
    moveTo(800);
    settle();
    wheelDown();
    settle();
    expect(result.current).toEqual({ fanProgress: 1, sweepProgress: 1 });
  });

  test("scrolling up does nothing -- only a deliberate scroll down kicks it", () => {
    const { result } = render();
    act(() => {
      window.dispatchEvent(new WheelEvent("wheel", { deltaY: -1 }));
    });
    settle();
    expect(result.current).toEqual({ fanProgress: 0, sweepProgress: 0 });
  });
});
