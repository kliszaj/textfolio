import { act, fireEvent, render, screen } from "@testing-library/react";
import type { CaseStudy } from "@/data/caseStudies";
import { SHEET_OVERSCAN_PERCENT } from "@/lib/fanSheet";
import { PageIndicator } from "./PageIndicator";

const studies: CaseStudy[] = [
  { slug: "one", title: "Spotify Jam", thumbnailColor: "#15FF76", blurb: "b1" },
  { slug: "two", title: "Focals by North", thumbnailColor: "#F850C0", blurb: "b2" },
];

test("shows one dot per case study, inked with that sheet's colour", () => {
  render(<PageIndicator caseStudies={studies} />);
  const dots = screen.getAllByTestId("page-indicator-dot");

  expect(dots).toHaveLength(2);
  expect(dots[0]).toHaveStyle({ backgroundColor: "#15FF76" });
  expect(dots[1]).toHaveStyle({ backgroundColor: "#F850C0" });
  expect(dots[0]).toHaveStyle({ width: "14px", height: "14px" });
});

test("names each dot for the page it jumps to", () => {
  render(<PageIndicator caseStudies={studies} />);
  expect(screen.getByRole("button", { name: "Spotify Jam" })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Focals by North" })).toBeInTheDocument();
});

test("reveals the title in a chip on hover, and hides it again on leave", () => {
  render(<PageIndicator caseStudies={studies} />);
  expect(screen.queryByTestId("page-indicator-chip")).not.toBeInTheDocument();

  const hitArea = screen.getAllByTestId("page-indicator-hit-area")[1];
  expect(hitArea).toHaveStyle({ width: "94px" });
  fireEvent.pointerEnter(hitArea, { pointerType: "mouse" });
  const chip = screen.getByTestId("page-indicator-chip");
  expect(chip).toHaveTextContent("Focals by North");
  expect(chip).toHaveStyle({ backgroundColor: "#F850C0" });
  expect(chip).toHaveStyle({ left: "26px" });

  fireEvent.pointerLeave(hitArea);
  expect(screen.queryByTestId("page-indicator-chip")).not.toBeInTheDocument();
});

test("scales up the dot whenever its chip is revealed, not just when the cursor sits on the dot itself", () => {
  // The hit area reaches well past the dot so the chip stays open while
  // moving the cursor toward it, but the dot only scaled via CSS :hover --
  // which needs the cursor directly over the 14px dot, not just somewhere in
  // the wider hit area. Drive the scale off the same revealed state as the
  // chip instead, so the two always agree.
  render(<PageIndicator caseStudies={studies} />);
  const hitAreas = screen.getAllByTestId("page-indicator-hit-area");
  const dots = screen.getAllByTestId("page-indicator-dot");

  fireEvent.pointerEnter(hitAreas[1], { pointerType: "mouse" });
  expect(dots[1].style.transform).toContain("scale(1.5)");
  expect(dots[0].style.transform || "").not.toContain("scale(1.5)");

  fireEvent.pointerLeave(hitAreas[1]);
  expect(dots[1].style.transform || "").not.toContain("scale(1.5)");
});

test("keyboard focus reveals the chip too, so the rail is not hover-only", () => {
  render(<PageIndicator caseStudies={studies} />);
  fireEvent.focus(screen.getByRole("button", { name: "Spotify Jam" }));
  expect(screen.getByTestId("page-indicator-chip")).toHaveTextContent("Spotify Jam");
});

test("hands the chosen case study back so it lifts like a clicked sheet", () => {
  const onSelect = jest.fn();
  render(<PageIndicator caseStudies={studies} onSelect={onSelect} />);

  fireEvent.click(screen.getByRole("button", { name: "Focals by North" }));
  expect(onSelect).toHaveBeenCalledWith(studies[1]);
});

test("also selects the page when the revealed chip itself is clicked, not just the dot", () => {
  const onSelect = jest.fn();
  render(<PageIndicator caseStudies={studies} onSelect={onSelect} />);

  const hitArea = screen.getAllByTestId("page-indicator-hit-area")[1];
  fireEvent.pointerEnter(hitArea, { pointerType: "mouse" });
  fireEvent.click(screen.getByTestId("page-indicator-chip"));
  expect(onSelect).toHaveBeenCalledWith(studies[1]);
});

test("fades out as the stack fans, matching the scroll arrow", () => {
  const { rerender } = render(<PageIndicator caseStudies={studies} fanProgress={0} />);
  expect(screen.getByTestId("page-indicator")).toHaveStyle({ opacity: "1" });

  rerender(<PageIndicator caseStudies={studies} fanProgress={0.25} />);
  expect(screen.getByTestId("page-indicator")).toHaveStyle({ opacity: "0.5" });

  rerender(<PageIndicator caseStudies={studies} fanProgress={0.5} />);
  expect(screen.getByTestId("page-indicator")).toHaveStyle({ opacity: "0" });
});

test("stops taking clicks once it has faded out", () => {
  render(<PageIndicator caseStudies={studies} fanProgress={1} />);
  expect(screen.getByTestId("page-indicator")).toHaveStyle({ pointerEvents: "none" });
});

test("clears the paper sheet's overscan so the rail lands in the real viewport", () => {
  // Hero lives on a sheet that starts at left: -60%, so an inset measured from
  // the hero's own left edge is off-screen. .coolS counters the same overscan.
  render(<PageIndicator caseStudies={studies} />);
  expect(screen.getByTestId("page-indicator").style.left).toContain(
    `${SHEET_OVERSCAN_PERCENT}vw`
  );
});

test("the wheel never highlights or cycles the rail", () => {
  // This rail briefly cycled by wheel input directly; that felt unexpected
  // and unnatural in practice and was removed. The wheel now only drives the
  // stack's own reveal (see useFanProgress) -- this rail highlights by hover
  // or keyboard focus alone.
  render(<PageIndicator caseStudies={studies} />);
  fireEvent.wheel(window, { deltaY: 80 });
  fireEvent.wheel(window, { deltaY: 80 });
  fireEvent.wheel(window, { deltaY: -80 });
  expect(screen.queryByTestId("page-indicator-chip")).not.toBeInTheDocument();
});

describe("Enter selects whichever page is highlighted", () => {
  test("wheel scrolling first does not make Enter select anything", () => {
    // Confirms wheel input still isn't wired to this rail at all, from the
    // Enter side too -- not just that no chip appears.
    const onSelect = jest.fn();
    render(<PageIndicator caseStudies={studies} onSelect={onSelect} />);
    fireEvent.wheel(window, { deltaY: 80 });
    fireEvent.keyDown(window, { key: "Enter" });
    expect(onSelect).not.toHaveBeenCalled();
  });

  test("selects the hover-highlighted page too", () => {
    const onSelect = jest.fn();
    render(<PageIndicator caseStudies={studies} onSelect={onSelect} />);
    fireEvent.pointerEnter(screen.getAllByTestId("page-indicator-hit-area")[1], {
      pointerType: "mouse",
    });
    fireEvent.keyDown(window, { key: "Enter" });
    expect(onSelect).toHaveBeenCalledWith(studies[1]);
  });

  test("defers to a genuinely tab-focused dot's own native Enter handling", () => {
    // A real focused <button> dispatches its own click on Enter (which
    // bubbles to the hit area's onClick) -- jsdom doesn't simulate that
    // automatically from a keydown, but the global handler must still
    // recognise a focused dot and step aside, or a real browser would fire
    // onSelect twice for the same Enter press.
    const onSelect = jest.fn();
    render(<PageIndicator caseStudies={studies} onSelect={onSelect} />);
    const dot = screen.getByRole("button", { name: "Focals by North" });
    act(() => dot.focus());
    fireEvent.keyDown(dot, { key: "Enter" });
    expect(onSelect).not.toHaveBeenCalled();

    // The button's own native behaviour, fired explicitly since jsdom won't:
    fireEvent.click(dot);
    expect(onSelect).toHaveBeenCalledTimes(1);
  });

  test("does nothing when no page is highlighted", () => {
    const onSelect = jest.fn();
    render(<PageIndicator caseStudies={studies} onSelect={onSelect} />);
    fireEvent.keyDown(window, { key: "Enter" });
    expect(onSelect).not.toHaveBeenCalled();
  });
});
