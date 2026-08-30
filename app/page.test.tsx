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

test("touch drives the same stack, scrolling rather than a separate list", () => {
  // The reveal is the interaction, so touch gets the stack too -- with a
  // spacer to scroll against, since the stack itself is fixed.
  mockUsePointerType.mockReturnValue("coarse");
  render(<HomePage />);
  expect(screen.getByTestId("paper-sheet-0")).toBeInTheDocument();
  caseStudies.forEach((_, index) => {
    expect(screen.getByTestId(`paper-sheet-${index + 1}`)).toBeInTheDocument();
  });
  expect(screen.getByTestId("scroll-spacer")).toBeInTheDocument();
  expect(screen.queryByTestId("mobile-portfolio")).not.toBeInTheDocument();
});

test("the stack opens further on touch than it does on a pointer", () => {
  // A phone is tall and narrow, so the revealed portion can afford more of it.
  mockUseFanProgress.mockReturnValue({ fanProgress: 1, sweepProgress: 1 });

  mockUsePointerType.mockReturnValue("fine");
  const desktop = render(<HomePage />);
  const desktopHero = parseFloat(
    desktop.getByTestId("paper-sheet-0").style.bottom
  );
  desktop.unmount();

  mockUsePointerType.mockReturnValue("coarse");
  const touch = render(<HomePage />);
  const touchHero = parseFloat(touch.getByTestId("paper-sheet-0").style.bottom);

  expect(touchHero).toBeGreaterThan(desktopHero);
});

test("the fully swept stack takes about half the viewport", () => {
  // It used to reach only ~30% and read as a sliver.
  mockUseFanProgress.mockReturnValue({ fanProgress: 1, sweepProgress: 1 });
  render(<HomePage />);
  const revealed = parseFloat(screen.getByTestId("paper-sheet-0").style.bottom);
  expect(revealed).toBeGreaterThan(40);
  expect(revealed).toBeLessThan(60);
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
