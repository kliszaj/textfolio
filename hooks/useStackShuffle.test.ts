import { act, renderHook } from "@testing-library/react";
import {
  STACK_SHUFFLE_HOLD_MS,
  STACK_SHUFFLE_OPEN_MS,
  useStackShuffle,
} from "./useStackShuffle";

let now = 0;
let pending: FrameRequestCallback | null = null;

// Frames are driven by hand rather than by a timer: the hook schedules the
// next frame from inside the current one, so anything self-driving spins
// forever (same reasoning as useStackCollapse.test.ts).
function frame(at: number) {
  now = at;
  const cb = pending;
  pending = null;
  act(() => {
    cb?.(at);
  });
}

beforeEach(() => {
  now = 0;
  pending = null;
  jest.spyOn(performance, "now").mockImplementation(() => now);
  jest.spyOn(window, "requestAnimationFrame").mockImplementation((cb) => {
    pending = cb;
    return 1;
  });
  jest.spyOn(window, "cancelAnimationFrame").mockImplementation(() => {
    pending = null;
  });
});
afterEach(() => jest.restoreAllMocks());

test("sits idle until a shuffle is triggered", () => {
  const { result } = renderHook(() => useStackShuffle(700, 180));
  expect(result.current.travel).toBeNull();
});

test("uses a near-instant reveal before handing off to the page transition", () => {
  const onArrived = jest.fn();
  const { result } = renderHook(() => useStackShuffle());
  act(() => {
    result.current.shuffleTo(0.1, 0.9, onArrived);
  });

  frame(STACK_SHUFFLE_OPEN_MS);
  expect(result.current.travel).toBe(0.9);
  expect(onArrived).not.toHaveBeenCalled();

  frame(STACK_SHUFFLE_OPEN_MS + STACK_SHUFFLE_HOLD_MS);
  expect(onArrived).toHaveBeenCalledTimes(1);
  expect(STACK_SHUFFLE_OPEN_MS).toBe(250);
  expect(STACK_SHUFFLE_HOLD_MS).toBe(400);
  expect(STACK_SHUFFLE_OPEN_MS + STACK_SHUFFLE_HOLD_MS).toBe(650);
});

test("tweens travel from the starting value toward the target", () => {
  const { result } = renderHook(() => useStackShuffle(700, 180));
  act(() => {
    result.current.shuffleTo(0.1, 0.9, jest.fn());
  });

  frame(350); // halfway through the 700ms open
  expect(result.current.travel).toBeGreaterThan(0.1);
  expect(result.current.travel).toBeLessThan(0.9);

  frame(700); // open finished, now holding at the target
  expect(result.current.travel).toBe(0.9);
});

test("holds at the target for holdMs before arriving", () => {
  const onArrived = jest.fn();
  const { result } = renderHook(() => useStackShuffle(700, 180));
  act(() => {
    result.current.shuffleTo(0.1, 0.9, onArrived);
  });

  frame(700);
  expect(onArrived).not.toHaveBeenCalled();

  frame(700 + 179);
  expect(onArrived).not.toHaveBeenCalled();

  frame(700 + 180);
  expect(onArrived).toHaveBeenCalledTimes(1);
  expect(result.current.travel).toBe(0.9);
});

test("ignores a second trigger while a shuffle is already in flight", () => {
  const firstArrived = jest.fn();
  const secondArrived = jest.fn();
  const { result } = renderHook(() => useStackShuffle(700, 180));

  act(() => {
    result.current.shuffleTo(0, 1, firstArrived);
  });
  act(() => {
    result.current.shuffleTo(0, 0.2, secondArrived);
  });

  frame(880);
  expect(firstArrived).toHaveBeenCalledTimes(1);
  expect(secondArrived).not.toHaveBeenCalled();
  // Landed on the first target, not the ignored second one.
  expect(result.current.travel).toBe(1);
});

test("a fresh shuffle can be triggered again once the previous one has arrived", () => {
  const { result } = renderHook(() => useStackShuffle(700, 180));
  act(() => {
    result.current.shuffleTo(0, 0.5, jest.fn());
  });
  frame(880);

  const secondArrived = jest.fn();
  act(() => {
    result.current.shuffleTo(0.5, 0.9, secondArrived);
  });
  frame(880 + 880);
  expect(secondArrived).toHaveBeenCalledTimes(1);
  expect(result.current.travel).toBe(0.9);
});
