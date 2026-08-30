import { renderHook, act } from "@testing-library/react";
import { useHeadlineIntro } from "./useHeadlineIntro";
import { HEADLINE_INTRO_DURATION_MS, HEADLINE_INTRO_STEPS } from "@/lib/headlineIntro";

function mockReducedMotion(reduce: boolean) {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    configurable: true,
    value: (query: string) => ({
      matches: query.includes("prefers-reduced-motion") ? reduce : false,
      media: query,
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
    }),
  });
}

describe("useHeadlineIntro", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    mockReducedMotion(false);
  });
  afterEach(() => jest.useRealTimers());

  test("starts on the sketch", () => {
    const { result } = renderHook(() => useHeadlineIntro(true));
    expect(result.current.phase).toBe("sketch");
    expect(result.current.done).toBe(false);
  });

  test("reaches the ascii prototype, then settles on the finished treatment", () => {
    const { result } = renderHook(() => useHeadlineIntro(true));

    act(() => {
      jest.advanceTimersByTime(HEADLINE_INTRO_STEPS[0].durationMs + 50);
    });
    expect(result.current.phase).toBe("ascii");

    act(() => {
      jest.advanceTimersByTime(HEADLINE_INTRO_DURATION_MS);
    });
    expect(result.current).toEqual({ phase: "final", done: true });
  });

  test("goes straight to the finished treatment when disabled", () => {
    const { result } = renderHook(() => useHeadlineIntro(false));
    expect(result.current.done).toBe(true);
    expect(result.current.phase).toBe("final");
  });

  test("skips the story for reduced motion", () => {
    mockReducedMotion(true);
    const { result } = renderHook(() => useHeadlineIntro(true));
    // The preference is read on the next frame, so the story is abandoned
    // within one frame rather than never starting.
    act(() => {
      jest.advanceTimersByTime(100);
    });
    expect(result.current.done).toBe(true);
    expect(result.current.phase).toBe("final");
  });
});
