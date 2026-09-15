import { createEvent, fireEvent, render, screen, within } from "@testing-library/react";
import { LEGO_BUILDER_STORAGE_KEY } from "@/lib/legoBuilder";
import { LegoBuilder } from "./LegoBuilder";

const push = jest.fn();
jest.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
}));

beforeEach(() => {
  window.localStorage.clear();
  push.mockClear();
});

test("selects one supplied block at a time and saves painted cells for the homepage", () => {
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

  fireEvent.click(screen.getByRole("button", { name: /^Save$/ }));
  const saved = JSON.parse(window.localStorage.getItem(LEGO_BUILDER_STORAGE_KEY) ?? "{}");
  expect(saved.cells["1:1"]).toBe("/assets/lego-blocks/lego-block-11.png");
  expect(screen.getByText("Saved to the main site")).toBeInTheDocument();
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

  fireEvent.click(screen.getByRole("button", { name: /Save & view homepage/i }));
  expect(push).toHaveBeenCalledWith("/");
  const saved = JSON.parse(window.localStorage.getItem(LEGO_BUILDER_STORAGE_KEY) ?? "{}");
  expect(saved.showDefaultText).toBe(false);
  expect(saved.backgroundTilePath).toBe("/assets/lego-blocks/lego-block-03.png");
});
