import { renderHook, act } from "@testing-library/react";
import { SHORT_VIEWPORT_MAX_HEIGHT_PX, useShortViewport } from "./useShortViewport";

function mockMatchMedia(matches: boolean) {
  const listeners: Array<(e: MediaQueryListEvent) => void> = [];
  let queried = "";
  window.matchMedia = jest.fn().mockImplementation((query: string) => {
    queried = query;
    return {
      matches,
      media: query,
      addEventListener: (_: string, cb: (e: MediaQueryListEvent) => void) => {
        listeners.push(cb);
      },
      removeEventListener: jest.fn(),
    };
  }) as unknown as typeof window.matchMedia;
  return {
    fireChange: (newMatches: boolean) =>
      listeners.forEach((cb) => cb({ matches: newMatches } as MediaQueryListEvent)),
    queriedFor: () => queried,
  };
}

test("returns false when the viewport is taller than the short threshold", () => {
  mockMatchMedia(false);
  const { result } = renderHook(() => useShortViewport());
  expect(result.current).toBe(false);
});

test("returns true when the viewport is at or below the short threshold", () => {
  mockMatchMedia(true);
  const { result } = renderHook(() => useShortViewport());
  expect(result.current).toBe(true);
});

test("queries against the documented threshold", () => {
  const { queriedFor } = mockMatchMedia(false);
  renderHook(() => useShortViewport());
  expect(queriedFor()).toBe(`(max-height: ${SHORT_VIEWPORT_MAX_HEIGHT_PX}px)`);
});

test("updates when the media query change fires -- a window resized shorter mid-visit", () => {
  const { fireChange } = mockMatchMedia(false);
  const { result } = renderHook(() => useShortViewport());
  expect(result.current).toBe(false);
  act(() => fireChange(true));
  expect(result.current).toBe(true);
});
