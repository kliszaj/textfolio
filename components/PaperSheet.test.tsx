import { render, screen } from "@testing-library/react";
import { PaperSheet } from "./PaperSheet";
import type { FanSheetConfig } from "@/lib/fanSheet";

const config: FanSheetConfig = {
  mechanic: "bottom",
  recedePercents: [12, 8, 4, 0],
  brightnessFalloff: 0.05,
};

test("renders its children", () => {
  render(
    <PaperSheet depth={0} fanProgress={0} config={config} transitionMs={280} zIndex={40}>
      <span>Sheet content</span>
    </PaperSheet>
  );
  expect(screen.getByText("Sheet content")).toBeInTheDocument();
});

test("applies the computed recede as inline bottom/right insets", () => {
  render(
    <PaperSheet depth={0} fanProgress={1} config={config} transitionMs={280} zIndex={40}>
      <span>Sheet content</span>
    </PaperSheet>
  );
  const sheet = screen.getByTestId("paper-sheet-0");
  expect(sheet).toHaveStyle({ bottom: "12%", right: "0%" });
});

test("applies the given z-index", () => {
  render(
    <PaperSheet depth={2} fanProgress={0} config={config} transitionMs={280} zIndex={20}>
      <span>Sheet content</span>
    </PaperSheet>
  );
  expect(screen.getByTestId("paper-sheet-2")).toHaveStyle({ zIndex: 20 });
});
