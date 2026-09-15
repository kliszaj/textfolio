import { createEvent, fireEvent, render, screen } from "@testing-library/react";
import { LegoText } from "./LegoText";

test("keeps an accessible word while the LEGO canvas is decorative", () => {
  render(<LegoText text="ADRIAN" />);
  expect(screen.getByTestId("lego-text")).toHaveAttribute("data-ready", "false");
  expect(screen.getByRole("img", { name: "ADRIAN built from editable LEGO tiles" })).toBeInTheDocument();
  expect(screen.getByTestId("lego-text")).toHaveAttribute("data-edited-count", "0");
});

test("toggles every newly crossed cell once during a pointer drag", () => {
  const onToggleCell = jest.fn();
  const onEditingChange = jest.fn();
  render(
    <LegoText
      text="ADRIAN"
      onToggleCell={onToggleCell}
      onEditingChange={onEditingChange}
    />
  );
  const root = screen.getByTestId("lego-text");
  const canvas = screen.getByRole("img");
  Object.defineProperty(root, "offsetWidth", { configurable: true, value: 160 });
  Object.defineProperty(root, "offsetHeight", { configurable: true, value: 160 });

  const pointerEvent = (
    type: "pointerDown" | "pointerMove" | "pointerUp",
    offsetX: number,
    offsetY: number
  ) => {
    const event = createEvent[type](canvas, { button: 0, pointerId: 7 });
    Object.defineProperty(event, "offsetX", { value: offsetX });
    Object.defineProperty(event, "offsetY", { value: offsetY });
    Object.defineProperty(event, "clientX", { value: 50 });
    Object.defineProperty(event, "clientY", { value: 60 });
    fireEvent(canvas, event);
  };

  pointerEvent("pointerDown", 17, 17);
  pointerEvent("pointerMove", 20, 20);
  pointerEvent("pointerMove", 33, 17);
  pointerEvent("pointerMove", 17, 17);
  pointerEvent("pointerUp", 17, 17);

  expect(onToggleCell.mock.calls).toEqual([["1:1"], ["2:1"]]);
  expect(onEditingChange.mock.calls).toEqual([
    [true, { x: 50, y: 60 }],
    [false, { x: 50, y: 60 }],
  ]);

  // A new gesture can intentionally toggle that same square back again.
  pointerEvent("pointerDown", 17, 17);
  expect(onToggleCell).toHaveBeenLastCalledWith("1:1");
  expect(onToggleCell).toHaveBeenCalledTimes(3);
});

test("paints cells across an expanded canvas while keeping coordinates anchored to the word", () => {
  const onPaintCell = jest.fn();
  render(
    <LegoText
      text="ADRIAN"
      canvasArea={{ left: -80, top: -64, width: 320, height: 288 }}
      onPaintCell={onPaintCell}
    />
  );
  const root = screen.getByTestId("lego-text");
  const canvas = screen.getByRole("img");
  Object.defineProperty(root, "offsetWidth", { configurable: true, value: 160 });
  Object.defineProperty(root, "offsetHeight", { configurable: true, value: 160 });

  const pointer = createEvent.pointerDown(canvas, { button: 0, pointerId: 8 });
  Object.defineProperty(pointer, "offsetX", { value: 17 });
  Object.defineProperty(pointer, "offsetY", { value: 17 });
  fireEvent(canvas, pointer);

  expect(onPaintCell).toHaveBeenCalledWith("-4:-3");
});
