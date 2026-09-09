import { act, fireEvent, render, screen } from "@testing-library/react";
import { ASCIIText } from "./ASCIIText";

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

test("starts a temporary matrix-rain burst on the clicked letter", () => {
  jest.useFakeTimers();
  try {
    render(<ASCIIText text="ADRIAN" />);
    const treatment = screen.getByTestId("ascii-text");
    Object.defineProperty(treatment, "getBoundingClientRect", {
      value: () => ({ left: 0, top: 0, width: 600, height: 200, right: 600, bottom: 200 }),
    });

    fireEvent(treatment, pointer("pointerdown", { pointerId: 1, button: 0, clientX: 300, clientY: 100 }));
    expect(treatment).toHaveAttribute("data-raining", "3");

    act(() => jest.advanceTimersByTime(4000));
    expect(treatment).toHaveAttribute("data-raining", "3");

    fireEvent(treatment, pointer("pointerup", { pointerId: 1, button: 0 }));
    act(() => jest.advanceTimersByTime(1950));
    expect(treatment).toHaveAttribute("data-raining", "false");
  } finally {
    jest.useRealTimers();
  }
});

test("retargets the rain as a held pointer crosses different letters", () => {
  render(<ASCIIText text="ADRIAN" />);
  const treatment = screen.getByTestId("ascii-text");
  Object.defineProperty(treatment, "getBoundingClientRect", {
    value: () => ({ left: 0, top: 0, width: 600, height: 200, right: 600, bottom: 200 }),
  });

  fireEvent(treatment, pointer("pointerdown", { pointerId: 9, button: 0, clientX: 100 }));
  expect(treatment).toHaveAttribute("data-raining", "0");
  expect(treatment).toHaveAttribute("data-rain-held", "true");
  expect(treatment).toHaveAttribute("data-rain-position", "0.112");
  const cycle = treatment.dataset.rainCycle;

  fireEvent(treatment, pointer("pointermove", { pointerId: 9, clientX: 500 }));
  expect(treatment).toHaveAttribute("data-raining", "5");
  expect(treatment).toHaveAttribute("data-rain-position", "0.888");
  // Crossing a glyph boundary retargets one continuous field; it does not
  // restart the shower and pop a fresh animation into the next letter.
  expect(treatment.dataset.rainCycle).toBe(cycle);

  fireEvent(treatment, pointer("pointerup", { pointerId: 9, button: 0, clientX: 500 }));
  expect(treatment).toHaveAttribute("data-rain-held", "false");
});

test("keeps the rain interaction off during the intro", () => {
  render(<ASCIIText text="ADRIAN" interactive={false} />);
  const treatment = screen.getByTestId("ascii-text");
  fireEvent.pointerDown(treatment, { button: 0, clientX: 100, clientY: 50 });
  expect(treatment).toHaveAttribute("data-raining", "false");
});
