import { act, fireEvent, render, screen } from "@testing-library/react";
import { STEP_DWELL_MS, SteppedImage } from "@/components/SteppedImage";

const steps = {
  width: 100,
  height: 300,
  bands: [
    { label: "One", color: "#111111", top: 0, height: 100 },
    { label: "Two", color: "#222222", top: 100, height: 100 },
    { label: "Three", color: "#333333", top: 200, height: 100 },
  ],
};

const current = () => screen.getAllByRole("button").find((chip) => chip.getAttribute("aria-pressed") === "true")?.textContent;

beforeEach(() => jest.useFakeTimers());
afterEach(() => jest.useRealTimers());

test("holds on the first band until it plays", () => {
  render(<SteppedImage src="/tall.jpg" alt="Tall" steps={steps} playing={false} />);
  act(() => jest.advanceTimersByTime(STEP_DWELL_MS));
  act(() => jest.advanceTimersByTime(STEP_DWELL_MS));
  expect(current()).toBe("One");
});

test("moves on after each dwell while playing, looping, and settles back when stopped", () => {
  const { rerender } = render(<SteppedImage src="/tall.jpg" alt="Tall" steps={steps} playing />);
  act(() => jest.advanceTimersByTime(STEP_DWELL_MS));
  expect(current()).toBe("Two");
  act(() => jest.advanceTimersByTime(STEP_DWELL_MS));
  act(() => jest.advanceTimersByTime(STEP_DWELL_MS));
  expect(current()).toBe("One");
  act(() => jest.advanceTimersByTime(STEP_DWELL_MS));
  rerender(<SteppedImage src="/tall.jpg" alt="Tall" steps={steps} playing={false} />);
  expect(current()).toBe("One");
});

test("jumps to a band when its chip is pressed, clipping the image to it", () => {
  render(<SteppedImage src="/tall.jpg" alt="Tall" steps={steps} playing={false} />);
  fireEvent.click(screen.getByRole("button", { name: "Three" }));
  expect(current()).toBe("Three");
  expect(screen.getByRole("img", { name: "Tall" }).style.clipPath).toMatch(/^inset\(66\.6+\d*% 0 0% 0\)$/);
});
