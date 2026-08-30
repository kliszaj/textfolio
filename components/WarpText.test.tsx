import { render, screen } from "@testing-library/react";
import { WarpText } from "./WarpText";

test("keeps the readable fallback and readiness flag before WebGL2 starts", () => {
  render(<WarpText text="ADRIAN" />);

  const treatment = screen.getByTestId("warp-text");
  expect(treatment).toHaveAttribute("aria-label", "ADRIAN");
  expect(treatment).toHaveAttribute("data-webgl-ready", "false");
  expect(screen.getByText("ADRIAN")).toHaveAttribute("aria-hidden", "true");
});

test("forwards the shared headline typography to its fallback", () => {
  render(
    <WarpText
      text="ADRIAN"
      fontSize="var(--headline-font-size)"
      fontWeight={900}
      fontFamily='"PP Frama", sans-serif'
      letterSpacing={0}
      lineHeight={1}
    />
  );

  expect(screen.getByText("ADRIAN")).toHaveStyle({
    "--warp-text-font-size": "var(--headline-font-size)",
    "--warp-text-font-weight": "900",
    "--warp-text-font-family": '"PP Frama", sans-serif',
    "--warp-text-line-height": "1",
  });
});
