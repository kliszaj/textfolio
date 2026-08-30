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
  const { result } = renderHook(() => useStackCollapse(700));
  // Nothing to replay: the pointer owns the stack from the start.
  expect(result.current).toBeNull();
});

test("starts fully fanned when the reader has just come back from a case study", () => {
  markReturningHome();
  const { result } = renderHook(() => useStackCollapse(700));
  expect(result.current).toBe(1);
});

test("collapses the stack shut and then hands control back", () => {
  markReturningHome();
  const { result } = renderHook(() => useStackCollapse(700));

  frame(350);
  expect(result.current).toBeLessThan(1);
  expect(result.current).toBeGreaterThan(0);

  frame(700);
  // Null, not 0: the pointer takes the stack back rather than being pinned
  // shut under a reader whose cursor is already low on the screen.
  expect(result.current).toBeNull();
});

test("only replays the collapse once per return", () => {
  markReturningHome();
  renderHook(() => useStackCollapse(700));
  const { result } = renderHook(() => useStackCollapse(700));
  expect(result.current).toBeNull();
});
