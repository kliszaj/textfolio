import { renderHook, act } from "@testing-library/react";
import { useFanProgress } from "./useFanProgress";
import { usePointerType } from "./usePointerType";

jest.mock("./usePointerType");
const mockUsePointerType = usePointerType as jest.Mock;

function setViewportHeight(height: number) {
  Object.defineProperty(window, "innerHeight", { value: height, configurable: true });
}

describe("useFanProgress", () => {
  afterEach(() => jest.clearAllMocks());

  test("fine pointer: mousemove near the bottom increases fan progress", () => {
    mockUsePointerType.mockReturnValue("fine");
    setViewportHeight(800);
    const { result } = renderHook(() => useFanProgress());
    expect(result.current).toBe(0);
    act(() => {
      window.dispatchEvent(new MouseEvent("mousemove", { clientY: 800 }));
    });
    expect(result.current).toBe(1);
  });

  test("fine pointer: mouse leaving the document resets progress to 0", () => {
    mockUsePointerType.mockReturnValue("fine");
    setViewportHeight(800);
    const { result } = renderHook(() => useFanProgress());
    act(() => {
      window.dispatchEvent(new MouseEvent("mousemove", { clientY: 800 }));
    });
    expect(result.current).toBe(1);
    act(() => {
      document.documentElement.dispatchEvent(new MouseEvent("mouseleave"));
    });
    expect(result.current).toBe(0);
  });

  test("fine pointer: a custom threshold changes how quickly progress ramps up", () => {
    mockUsePointerType.mockReturnValue("fine");
    setViewportHeight(800);
    const { result } = renderHook(() => useFanProgress(100));
    act(() => {
      window.dispatchEvent(new MouseEvent("mousemove", { clientY: 750 }));
    });
    expect(result.current).toBeCloseTo(0.5);
  });

  test("coarse pointer: scroll position drives fan progress", () => {
    mockUsePointerType.mockReturnValue("coarse");
    setViewportHeight(800);
    Object.defineProperty(document.documentElement, "scrollHeight", {
      value: 1600,
      configurable: true,
    });
    Object.defineProperty(window, "scrollY", { value: 400, configurable: true });
    const { result } = renderHook(() => useFanProgress());
    expect(result.current).toBe(0.5);
  });
});
