import { act, renderHook } from "@testing-library/react";
import { EXIT_PULL_THRESHOLD_PX } from "@/lib/scrollExit";
import { useScrollUpExit } from "./useScrollUpExit";

function wheel(deltaY: number) {
  act(() => {
    window.dispatchEvent(new WheelEvent("wheel", { deltaY, cancelable: true }));
  });
}

beforeEach(() => {
  window.scrollY = 0;
});

test("stays still until the gesture actually starts", () => {
  const onExit = jest.fn();
  const { result } = renderHook(() => useScrollUpExit(onExit));
  expect(result.current).toBe(0);
  expect(onExit).not.toHaveBeenCalled();
});

test("gathers pull as the reader keeps scrolling up at the top", () => {
  const { result } = renderHook(() => useScrollUpExit(jest.fn()));
  wheel(-40);
  expect(result.current).toBe(40);
  wheel(-40);
  expect(result.current).toBe(80);
});

test("ignores upward scrolling when the page is not at the top", () => {
  const onExit = jest.fn();
  const { result } = renderHook(() => useScrollUpExit(onExit));
  window.scrollY = 500;
  wheel(-EXIT_PULL_THRESHOLD_PX * 2);
  expect(result.current).toBe(0);
  expect(onExit).not.toHaveBeenCalled();
});

test("leaves once the pull is deliberate enough", () => {
  const onExit = jest.fn();
  renderHook(() => useScrollUpExit(onExit));
  wheel(-EXIT_PULL_THRESHOLD_PX);
  expect(onExit).toHaveBeenCalledTimes(1);
});

test("only exits once, however much further the gesture runs", () => {
  const onExit = jest.fn();
  renderHook(() => useScrollUpExit(onExit));
  wheel(-EXIT_PULL_THRESHOLD_PX);
  wheel(-EXIT_PULL_THRESHOLD_PX);
  wheel(-EXIT_PULL_THRESHOLD_PX);
  expect(onExit).toHaveBeenCalledTimes(1);
});

test("lets a reversed gesture hand the pull back without leaving", () => {
  const onExit = jest.fn();
  const { result } = renderHook(() => useScrollUpExit(onExit));
  wheel(-100);
  wheel(60);
  expect(result.current).toBe(40);
  expect(onExit).not.toHaveBeenCalled();
});

test("does nothing at all while disabled", () => {
  const onExit = jest.fn();
  const { result } = renderHook(() => useScrollUpExit(onExit, false));
  wheel(-EXIT_PULL_THRESHOLD_PX * 2);
  expect(result.current).toBe(0);
  expect(onExit).not.toHaveBeenCalled();
});
