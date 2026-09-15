import { createEvent, fireEvent, render, screen, within } from "@testing-library/react";
import { LEGO_BUILDER_STORAGE_KEY } from "@/lib/legoBuilder";
import { LegoBuilder } from "./LegoBuilder";

beforeEach(() => {
  window.localStorage.clear();
});

test("selects one supplied block at a time and saves a browser draft", () => {
  render(<LegoBuilder />);
  const blockPalette = screen.getByRole("group", { name: "Block color" });
  const yellow = within(blockPalette).getByRole("button", { name: "Yellow" });
  fireEvent.click(yellow);
  expect(yellow).toHaveAttribute("aria-pressed", "true");

  const root = screen.getByTestId("lego-text");
  const canvas = screen.getByRole("img", { name: /ADRIAN built from editable LEGO tiles/i });
  Object.defineProperty(root, "offsetWidth", { configurable: true, value: 160 });
  Object.defineProperty(root, "offsetHeight", { configurable: true, value: 160 });
  const pointer = createEvent.pointerDown(canvas, { button: 0, pointerId: 4 });
  Object.defineProperty(pointer, "offsetX", { value: 17 });
  Object.defineProperty(pointer, "offsetY", { value: 17 });
  fireEvent(canvas, pointer);
  const pointerUp = createEvent.pointerUp(canvas, { button: 0, pointerId: 4 });
  Object.defineProperty(pointerUp, "offsetX", { value: 17 });
  Object.defineProperty(pointerUp, "offsetY", { value: 17 });
  fireEvent(canvas, pointerUp);

  fireEvent.click(screen.getByRole("button", { name: "Save draft" }));
  const saved = JSON.parse(window.localStorage.getItem(LEGO_BUILDER_STORAGE_KEY) ?? "{}");
  expect(saved.cells["1:1"]).toBe("/assets/lego-blocks/lego-block-11.png");
  expect(screen.getByText("Browser draft saved")).toBeInTheDocument();
});

test("shows a toggleable 50-percent red original-font tracing guide", () => {
  render(<LegoBuilder />);

  const guide = screen.getByTestId("lego-builder-trace-guide");
  expect(guide).toHaveTextContent("ADRIAN");
  expect(guide).toHaveAttribute("aria-hidden", "true");
  expect(guide).toHaveAttribute("data-visible", "true");

  fireEvent.click(screen.getByRole("button", { name: "Hide font guide" }));
  expect(guide).toHaveAttribute("data-visible", "false");
  expect(screen.getByRole("button", { name: "Show font guide" })).toBeInTheDocument();
});

test("changes the baseplate and can start from a completely blank grid", () => {
  render(<LegoBuilder />);
  const baseplatePalette = screen.getByRole("group", { name: "Baseplate color" });
  fireEvent.click(within(baseplatePalette).getByRole("button", { name: "Gray" }));
  fireEvent.click(screen.getByRole("button", { name: "Clear canvas" }));

  expect(screen.getByText("Building from a blank grid")).toBeInTheDocument();
  expect(screen.getByTestId("lego-builder-baseplate")).toHaveStyle({
    backgroundColor: "#A0A0A0",
  });

  fireEvent.click(screen.getByRole("button", { name: "Save draft" }));
  const saved = JSON.parse(window.localStorage.getItem(LEGO_BUILDER_STORAGE_KEY) ?? "{}");
  expect(saved.showDefaultText).toBe(false);
  expect(saved.backgroundTilePath).toBe("/assets/lego-blocks/lego-block-03.png");
});

test("exports the complete repository-backed homepage default", () => {
  render(<LegoBuilder />);
  fireEvent.change(screen.getByRole("slider", { name: "Horizontal tiles" }), {
    target: { value: "4" },
  });

  const exportLink = screen.getByRole("link", { name: "Export homepage default" });
  expect(exportLink).toHaveAttribute("download", "lego-default.json");
  const href = exportLink.getAttribute("href") ?? "";
  const exported = JSON.parse(decodeURIComponent(href.split(",", 2)[1]));
  expect(exported).toMatchObject({
    backgroundTilePath: "/assets/lego-blocks/lego-block-20.png",
    faceTilePath: "/assets/lego-blocks/lego-block-11.png",
    extrusionTilePath: "/assets/lego-blocks/lego-block-16.png",
    extrusionOffsetColumns: 4,
    extrusionOffsetRows: -3,
  });
});
