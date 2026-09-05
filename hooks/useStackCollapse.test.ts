import { StrictMode } from "react";
import { act, renderHook } from "@testing-library/react";
import {
  markReturningHome,
  resetReturningHomeForTests,
  useStackCollapse,
} from "./useStackCollapse";

let now = 0;
let pending: FrameRequestCallback | null = null;

// Frames are driven by hand rather than by a timer: the hook schedules the next
// frame from inside the current one, so anything self-driving spins forever.
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
  resetReturningHomeForTests();
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

test("stays out of the way on an ordinary first visit", () => {
  const { result } = renderHook(() => useStackCollapse(1, 700));
  // Nothing to replay: the pointer owns the stack from the start.
  expect(result.current).toBeNull();
});

test("starts at the given travel when the reader has just come back from a case study", () => {
  markReturningHome("spotify-jam");
  const { result } = renderHook(() => useStackCollapse(1, 700));
  expect(result.current).toBe(1);
});

test("starts at a lower travel for a case study nearer the top of the stack", () => {
  markReturningHome("spotify-jam");
  const { result } = renderHook(() => useStackCollapse(0.6, 700));
  expect(result.current).toBe(0.6);
});

test("collapses the stack shut and then hands control back", () => {
  markReturningHome("spotify-jam");
  const { result } = renderHook(() => useStackCollapse(1, 700));

  frame(350);
  expect(result.current).toBeLessThan(1);
  expect(result.current).toBeGreaterThan(0);

  frame(700);
  // Null, not 0: the pointer takes the stack back rather than being pinned
  // shut under a reader whose cursor is already low on the screen.
  expect(result.current).toBeNull();
});

test("a lower starting travel still collapses all the way to null, not just to 0", () => {
  markReturningHome("spotify-jam");
  const { result } = renderHook(() => useStackCollapse(0.6, 700));

  frame(350);
  expect(result.current).toBeLessThan(0.6);
  expect(result.current).toBeGreaterThan(0);

  frame(700);
  expect(result.current).toBeNull();
});

test("does not restart or retarget if the caller passes a different startTravel on a later render", () => {
  markReturningHome("spotify-jam");
  const { result, rerender } = renderHook(
    ({ startTravel }) => useStackCollapse(startTravel, 700),
    { initialProps: { startTravel: 0.6 } }
  );
  expect(result.current).toBe(0.6);

  // Simulates app/page.tsx recomputing its argument on a later render, after
  // the flag this hook reads has already been consumed.
  rerender({ startTravel: 1 });
  expect(result.current).toBe(0.6);

  frame(350);
  // Still easing down from 0.6, not from the later 1.
  expect(result.current).toBeLessThan(0.6);
});

test("only replays the collapse once per return", () => {
  markReturningHome("spotify-jam");
  renderHook(() => useStackCollapse(1, 700));
  const { result } = renderHook(() => useStackCollapse(1, 700));
  expect(result.current).toBeNull();
});

test("still collapses when React mounts the effect twice", () => {
  // Development remounts every component once. Consuming the flag inside the
  // effect meant the second run took the early return, the frame was never
  // rescheduled, and the stack sat frozen wide open.
  markReturningHome("spotify-jam");
  const { result } = renderHook(() => useStackCollapse(1, 700), {
    wrapper: StrictMode,
  });
  expect(result.current).toBe(1);

  frame(350);
  expect(result.current).toBeLessThan(1);

  frame(700);
  expect(result.current).toBeNull();
});
