import { renderHook, act } from "@testing-library/react";
import { useLineBoilFrame } from "./useLineBoilFrame";

const root = document.documentElement;

function setBoil(state: string | undefined, frame: string | undefined) {
  act(() => {
    if (state === undefined) delete root.dataset.lineBoil;
    else root.dataset.lineBoil = state;
    if (frame === undefined) delete root.dataset.lineBoilFrame;
    else root.dataset.lineBoilFrame = frame;
  });
}

afterEach(() => setBoil(undefined, undefined));

test("holds on the first frame while the boil is off", () => {
  setBoil("off", "3");
  const { result } = renderHook(() => useLineBoilFrame(4));
  expect(result.current).toBe(1);
});

test("follows the frame the boil is cycling", async () => {
  setBoil("on", "1");
  const { result } = renderHook(() => useLineBoilFrame(4));
  setBoil("on", "3");
  await act(async () => {});
  expect(result.current).toBe(3);
});

test("wraps a frame beyond its own count back into range", async () => {
  setBoil("on", "1");
  const { result } = renderHook(() => useLineBoilFrame(2));
  setBoil("on", "4");
  await act(async () => {});
  expect(result.current).toBe(2);
});

test("falls back to the first frame when the attribute is nonsense", async () => {
  setBoil("on", "not-a-number");
  const { result } = renderHook(() => useLineBoilFrame(4));
  await act(async () => {});
  expect(result.current).toBe(1);
});
