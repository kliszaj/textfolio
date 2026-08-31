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

test("renders the finished sketch outright when animation is off", () => {
  // A hover after the load story should show the drawn, filled, corrected
  // word -- not replay the draw from nothing.
  render(<StrokeText text="ADRIAN" animate={false} correctionIndex={5} />);
  const root = screen.getByTestId("stroke-text");
  expect(root).toBeInTheDocument();
  // Nothing is left holding a full dash offset, which is the un-drawn state.
  const drawn = root.querySelectorAll<SVGPathElement>("path[pathLength]");
  drawn.forEach((path) => {
    expect(path.style.strokeDashoffset === "1").toBe(false);
  });
});

describe("the correction mark", () => {
  // jsdom has no SVG layout, so nothing is measurable and the marks never
  // render. Stub the one measurement they need.
  beforeEach(() => {
    (SVGElement.prototype as unknown as { getBBox: () => DOMRect }).getBBox = () =>
      ({ x: 100, y: 40, width: 60, height: 80 }) as DOMRect;
  });
  afterEach(() => {
    delete (SVGElement.prototype as unknown as { getBBox?: () => DOMRect }).getBBox;
  });

  test("strikes the glyph out and writes the replacement in above it", () => {
    render(<StrokeText text="ADRIAN" animate={false} correctionIndex={5} />);
    const root = screen.getByTestId("stroke-text");

    expect(root.querySelectorAll("[data-correction-cross]")).toHaveLength(2);
    expect(root.querySelector("[data-correction-letter]")).toBeInTheDocument();
    // The circle is gone.
    expect(root.querySelector("[data-correction-loop]")).not.toBeInTheDocument();
  });

  test("places the written letter under its own transform and pen", () => {
    render(<StrokeText text="ADRIAN" animate={false} correctionIndex={5} />);
    const letter = screen.getByTestId("stroke-text").querySelector("[data-correction-letter]")!;

    // Drawn under a scale, so it carries a pen width of its own rather than
    // inheriting the group's and coming out far heavier than the X.
    expect(letter.getAttribute("transform")).toMatch(/^translate\(.+\) scale\(/);
    expect(letter).toHaveAttribute("stroke-width");
    expect(letter).toHaveAttribute("pathLength", "1");
  });

  test("draws no correction at all when no glyph is singled out", () => {
    render(<StrokeText text="ADRIAN" animate={false} />);
    const root = screen.getByTestId("stroke-text");
    expect(root.querySelector("[data-correction-letter]")).not.toBeInTheDocument();
    expect(root.querySelectorAll("[data-correction-cross]")).toHaveLength(0);
  });
});

describe("the pen tip never shows before its stroke", () => {
  beforeEach(() => {
    (SVGElement.prototype as unknown as { getBBox: () => DOMRect }).getBBox = () =>
      ({ x: 100, y: 40, width: 60, height: 80 }) as DOMRect;
  });
  afterEach(() => {
    delete (SVGElement.prototype as unknown as { getBBox?: () => DOMRect }).getBBox;
  });

  test("keeps every correction mark hidden until it is drawn", () => {
    // A round cap on a fully offset dash still paints: the pen tip showed as a
    // red dot on the page for the whole of the sketch before it.
    render(<StrokeText text="ADRIAN" animate correctionIndex={5} />);
    const root = screen.getByTestId("stroke-text");

    const marks = root.querySelectorAll<SVGPathElement>(
      "[data-correction-cross], [data-correction-letter]"
    );
    expect(marks.length).toBe(3);
    marks.forEach((mark) => {
      expect(mark.style.opacity).toBe("0");
    });
  });

  test("shows them outright when the sketch is not animating", () => {
    render(<StrokeText text="ADRIAN" animate={false} correctionIndex={5} />);
    const root = screen.getByTestId("stroke-text");

    root
      .querySelectorAll<SVGPathElement>("[data-correction-cross], [data-correction-letter]")
      .forEach((mark) => {
        expect(mark.style.opacity).not.toBe("0");
      });
  });
});
