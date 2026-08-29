import { renderHook, act } from "@testing-library/react";
import { useActiveLetterIndex } from "./useActiveLetterIndex";
import { usePointerType } from "./usePointerType";

jest.mock("./usePointerType");
const mockUsePointerType = usePointerType as jest.Mock;

describe("useActiveLetterIndex", () => {
  afterEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  test("fine pointer: onEnter sets activeIndex, onLeave clears it", () => {
    mockUsePointerType.mockReturnValue("fine");
    const { result } = renderHook(() => useActiveLetterIndex(6, true));
    expect(result.current.activeIndex).toBeNull();
    act(() => result.current.onEnter(2));
    expect(result.current.activeIndex).toBe(2);
    act(() => result.current.onLeave());
    expect(result.current.activeIndex).toBeNull();
  });

  test("coarse pointer + visible: auto-cycles through indices over time", () => {
    jest.useFakeTimers();
    mockUsePointerType.mockReturnValue("coarse");
    const { result } = renderHook(() => useActiveLetterIndex(6, true));
    expect(result.current.activeIndex).toBe(0);
    act(() => {
      jest.advanceTimersByTime(3000);
    });
    expect(result.current.activeIndex).toBe(1);
    act(() => {
      jest.advanceTimersByTime(3000 * 5);
    });
    expect(result.current.activeIndex).toBe(0);
  });

  test("coarse pointer + not visible: does not cycle", () => {
    jest.useFakeTimers();
    mockUsePointerType.mockReturnValue("coarse");
    const { result } = renderHook(() => useActiveLetterIndex(6, false));
    act(() => {
      jest.advanceTimersByTime(10000);
    });
    expect(result.current.activeIndex).toBe(0);
  });
});
