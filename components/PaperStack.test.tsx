import { render, screen, fireEvent } from "@testing-library/react";
import { PaperStack } from "./PaperStack";
import { caseStudies } from "@/data/caseStudies";
import { ABOUT_PAGE } from "@/data/about";
import { usePointerType } from "@/hooks/usePointerType";
import type { FanSheetConfig } from "@/lib/fanSheet";

// Hero reaches usePointerType through useActiveLetterIndex, and jsdom has no
// matchMedia. PaperStack itself no longer consults the pointer type.
jest.mock("@/hooks/usePointerType");
const mockUsePointerType = usePointerType as jest.Mock;

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: jest.fn() }),
}));

beforeEach(() => {
  mockUsePointerType.mockReturnValue("fine");
});

const config: FanSheetConfig = {
  mechanic: "bottom",
  bandPercents: [4, 4, 4],
  emphasisBonusPercent: 8,
  emphasisFalloff: 1.5,
  revealLeadSheets: 1.5,
  tiltStepDegrees: -1.5,
  maxTiltDegrees: 6,
  brightnessFalloff: 0.05,
};

function renderStack(fanProgress: number, sweepProgress: number) {
  return render(
    <PaperStack
      playIntro={false}
      fanProgress={fanProgress}
      sweepProgress={sweepProgress}
      config={config}
      transitionMs={40}
    />
  );
}

// About rides one sheet behind the last case study (see PaperStack), so the
// stack has one more depth than caseStudies.length.
const SHEET_COUNT = caseStudies.length + 1;
const DEPTHS = [0, ...caseStudies.map((_, i) => i + 1), SHEET_COUNT];
const LAST = caseStudies.length - 1;
// sweep 0.5 puts the peak at depth 1 + (SHEET_COUNT-1)/2
const MID = (SHEET_COUNT - 1) / 2;

function blurbOpacity(text: string): number {
  return parseFloat(screen.getByText(text).style.opacity);
}

test("renders the hero as depth 0 and one sheet per case study behind it", () => {
  renderStack(0, 0);
  expect(screen.getByTestId("paper-sheet-0")).toBeInTheDocument();
  expect(screen.getByTestId("warp-text")).toBeInTheDocument();
  caseStudies.forEach((cs, index) => {
    expect(screen.getByTestId(`paper-sheet-${index + 1}`)).toBeInTheDocument();
    expect(screen.getByText(cs.title)).toBeInTheDocument();
  });
});

test("gives the hero the highest z-index and each deeper sheet a lower one", () => {
  renderStack(0, 0);
  const zIndices = DEPTHS.map(
    (depth) => Number(screen.getByTestId(`paper-sheet-${depth}`).style.zIndex)
  );
  expect(zIndices).toEqual([...zIndices].sort((a, b) => b - a));
});

test("z-indices never change as the sweep advances", () => {
  const { rerender } = renderStack(1, 0);
  const before = DEPTHS.map((d) => screen.getByTestId(`paper-sheet-${d}`).style.zIndex);
  rerender(
    <PaperStack playIntro={false} fanProgress={1} sweepProgress={1} config={config} transitionMs={40} />
  );
  const after = DEPTHS.map((d) => screen.getByTestId(`paper-sheet-${d}`).style.zIndex);
  expect(after).toEqual(before);
});

test("the first case study holds the emphasis at the start of the sweep", () => {
  renderStack(1, 0);
  expect(blurbOpacity(caseStudies[0].blurb)).toBe(1);
  expect(blurbOpacity(caseStudies[LAST].blurb)).toBe(0);
});

test("the emphasis hands off to the About sheet by the end of the sweep", () => {
  // About is the true last sheet now (see PaperStack), so the last case
  // study no longer takes full emphasis at the end of a full sweep -- About
  // does.
  renderStack(1, 1);
  expect(blurbOpacity(caseStudies[0].blurb)).toBe(0);
  expect(blurbOpacity(caseStudies[LAST].blurb)).toBe(0);
  expect(blurbOpacity(ABOUT_PAGE.blurb)).toBe(1);
});

test("the middle case study holds the emphasis halfway through the sweep", () => {
  renderStack(1, 0.5);
  expect(blurbOpacity(caseStudies[MID].blurb)).toBe(1);
  expect(blurbOpacity(caseStudies[0].blurb)).toBe(0);
  expect(blurbOpacity(caseStudies[LAST].blurb)).toBe(0);
});

test("an emphasised sheet claims a thicker band than its neighbours", () => {
  renderStack(1, 0);
  const bottoms = DEPTHS.map(
    (d) => parseFloat(screen.getByTestId(`paper-sheet-${d}`).style.bottom)
  );
  // band(d) = bottom(d-1) - bottom(d); sheet 1 is at peak emphasis
  const bandAtPeak = bottoms[0] - bottoms[1];
  const bandAtBack = bottoms[LAST] - bottoms[LAST + 1];
  expect(bandAtPeak).toBeGreaterThan(bandAtBack);
});

test("the hero lifts further as the fan opens", () => {
  const { rerender } = renderStack(0, 0);
  expect(parseFloat(screen.getByTestId("paper-sheet-0").style.bottom)).toBe(0);
  rerender(
    <PaperStack playIntro={false} fanProgress={1} sweepProgress={0} config={config} transitionMs={40} />
  );
  expect(parseFloat(screen.getByTestId("paper-sheet-0").style.bottom)).toBeGreaterThan(0);
});

test("hovering a sheet changes nothing", () => {
  renderStack(1, 0);
  const sheet = screen.getByTestId("paper-sheet-2");
  const before = sheet.getAttribute("style");
  const blurbBefore = blurbOpacity(caseStudies[1].blurb);
  fireEvent.mouseEnter(sheet);
  expect(sheet.getAttribute("style")).toBe(before);
  expect(blurbOpacity(caseStudies[1].blurb)).toBe(blurbBefore);
  fireEvent.mouseLeave(sheet);
  expect(sheet.getAttribute("style")).toBe(before);
});

test("the backmost sheet stays square and full-bleed as the fixed base", () => {
  // It replaces the separate backdrop element: nothing can show behind it.
  // That backmost sheet is About now, one depth behind the last case study.
  renderStack(1, 1);
  const base = screen.getByTestId(`paper-sheet-${SHEET_COUNT}`);
  expect(base).toHaveStyle({ transform: "rotate(0deg)" });
  expect(parseFloat(base.style.bottom)).toBe(0);
});

test("renders About as one more sheet behind the last case study", () => {
  renderStack(0, 0);
  const sheet = screen.getByTestId(`paper-sheet-${SHEET_COUNT}`);
  expect(sheet).toBeInTheDocument();
  expect(screen.getByText(ABOUT_PAGE.title)).toBeInTheDocument();
  // Not part of the case-study set: the page indicator and the next-project
  // cycle both read caseStudies directly and must not pick it up.
  expect(caseStudies.some((cs) => cs.slug === ABOUT_PAGE.slug)).toBe(false);
});

test("rides the name upward as the stack opens beneath it", () => {
  const { rerender } = renderStack(0, 0);
  expect(screen.getByTestId("hero-headline")).toHaveStyle({ transform: "translateY(-0vh)" });

  rerender(
    <PaperStack playIntro={false} fanProgress={1} sweepProgress={1} config={config} transitionMs={40} />
  );
  const lifted = screen.getByTestId("hero-headline").style.transform;
  const vh = Math.abs(parseFloat(lifted.replace(/[^-0-9.]/g, "")));
  expect(vh).toBeGreaterThan(0);
});
