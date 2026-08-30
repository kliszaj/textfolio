import { render, screen, fireEvent, act } from "@testing-library/react";
import HomePage from "./page";
import { useFanProgress } from "@/hooks/useFanProgress";
import { usePointerType } from "@/hooks/usePointerType";
import { caseStudies } from "@/data/caseStudies";

jest.mock("@/hooks/useFanProgress");
jest.mock("@/hooks/usePointerType");
const mockPush = jest.fn();
const mockPrefetch = jest.fn();
jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush, prefetch: mockPrefetch }),
}));

const mockUseFanProgress = useFanProgress as jest.Mock;
const mockUsePointerType = usePointerType as jest.Mock;

beforeEach(() => {
  mockPush.mockClear();
  mockPrefetch.mockClear();
  mockUseFanProgress.mockReturnValue({ fanProgress: 0, sweepProgress: 0 });
  mockUsePointerType.mockReturnValue("fine");
});

test("renders the hero and all case study sheets", () => {
  render(<HomePage />);
  // The headline plays its sketch -> prototype -> finished story on load, so
  // assert the frame is present rather than one particular treatment.
  expect(screen.getByTestId("hero-headline")).toBeInTheDocument();
  expect(screen.getByTestId("stroke-text")).toHaveAttribute("aria-label", "ADRIAN");
  caseStudies.forEach((cs) => {
    expect(screen.getByText(cs.title)).toBeInTheDocument();
  });
});

test("keeps the tuning panel behind a Settings button", () => {
  render(<HomePage />);
  expect(screen.getByTestId("fan-debug-toggle")).toBeInTheDocument();
  expect(screen.queryByTestId("fan-debug-panel")).not.toBeInTheDocument();
});

test("uses a native vertical case-study list on touch devices", () => {
  mockUsePointerType.mockReturnValue("coarse");
  render(<HomePage />);
  expect(screen.getByTestId("mobile-portfolio")).toBeInTheDocument();
  expect(screen.getByTestId("mobile-case-list")).toBeInTheDocument();
  caseStudies.forEach((caseStudy) => {
    expect(screen.getByTestId(`mobile-case-${caseStudy.slug}`)).toBeInTheDocument();
  });
  expect(screen.queryByTestId("paper-sheet-0")).not.toBeInTheDocument();
  expect(screen.queryByTestId("scroll-spacer")).not.toBeInTheDocument();
});

test("keeps the fixed cursor-driven stack on fine-pointer devices", () => {
  render(<HomePage />);
  expect(screen.getByTestId("paper-sheet-0")).toBeInTheDocument();
  expect(screen.queryByTestId("mobile-portfolio")).not.toBeInTheDocument();
});

test("prefetches every case study route so the lift lands instantly", () => {
  render(<HomePage />);
  caseStudies.forEach((cs) => {
    expect(mockPrefetch).toHaveBeenCalledWith(`/work/${cs.slug}`);
  });
});

test("plays the sheet lift and then navigates to the case study", () => {
  jest.useFakeTimers();
  render(<HomePage />);
  fireEvent.click(screen.getByText(caseStudies[0].title));

  const overlay = screen.getByTestId("case-study-focus");
  expect(overlay).toHaveAttribute("data-variant", "lift");
  // The route change waits for the lift to finish, not for the click.
  expect(mockPush).not.toHaveBeenCalled();

  act(() => {
    jest.advanceTimersByTime(2000);
  });
  expect(mockPush).toHaveBeenCalledWith(`/work/${caseStudies[0].slug}`);
  jest.useRealTimers();
});
