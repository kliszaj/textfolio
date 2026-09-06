import { render, screen, fireEvent, act } from "@testing-library/react";
import HomePage from "./page";
import { useFanProgress } from "@/hooks/useFanProgress";
import { usePointerType } from "@/hooks/usePointerType";
import { caseStudies } from "@/data/caseStudies";
import { ABOUT_PAGE } from "@/data/about";
import { markReturningHome, resetReturningHomeForTests } from "@/hooks/useStackCollapse";
import { STACK_SHUFFLE_HOLD_MS, STACK_SHUFFLE_OPEN_MS } from "@/hooks/useStackShuffle";

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
  // The headline flips through sketch -> ascii -> warp -> final (the resting
  // look) on load, so assert the frame is present rather than one
  // particular treatment. Warp is always mounted regardless of which is
  // active.
  expect(screen.getByTestId("hero-headline")).toBeInTheDocument();
  expect(screen.getByTestId("warp-text")).toHaveAttribute("aria-label", "ADRIAN");
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

test("prefetches About too, at its own route rather than /work/about", () => {
  render(<HomePage />);
  expect(mockPrefetch).toHaveBeenCalledWith("/about");
  expect(mockPrefetch).not.toHaveBeenCalledWith("/work/about");
});

test("lifts and navigates to About the same way a case study does", () => {
  jest.useFakeTimers();
  render(<HomePage />);
  fireEvent.click(screen.getByText(ABOUT_PAGE.title));

  const overlay = screen.getByTestId("case-study-focus");
  expect(overlay).toHaveAttribute("data-variant", "lift");
  expect(mockPush).not.toHaveBeenCalled();

  act(() => {
    jest.advanceTimersByTime(2000);
  });
  expect(mockPush).toHaveBeenCalledWith("/about");
  jest.useRealTimers();
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

test("opens fanned and folds shut when the reader has just come back", () => {
  // The pointer says the stack is closed; the return says it should start open
  // and collapse. The return has to win, or the fold is never seen.
  mockUseFanProgress.mockReturnValue({ fanProgress: 0, sweepProgress: 0 });
  markReturningHome(ABOUT_PAGE.slug);

  render(<HomePage />);
  const sheet = screen.getByTestId("paper-sheet-1");

  expect(sheet.style.bottom).not.toBe("0%");
  resetReturningHomeForTests();
});

test("collapses a lighter distance when returning from a case study near the top of the stack", () => {
  mockUseFanProgress.mockReturnValue({ fanProgress: 0, sweepProgress: 0 });

  markReturningHome(caseStudies[0].slug);
  const { unmount } = render(<HomePage />);
  const shallowBottom = parseFloat(screen.getByTestId("paper-sheet-1").style.bottom);
  unmount();
  resetReturningHomeForTests();

  markReturningHome(ABOUT_PAGE.slug);
  render(<HomePage />);
  const fullBottom = parseFloat(screen.getByTestId("paper-sheet-1").style.bottom);
  resetReturningHomeForTests();

  expect(shallowBottom).toBeLessThan(fullBottom);
});

test("shuffles the stack open to a case study clicked in the page-indicator rail, then lifts from its real position", () => {
  jest.useFakeTimers();
  mockUseFanProgress.mockReturnValue({ fanProgress: 0, sweepProgress: 0 });
  render(<HomePage />);

  const target = caseStudies[1];
  const depth = caseStudies.findIndex((caseStudy) => caseStudy.slug === target.slug) + 1;
  const sheet = screen.getByTestId(`paper-sheet-${depth}`);
  jest.spyOn(sheet, "getBoundingClientRect").mockReturnValue({
    left: 100,
    top: 200,
    width: 300,
    height: 50,
    right: 400,
    bottom: 250,
  } as DOMRect);
  Object.defineProperty(window, "innerWidth", { value: 1000, configurable: true });
  Object.defineProperty(window, "innerHeight", { value: 1000, configurable: true });

  fireEvent.click(screen.getByRole("button", { name: target.title }));

  for (
    let elapsed = 0;
    elapsed < STACK_SHUFFLE_OPEN_MS + STACK_SHUFFLE_HOLD_MS + 50;
    elapsed += 50
  ) {
    act(() => {
      jest.advanceTimersByTime(50);
    });
  }

  const overlay = screen.getByTestId("case-study-focus");
  expect(overlay).toHaveAttribute("data-variant", "lift");
  expect(overlay.style.getPropertyValue("--focus-x")).toBe("25%");
  expect(overlay.style.getPropertyValue("--focus-y")).toBe("22.5%");
  jest.useRealTimers();
});

test("leaves the stack to the pointer on an ordinary visit", () => {
  resetReturningHomeForTests();
  mockUseFanProgress.mockReturnValue({ fanProgress: 0, sweepProgress: 0 });

  render(<HomePage />);
  expect(screen.getByTestId("paper-sheet-1").style.bottom).toBe("0%");
});

describe("the intro cut effect picker survives a reload", () => {
  // The intro only plays once per page load (useIntroOnce), so trying an
  // effect out means picking it, then reloading to actually see it -- a
  // picker that forgot the pick on exactly that reload would be unusable.
  beforeEach(() => window.localStorage.clear());

  test("remembers a picked effect across a fresh mount", () => {
    const { unmount } = render(<HomePage />);
    fireEvent.click(screen.getByTestId("fan-debug-toggle"));
    fireEvent.click(screen.getByRole("tab", { name: "RGB split" }));
    unmount();

    // A page reload is a fresh mount of the same module-level component,
    // reading whatever got left in storage -- not a rerender of the one
    // still holding the picked value in memory.
    render(<HomePage />);
    fireEvent.click(screen.getByTestId("fan-debug-toggle"));
    expect(screen.getByRole("tab", { name: "RGB split" })).toHaveAttribute(
      "aria-selected",
      "true"
    );
  });

  test("defaults to none when nothing has been picked yet", () => {
    render(<HomePage />);
    fireEvent.click(screen.getByTestId("fan-debug-toggle"));
    expect(screen.getByRole("tab", { name: "None" })).toHaveAttribute("aria-selected", "true");
  });

  test("ignores a corrupted or outdated stored value rather than crashing", () => {
    window.localStorage.setItem("textfolio:intro-cut-effect", "tear");
    render(<HomePage />);
    fireEvent.click(screen.getByTestId("fan-debug-toggle"));
    expect(screen.getByRole("tab", { name: "None" })).toHaveAttribute("aria-selected", "true");
  });
});
