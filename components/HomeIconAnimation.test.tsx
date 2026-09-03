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

test("plays all five frames while the case-study header collapses", () => {
  const { rerender } = render(<HomeIconAnimation shrunk={false} />);
  const icon = screen.getByTestId("case-study-home-label");
  expect(icon).toHaveAttribute("src", "/assets/home-animation-1.svg");

  rerender(<HomeIconAnimation shrunk />);
  act(() => jest.advanceTimersByTime(55));
  expect(icon).toHaveAttribute("src", "/assets/home-animation-2.svg");
  act(() => jest.advanceTimersByTime(55 * 3));
  expect(icon).toHaveAttribute("src", "/assets/home-animation-5.svg");
});

test("waits for the header to reopen before playing frames backwards", () => {
  const { rerender } = render(<HomeIconAnimation shrunk />);
  const icon = screen.getByTestId("case-study-home-label");
  expect(icon).toHaveAttribute("src", "/assets/home-animation-5.svg");

  rerender(<HomeIconAnimation shrunk={false} />);
  act(() => jest.advanceTimersByTime(179));
  expect(icon).toHaveAttribute("src", "/assets/home-animation-5.svg");

  act(() => jest.advanceTimersByTime(1));
  act(() => jest.advanceTimersByTime(79));
  expect(icon).toHaveAttribute("src", "/assets/home-animation-5.svg");
  act(() => jest.advanceTimersByTime(1));
  expect(icon).toHaveAttribute("src", "/assets/home-animation-4.svg");
  act(() => jest.advanceTimersByTime(80 * 3));
  expect(icon).toHaveAttribute("src", "/assets/home-animation-1.svg");
});

test("plays once on hover and returns to the first frame", () => {
  render(<HomeIconAnimation shrunk={false} />);
  const icon = screen.getByTestId("case-study-home-label");

  // Past the post-mount suppress window (see the next test) -- this is a
  // hover well after the icon settled, not one caused by it just appearing.
  act(() => jest.advanceTimersByTime(600));
  fireEvent.pointerEnter(icon);
  act(() => jest.advanceTimersByTime(80 * 4));
  expect(icon).toHaveAttribute("src", "/assets/home-animation-5.svg");

  act(() => jest.advanceTimersByTime(80 * 4));
  expect(icon).toHaveAttribute("src", "/assets/home-animation-1.svg");

  act(() => jest.advanceTimersByTime(80 * 5));
  expect(icon).toHaveAttribute("src", "/assets/home-animation-1.svg");
});

test("does not replay the hover wiggle for a pointer that was already sitting over it when the header reopened", () => {
  // The icon is pointer-events:none while collapsed. The moment scrolling
  // back to the top flips it to auto, a cursor already positioned over its
  // on-screen spot is treated as freshly entering -- no real movement
  // needed -- which fired the wiggle mid-rebuild and looked like the reverse
  // animation had restarted playing forward.
  const { rerender } = render(<HomeIconAnimation shrunk />);
  const icon = screen.getByTestId("case-study-home-label");

  rerender(<HomeIconAnimation shrunk={false} />);
  // Still mid-rebuild: the reverse sequence's own delay plus four frame
  // steps is 500ms; fire well inside that window.
  act(() => jest.advanceTimersByTime(300));
  fireEvent.pointerEnter(icon);
  act(() => jest.advanceTimersByTime(80 * 8));
  // The wiggle never ran -- the icon settles on frame 1 purely from finishing
  // its own reverse rebuild, not from a hover-triggered forward-then-back.
  expect(icon).toHaveAttribute("src", "/assets/home-animation-1.svg");

  // A genuine hover once it has well and truly settled still works.
  act(() => jest.advanceTimersByTime(600));
  fireEvent.pointerEnter(icon);
  act(() => jest.advanceTimersByTime(80 * 4));
  expect(icon).toHaveAttribute("src", "/assets/home-animation-5.svg");
});
