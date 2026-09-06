import { renderHook, act } from "@testing-library/react";
import { useHeroReveal } from "./useHeroReveal";
import {
  SUBHEADER_REVEAL_START_DELAY_MS,
  TAGLINE_FOCUS_MS,
  DOTS_START_DELAY_MS,
  DOT_STAGGER_MS,
  ARROW_FADE_MS,
} from "@/lib/heroReveal";

const TAGLINE_LENGTH = 10;
const DOT_COUNT = 5;

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

describe("useHeroReveal", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    mockReducedMotion(false);
  });
  afterEach(() => jest.useRealTimers());

  test("shows nothing while the headline's own intro is still playing", () => {
    const { result } = renderHook(() => useHeroReveal(true, false, TAGLINE_LENGTH, DOT_COUNT));
    expect(result.current.phase).toBe("hidden");
    act(() => {
      jest.advanceTimersByTime(2000);
    });
    // Still hidden: introDone never flipped, so the reveal never started.
    expect(result.current.phase).toBe("hidden");
  });

  test("starts the subtitle focus pull after the handoff beat", () => {
    const { result, rerender } = renderHook(
      ({ introDone }) => useHeroReveal(true, introDone, TAGLINE_LENGTH, DOT_COUNT),
      { initialProps: { introDone: false } }
    );
    expect(result.current.phase).toBe("hidden");

    rerender({ introDone: true });
    // A real margin, not +5ms: jsdom's faked requestAnimationFrame lands
    // within about a frame of the target, not exactly on it (same lesson as
    // Hero.test.tsx's own cut-effect timing).
    act(() => {
      jest.advanceTimersByTime(SUBHEADER_REVEAL_START_DELAY_MS + TAGLINE_FOCUS_MS * 0.35 + 20);
    });
    expect(result.current.phase).toBe("focusing");
    expect(result.current.subheaderChars).toBe(3);
  });

  test("reaches the arrow and dots, then settles once both have landed", () => {
    const { result, rerender } = renderHook(
      ({ introDone }) => useHeroReveal(true, introDone, TAGLINE_LENGTH, DOT_COUNT),
      { initialProps: { introDone: false } }
    );
    rerender({ introDone: true });

    const focusedMs = SUBHEADER_REVEAL_START_DELAY_MS + TAGLINE_FOCUS_MS;
    const total =
      focusedMs + DOTS_START_DELAY_MS + DOT_STAGGER_MS * (DOT_COUNT - 1) + ARROW_FADE_MS + 50;
    act(() => {
      jest.advanceTimersByTime(total);
    });
    expect(result.current.done).toBe(true);
    expect(result.current.arrowProgress).toBe(1);
    expect(result.current.dotsRevealed).toBe(DOT_COUNT);
  });

  test("skips straight to everything shown when disabled -- a return visit", () => {
    const { result } = renderHook(() => useHeroReveal(false, true, TAGLINE_LENGTH, DOT_COUNT));
    expect(result.current.done).toBe(true);
    expect(result.current.subheaderChars).toBe(TAGLINE_LENGTH);
    expect(result.current.dotsRevealed).toBe(DOT_COUNT);
  });

  test("skips the focus pull and stagger for reduced motion", () => {
    mockReducedMotion(true);
    const { result, rerender } = renderHook(
      ({ introDone }) => useHeroReveal(true, introDone, TAGLINE_LENGTH, DOT_COUNT),
      { initialProps: { introDone: true } }
    );
    // The preference is read on the next frame, so it settles within one
    // frame rather than never starting -- same pattern as useHeadlineIntro.
    act(() => {
      jest.advanceTimersByTime(100);
    });
    expect(result.current.done).toBe(true);
    rerender({ introDone: true });
    expect(result.current.done).toBe(true);
  });
});
