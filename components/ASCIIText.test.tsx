import { render, screen } from "@testing-library/react";
import { ASCIIText } from "./ASCIIText";

test("keeps an accessible text fallback while WebGL is unavailable", () => {
  render(<ASCIIText text="ADRIAN" />);

  const treatment = screen.getByTestId("ascii-text");
  expect(treatment).toHaveAttribute("aria-label", "ADRIAN");
  expect(treatment).toHaveAttribute("data-ready", "false");
  expect(treatment).toHaveAttribute("data-crt", "curved-scanline");
  expect(screen.getByText("ADRIAN")).toHaveAttribute("aria-hidden", "true");
});

test("accepts the configurable ASCII treatment without changing its DOM contract", () => {
  render(
    <ASCIIText
      text="ADRIAN"
      asciiFontSize={16}
      textFontSize={280}
      planeScale={1.1}
      extrudeDepth={0.8}
      tiltStrength={0.7}
      crtCurvature={0.15}
      randomizeGlyphColors={false}
    />
  );

  expect(screen.getByTestId("ascii-text")).toBeInTheDocument();
  expect(screen.getByText("ADRIAN")).toBeInTheDocument();
});
