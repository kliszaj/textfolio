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
