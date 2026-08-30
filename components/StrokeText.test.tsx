import { render, screen } from "@testing-library/react";
import { StrokeText } from "./StrokeText";

test("renders an accessible SVG treatment while its host is unmeasured", () => {
  render(<StrokeText text="ADRIAN" />);

  const treatment = screen.getByTestId("stroke-text");
  expect(treatment).toHaveAttribute("aria-label", "ADRIAN");
  expect(treatment.querySelector("svg")).toBeInTheDocument();
  expect(treatment.querySelector("text")).toHaveTextContent("ADRIAN");
});

test("renders configurable outline and fill colors", () => {
  render(
    <StrokeText
      text="ADRIAN"
      strokeColor="#22D3EE"
      fillColor="#FDE047"
      strokeWidth={3}
      sketchStyle="clean"
      correctionIndex={undefined}
    />
  );

  const texts = screen.getByTestId("stroke-text").querySelectorAll("text");
  expect(texts[0]).toHaveAttribute("stroke", "#22D3EE");
  expect(texts[1]).toHaveAttribute("fill", "#FDE047");
  expect(texts[0]).toHaveAttribute("stroke-width", "3");
});

test("renders the finished sketch outright when animation is off", () => {
  // A hover after the load story should show the drawn, filled, corrected
  // word -- not replay the draw from nothing.
  render(<StrokeText text="ADRIAN" animate={false} correctionIndex={5} />);
  const root = screen.getByTestId("stroke-text");
  expect(root).toBeInTheDocument();
  // Nothing is left holding a full dash offset, which is the un-drawn state.
  const drawn = root.querySelectorAll<SVGPathElement>("path[pathLength]");
  drawn.forEach((path) => {
    expect(path.style.strokeDashoffset === "1").toBe(false);
  });
});
