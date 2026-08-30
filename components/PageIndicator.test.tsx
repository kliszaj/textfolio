import { fireEvent, render, screen } from "@testing-library/react";
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
});

test("names each dot for the page it jumps to", () => {
  render(<PageIndicator caseStudies={studies} />);
  expect(screen.getByRole("button", { name: "Spotify Jam" })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Focals by North" })).toBeInTheDocument();
});

test("reveals the title in a chip on hover, and hides it again on leave", () => {
  render(<PageIndicator caseStudies={studies} />);
  expect(screen.queryByTestId("page-indicator-chip")).not.toBeInTheDocument();

  const dot = screen.getByRole("button", { name: "Focals by North" });
  fireEvent.pointerEnter(dot, { pointerType: "mouse" });
  const chip = screen.getByTestId("page-indicator-chip");
  expect(chip).toHaveTextContent("Focals by North");
  expect(chip).toHaveStyle({ backgroundColor: "#F850C0" });

  fireEvent.pointerLeave(dot);
  expect(screen.queryByTestId("page-indicator-chip")).not.toBeInTheDocument();
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
