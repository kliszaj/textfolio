import { act, fireEvent, render, screen } from "@testing-library/react";
import { HomeIconAnimation } from "./HomeIconAnimation";

beforeEach(() => {
  jest.useFakeTimers();
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    value: jest.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
    })),
  });
});

afterEach(() => {
  jest.useRealTimers();
});

test("holds after the explosion, then rebuilds the house from the original frames", () => {
  render(<HomeIconAnimation />);
  const icon = screen.getByTestId("case-study-home-label");

  fireEvent.pointerEnter(icon);
  act(() => jest.advanceTimersByTime(100 * 4));
  expect(icon).toHaveAttribute("src", "/assets/home-explosion-5.svg");

  act(() => jest.advanceTimersByTime(100));
  expect(icon).toHaveAttribute("src", "/assets/home-explosion-6.svg");

  act(() => jest.advanceTimersByTime(499));
  expect(icon).toHaveAttribute("src", "/assets/home-explosion-6.svg");

  act(() => jest.advanceTimersByTime(1));
  expect(icon).toHaveAttribute("src", "/assets/home-animation-5.svg");

  act(() => jest.advanceTimersByTime(80));
  expect(icon).toHaveAttribute("src", "/assets/home-animation-4.svg");

  act(() => jest.advanceTimersByTime(80 * 3));
  expect(icon).toHaveAttribute("src", "/assets/home-animation-1.svg");

});
