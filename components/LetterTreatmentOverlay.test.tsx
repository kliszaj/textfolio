import { render, screen } from "@testing-library/react";
import { LetterTreatmentOverlay } from "./LetterTreatmentOverlay";
import type { LetterTreatment } from "@/data/letterTreatments";

const treatments: LetterTreatment[] = [
  { position: 0, letter: "A", videoSrc: null, bgColor: "#E4C1C1", label: "placeholder-a" },
  { position: 1, letter: "D", videoSrc: "/videos/chrome.mp4", bgColor: "#C1D4E4", label: "chrome liquid metal" },
];

test("renders one treatment layer per entry", () => {
  render(<LetterTreatmentOverlay treatments={treatments} activeIndex={null} />);
  expect(screen.getByTestId("treatment-0")).toBeInTheDocument();
  expect(screen.getByTestId("treatment-1")).toBeInTheDocument();
});

test("only the active treatment layer is visible", () => {
  render(<LetterTreatmentOverlay treatments={treatments} activeIndex={1} />);
  expect(screen.getByTestId("treatment-1")).toHaveStyle({ opacity: 1 });
  expect(screen.getByTestId("treatment-0")).toHaveStyle({ opacity: 0 });
});

test("shows a placeholder label when videoSrc is null", () => {
  render(<LetterTreatmentOverlay treatments={treatments} activeIndex={0} />);
  expect(screen.getByText("placeholder-a")).toBeInTheDocument();
});

test("renders an actual video element when videoSrc is provided", () => {
  render(<LetterTreatmentOverlay treatments={treatments} activeIndex={1} />);
  const layer = screen.getByTestId("treatment-1");
  expect(layer.querySelector("video")).toHaveAttribute("src", "/videos/chrome.mp4");
});
