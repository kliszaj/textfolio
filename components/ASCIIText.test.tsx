import { act, fireEvent, render, screen } from "@testing-library/react";
import {
  ASCII_DECOMPOSE_MS,
  ASCII_REBUILD_BLANK_MS,
  ASCII_REBUILD_RAIN_MS,
  ASCII_REBUILD_SETTLE_MS,
  ASCII_REBUILD_TOTAL_MS,
  ASCIIText,
  asciiRebuildPhaseAt,
} from "./ASCIIText";

function pointer(type: string, properties: Record<string, number>) {
  const event = new Event(type, { bubbles: true, cancelable: true });
  for (const [name, value] of Object.entries(properties)) {
    Object.defineProperty(event, name, { value });
  }
  return event;
}

test("keeps an accessible text fallback while WebGL is unavailable", () => {
  render(<ASCIIText text="ADRIAN" />);

  const treatment = screen.getByTestId("ascii-text");
  expect(treatment).toHaveAttribute("aria-label", "ADRIAN");
  expect(treatment).toHaveAttribute("data-ready", "false");
  expect(treatment).toHaveAttribute("data-crt", "curved-scanline");
  expect(screen.getByText("ADRIAN")).toHaveAttribute("aria-hidden", "true");
});

test("decomposes, clears, rebuilds, and settles the whole word in sequence", () => {
  expect(asciiRebuildPhaseAt(0)).toEqual({ phase: "decompose", progress: 1 });
  expect(asciiRebuildPhaseAt(ASCII_DECOMPOSE_MS / 2)).toEqual({
    phase: "decompose",
    progress: 0.5,
  });
  expect(asciiRebuildPhaseAt(ASCII_DECOMPOSE_MS)).toEqual({ phase: "blank", progress: 0 });
  expect(asciiRebuildPhaseAt(ASCII_DECOMPOSE_MS + ASCII_REBUILD_BLANK_MS)).toEqual({
    phase: "rebuild",
    progress: 0,
  });
  expect(asciiRebuildPhaseAt(ASCII_REBUILD_TOTAL_MS - 1).phase).toBe("settle");
  expect(asciiRebuildPhaseAt(ASCII_REBUILD_TOTAL_MS)).toEqual({ phase: "idle", progress: 1 });
  expect(ASCII_REBUILD_TOTAL_MS).toBe(
    ASCII_DECOMPOSE_MS +
      ASCII_REBUILD_BLANK_MS +
      ASCII_REBUILD_RAIN_MS +
      ASCII_REBUILD_SETTLE_MS
  );
  expect(ASCII_REBUILD_RAIN_MS).toBeGreaterThan(1000);
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

test("does not force an isolation group in the default colour mode", () => {
  // The gradient pre is the only thing that needs isolating, and it is
  // display:none here. A compositing target built at mount for nothing is what
  // flashes before it has anything to rasterise.
  render(<ASCIIText text="ADRIAN" randomizeGlyphColors />);
  expect(screen.getByTestId("ascii-text")).toHaveAttribute("data-glyph-colors", "random");
});

test("isolates when the gradient pre is the one drawing", () => {
  render(<ASCIIText text="ADRIAN" randomizeGlyphColors={false} />);
  expect(screen.getByTestId("ascii-text")).toHaveAttribute("data-glyph-colors", "gradient");
});

test("clicking starts one temporary whole-word matrix rebuild", () => {
  jest.useFakeTimers();
  try {
    render(<ASCIIText text="ADRIAN" />);
    const treatment = screen.getByTestId("ascii-text");
    Object.defineProperty(treatment, "getBoundingClientRect", {
      value: () => ({ left: 0, top: 0, width: 600, height: 200, right: 600, bottom: 200 }),
    });

    fireEvent(treatment, pointer("pointerdown", { pointerId: 1, button: 0, clientX: 300, clientY: 100 }));
    expect(treatment).toHaveAttribute("data-raining", "word");
    expect(treatment).toHaveAttribute("data-rain-position", "0.500");

    act(() => jest.advanceTimersByTime(ASCII_REBUILD_TOTAL_MS));
    expect(treatment).toHaveAttribute("data-raining", "false");
  } finally {
    jest.useRealTimers();
  }
});

test("uses the click as the rebuild origin without following a later drag", () => {
  render(<ASCIIText text="ADRIAN" />);
  const treatment = screen.getByTestId("ascii-text");
  Object.defineProperty(treatment, "getBoundingClientRect", {
    value: () => ({ left: 0, top: 0, width: 600, height: 200, right: 600, bottom: 200 }),
  });

  fireEvent(treatment, pointer("pointerdown", { pointerId: 9, button: 0, clientX: 100 }));
  expect(treatment).toHaveAttribute("data-raining", "word");
  expect(treatment).toHaveAttribute("data-rain-position", "0.112");
  const cycle = treatment.dataset.rainCycle;

  fireEvent(treatment, pointer("pointermove", { pointerId: 9, clientX: 500 }));
  expect(treatment).toHaveAttribute("data-raining", "word");
  expect(treatment).toHaveAttribute("data-rain-position", "0.112");
  expect(treatment.dataset.rainCycle).toBe(cycle);
});

test("keeps the rain interaction off during the intro", () => {
  render(<ASCIIText text="ADRIAN" interactive={false} />);
  const treatment = screen.getByTestId("ascii-text");
  fireEvent.pointerDown(treatment, { button: 0, clientX: 100, clientY: 50 });
  expect(treatment).toHaveAttribute("data-raining", "false");
});
