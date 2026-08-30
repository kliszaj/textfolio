import { render, screen, fireEvent } from "@testing-library/react";
import { PaperSheet } from "./PaperSheet";
import type { FanSheetConfig } from "@/lib/fanSheet";

const SHEET_COUNT = 3;

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

function renderSheet(overrides: Partial<Parameters<typeof PaperSheet>[0]> = {}) {
  return render(
    <PaperSheet
      depth={0}
      fanProgress={0}
      sweepProgress={0}
      sheetCount={SHEET_COUNT}
      config={config}
      transitionMs={40}
      zIndex={40}
      {...overrides}
    >
      <span>Sheet content</span>
    </PaperSheet>
  );
}

test("renders its children", () => {
  renderSheet();
  expect(screen.getByText("Sheet content")).toBeInTheDocument();
});

test("applies the accumulated band inset as an inline bottom offset", () => {
  renderSheet({ depth: 0, fanProgress: 1, sweepProgress: 0 });
  // bands at sweep 0 are [12, 1.575, 0]: the reveal has only reached sheet 2
  const sheet = screen.getByTestId("paper-sheet-0");
  expect(parseFloat(sheet.style.bottom)).toBeCloseTo(13.575, 2);
});

test("applies the given z-index", () => {
  renderSheet({ depth: 2, zIndex: 20 });
  expect(screen.getByTestId("paper-sheet-2")).toHaveStyle({ zIndex: 20 });
});

test("tilts each sheet one step further down the stack once fully fanned", () => {
  renderSheet({ depth: 2, fanProgress: 1, sweepProgress: 1, zIndex: 20 });
  expect(screen.getByTestId("paper-sheet-2")).toHaveStyle({ transform: "rotate(-4.5deg)" });
});

test("holds deeper sheets square until the sweep reaches them", () => {
  renderSheet({ depth: 2, fanProgress: 1, sweepProgress: 0, zIndex: 20 });
  const transform = screen.getByTestId("paper-sheet-2").style.transform;
  const angle = Math.abs(parseFloat(transform.replace("rotate(", "")));
  expect(angle).toBeLessThan(4.5 / 2);
});

test("leaves the backmost sheet square as the fixed base of the stack", () => {
  renderSheet({ depth: SHEET_COUNT, fanProgress: 1, sweepProgress: 1, zIndex: 10 });
  const base = screen.getByTestId(`paper-sheet-${SHEET_COUNT}`);
  expect(base).toHaveStyle({ transform: "rotate(0deg)" });
  expect(parseFloat(base.style.bottom)).toBe(0);
});

test("tilts the hero too, as the first sheet in the stack", () => {
  renderSheet({ depth: 0, fanProgress: 1, sweepProgress: 0 });
  expect(screen.getByTestId("paper-sheet-0")).toHaveStyle({ transform: "rotate(-1.5deg)" });
});

test("holds its angle as the sweep passes, never rocking back", () => {
  renderSheet({ depth: 2, fanProgress: 1, sweepProgress: 1, zIndex: 20 });
  expect(screen.getByTestId("paper-sheet-2")).toHaveStyle({ transform: "rotate(-4.5deg)" });
});

test("pivots at the bottom edge so the sheet only ever swings upward", () => {
  // Rotating about the centre would see-saw one half down as the other rises.
  renderSheet({ depth: 2, fanProgress: 1, sweepProgress: 0, zIndex: 20 });
  expect(screen.getByTestId("paper-sheet-2").style.transformOrigin).toContain("100%");
});

test("rounds its corners so the sheets read as friendly cards", () => {
  renderSheet({ depth: 2, fanProgress: 1, sweepProgress: 1, zIndex: 20 });
  expect(screen.getByTestId("paper-sheet-2")).toHaveStyle({ borderRadius: "16px" });
});

test("casts a shadow so the stack reads as layered paper", () => {
  renderSheet({ depth: 2, fanProgress: 1, sweepProgress: 0, zIndex: 20 });
  const shadow = screen.getByTestId("paper-sheet-2").style.boxShadow;
  expect(shadow).not.toBe("");
});

test("brightens a sheet to full as the sweep reaches it", () => {
  renderSheet({ depth: 3, fanProgress: 1, sweepProgress: 0, zIndex: 10 });
  expect(screen.getByTestId("paper-sheet-3")).toHaveStyle({ filter: "brightness(0.85)" });
  renderSheet({ depth: 3, fanProgress: 1, sweepProgress: 1, zIndex: 10 });
  expect(screen.getAllByTestId("paper-sheet-3")[1]).toHaveStyle({ filter: "brightness(1)" });
});

test("hovering a sheet does not change its geometry", () => {
  // The sweep is driven entirely by cursor position. A sheet that reacted to
  // being hovered could move out from under the cursor and oscillate.
  renderSheet({ depth: 1, fanProgress: 1, sweepProgress: 0, zIndex: 30 });
  const sheet = screen.getByTestId("paper-sheet-1");
  const before = sheet.getAttribute("style");
  fireEvent.mouseEnter(sheet);
  expect(sheet.getAttribute("style")).toBe(before);
  fireEvent.mouseLeave(sheet);
  expect(sheet.getAttribute("style")).toBe(before);
});

test("extends well past both side edges so no layer shows from the sides", () => {
  renderSheet({ depth: 2, fanProgress: 1, sweepProgress: 0, zIndex: 20 });
  const sheet = screen.getByTestId("paper-sheet-2");
  // Negative insets on both sides push the sheet's own edges off-screen, so a
  // tilted sheet reveals the one behind it only along the bottom.
  expect(parseFloat(sheet.style.left)).toBeLessThan(0);
  expect(parseFloat(sheet.style.right)).toBeLessThan(0);
});

test("still pivots at the viewport's bottom-left corner, not the sheet's", () => {
  renderSheet({ depth: 2, fanProgress: 1, sweepProgress: 0, zIndex: 20 });
  const origin = screen.getByTestId("paper-sheet-2").style.transformOrigin;
  // The sheet is wider than the viewport, so the pivot sits inboard of its own
  // left edge -- strictly between 0% and 50% of the sheet's width.
  const originX = parseFloat(origin);
  expect(originX).toBeGreaterThan(0);
  expect(originX).toBeLessThan(50);
  expect(origin).toContain("100%");
});
