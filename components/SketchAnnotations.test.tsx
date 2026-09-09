import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { SKETCH_ANNOTATIONS_STORAGE_KEY, SketchAnnotations } from "./SketchAnnotations";
import { CORRECTION_INK, CORRECTION_PEN_SCALE, DEFAULT_STROKE_TEXT_CONFIG } from "@/lib/strokeText";

beforeEach(() => window.localStorage.clear());

function pointer(type: string, properties: Record<string, number | string>) {
  const event = new Event(type, { bubbles: true, cancelable: true });
  for (const [name, value] of Object.entries(properties)) {
    Object.defineProperty(event, name, { value });
  }
  return event;
}

test("draws normalized red strokes and persists them locally", () => {
  const onDrawingChange = jest.fn();
  render(<SketchAnnotations active onDrawingChange={onDrawingChange} />);
  const canvas = screen.getByTestId("sketch-annotations");
  Object.defineProperty(canvas, "getBoundingClientRect", {
    value: () => ({ left: 0, top: 0, width: 200, height: 100, right: 200, bottom: 100 }),
  });

  fireEvent(canvas, pointer("pointerdown", { pointerId: 4, pointerType: "mouse", button: 0, clientX: 20, clientY: 30 }));
  fireEvent(canvas, pointer("pointermove", { pointerId: 4, pointerType: "mouse", clientX: 120, clientY: 70 }));
  fireEvent(canvas, pointer("pointerup", { pointerId: 4, pointerType: "mouse", button: 0, clientX: 120, clientY: 70 }));

  expect(onDrawingChange).toHaveBeenNthCalledWith(1, true, { x: 20, y: 30 });
  expect(onDrawingChange).toHaveBeenLastCalledWith(false, { x: 120, y: 70 });
  const saved = JSON.parse(window.localStorage.getItem(SKETCH_ANNOTATIONS_STORAGE_KEY) ?? "[]");
  expect(saved[0].points).toEqual([
    { x: 0.1, y: 0.3 },
    { x: 0.6, y: 0.7 },
  ]);
  const path = canvas.querySelector("path");
  expect(path).toHaveClass("stroke");
  expect(path).toHaveClass("boil-line");
  expect(path).toHaveAttribute("stroke", CORRECTION_INK);
  expect(path).toHaveAttribute(
    "stroke-width",
    String(DEFAULT_STROKE_TEXT_CONFIG.strokeWidth * CORRECTION_PEN_SCALE)
  );
  expect(screen.getByTestId("sketch-annotation-ink")).toHaveAttribute(
    "filter",
    expect.stringContaining("annotation-sketch-")
  );
  expect(canvas.querySelectorAll("feComposite")).toHaveLength(4);
});

test("restores annotations on a later mount", async () => {
  window.localStorage.setItem(
    SKETCH_ANNOTATIONS_STORAGE_KEY,
    JSON.stringify([{ points: [{ x: 0.2, y: 0.4 }, { x: 0.8, y: 0.6 }] }])
  );
  render(<SketchAnnotations active />);
  await waitFor(() => expect(screen.getByTestId("sketch-annotations").querySelector("path")).toBeInTheDocument());
});

test("does not begin a stroke while inactive", () => {
  render(<SketchAnnotations active={false} />);
  const canvas = screen.getByTestId("sketch-annotations");
  fireEvent.pointerDown(canvas, { pointerId: 1, button: 0, clientX: 10, clientY: 10 });
  expect(canvas.querySelector("path")).not.toBeInTheDocument();
});

test("does not fade the correction-red ink", () => {
  const css = readFileSync("components/SketchAnnotations.module.css", "utf8");
  const strokeRule = css.match(/\.stroke\s*\{([^}]+)\}/)?.[1] ?? "";
  expect(strokeRule).not.toBe("");
  expect(strokeRule).not.toMatch(/opacity\s*:/);
});

test("can start on the headline and continue across the full-page layer", () => {
  const canStartDrawing = jest.fn(({ x }: { x: number }) => x < 100);
  render(<SketchAnnotations active canStartDrawing={canStartDrawing} />);
  const canvas = screen.getByTestId("sketch-annotations");
  Object.defineProperty(canvas, "getBoundingClientRect", {
    value: () => ({ left: 0, top: 0, width: 1000, height: 700, right: 1000, bottom: 700 }),
  });

  fireEvent(canvas, pointer("pointerdown", { pointerId: 8, button: 0, clientX: 50, clientY: 100 }));
  fireEvent(window, pointer("pointermove", { pointerId: 8, clientX: 900, clientY: 650 }));
  fireEvent(window, pointer("pointerup", { pointerId: 8, button: 0, clientX: 900, clientY: 650 }));

  const saved = JSON.parse(window.localStorage.getItem(SKETCH_ANNOTATIONS_STORAGE_KEY) ?? "[]");
  expect(saved[0].points.at(-1)).toEqual({ x: 0.9, y: 650 / 700 });
});
