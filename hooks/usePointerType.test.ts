import { renderHook, act } from "@testing-library/react";
import { usePointerType } from "./usePointerType";

function mockMatchMedia(matches: boolean) {
  const listeners: Array<(e: MediaQueryListEvent) => void> = [];
  window.matchMedia = jest.fn().mockImplementation((query: string) => ({
    matches,
    media: query,
    addEventListener: (_: string, cb: (e: MediaQueryListEvent) => void) => {
      listeners.push(cb);
    },
    removeEventListener: jest.fn(),
  })) as unknown as typeof window.matchMedia;
  return {
    fireChange: (newMatches: boolean) =>
      listeners.forEach((cb) => cb({ matches: newMatches } as MediaQueryListEvent)),
  };
}

test("returns fine when pointer:coarse does not match", () => {
  mockMatchMedia(false);
  const { result } = renderHook(() => usePointerType());
  expect(result.current).toBe("fine");
});

test("returns coarse when pointer:coarse matches", () => {
  mockMatchMedia(true);
  const { result } = renderHook(() => usePointerType());
  expect(result.current).toBe("coarse");
});

test("updates when the media query change fires", () => {
  const { fireChange } = mockMatchMedia(false);
  const { result } = renderHook(() => usePointerType());
  expect(result.current).toBe("fine");
  act(() => fireChange(true));
  expect(result.current).toBe("coarse");
});
