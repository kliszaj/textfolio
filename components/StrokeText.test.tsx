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
  const drawn = root.querySelectorAll<SVGPathElement>(
    "[data-correction-cross], [data-correction-letter]"
  );
  drawn.forEach((path) => {
    expect(path.style.strokeDashoffset).toBe("0");
  });
});

test("keeps the corrected final N hatch at the page-wide pencil angle", () => {
  const getBBox = () => ({ x: 100, y: 40, width: 300, height: 80 }) as DOMRect;
  const getExtentOfChar = () => ({ x: 340, y: 40, width: 40, height: 80 }) as DOMRect;
  (SVGElement.prototype as unknown as { getBBox: () => DOMRect }).getBBox = getBBox;
  (
    SVGElement.prototype as unknown as { getExtentOfChar: (index: number) => DOMRect }
  ).getExtentOfChar = getExtentOfChar;
  try {
    render(<StrokeText text="ADRIAN" animate={false} fillMode="hatch" correctionIndex={5} />);
    const root = screen.getByTestId("stroke-text");
    const correction = root.querySelector('[data-testid="stroke-text-correction"]')!;
    const mirroredGlyph = correction.querySelector("g[transform]")!;
    const hatch = correction.querySelector('[data-testid="stroke-text-correction-hatch-fill"]')!;
    const mainHatch = screen.getByTestId("stroke-text-hatch-fill");
    const hatchMask = screen.getByTestId("stroke-text-hatch-mask");

    expect(mirroredGlyph.getAttribute("transform")).toContain("scale(-1, 1)");
    expect(hatch).toBeInTheDocument();
    expect(hatch.querySelectorAll("[data-correction-hatch-stroke]")).not.toHaveLength(0);
    expect(mirroredGlyph.contains(hatch)).toBe(false);
    const firstHatchStroke = hatch.querySelector<SVGLineElement>("[data-correction-hatch-stroke]")!;
    expect(Number(firstHatchStroke.getAttribute("x1"))).toBeLessThan(
      Number(firstHatchStroke.getAttribute("x2"))
    );
    expect(Number(firstHatchStroke.getAttribute("y1"))).toBeGreaterThan(
      Number(firstHatchStroke.getAttribute("y2"))
    );
    expect(mainHatch).toHaveAttribute("mask", `url(#${hatchMask.id})`);
  } finally {
    delete (SVGElement.prototype as unknown as { getBBox?: unknown }).getBBox;
    delete (SVGElement.prototype as unknown as { getExtentOfChar?: unknown }).getExtentOfChar;
  }
});

describe("the outline reveals itself independently of stroke-dasharray, on Firefox", () => {
  // Firefox does not animate stroke-dasharray/stroke-dashoffset set through an
  // inline style on SVG text at all: the letters render fully stroked from
  // the first frame, so the whole word appeared to pop in instead of drawing.
  // A clip-path sweep only ever crops what is already rendered, so it reveals
  // the word left to right regardless of whether that dash animation is
  // doing anything underneath it. Scoped to Firefox specifically -- running
  // it everywhere fought the per-character stagger on engines where the dash
  // animation already draws correctly (see "isFirefox" in StrokeText.tsx).
  let userAgentSpy: jest.SpyInstance;
  beforeEach(() => {
    (SVGElement.prototype as unknown as { getBBox: () => DOMRect }).getBBox = () =>
      ({ x: 100, y: 40, width: 60, height: 80 }) as DOMRect;
    userAgentSpy = jest
      .spyOn(window.navigator, "userAgent", "get")
      .mockReturnValue(
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:130.0) Gecko/20100101 Firefox/130.0"
      );
  });
  afterEach(() => {
    delete (SVGElement.prototype as unknown as { getBBox?: () => DOMRect }).getBBox;
    userAgentSpy.mockRestore();
  });

  test("starts the outline's clip fully closed", () => {
    render(<StrokeText text="ADRIAN" />);
    const wipe = screen.getByTestId("stroke-text-outline-wipe");
    expect(wipe.getAttribute("width")).toBe("0");
  });

  test("opens the outline's clip to the word's full width once drawn", () => {
    render(<StrokeText text="ADRIAN" animate={false} />);
    const wipe = screen.getByTestId("stroke-text-outline-wipe");
    // The measured box pads the raw getBBox() stub (60 wide) by
    // max(strokeWidth, height * 0.12), so the clip's full-open width is
    // wider than the stub's raw 60, not equal to it.
    const padding = Math.max(1.4, 80 * 0.12);
    expect(Number(wipe.getAttribute("width"))).toBeCloseTo(60 + padding * 2, 5);
  });

  test("clips the stroke layer to that same reveal", () => {
    render(<StrokeText text="ADRIAN" />);
    const stroke = screen.getByTestId("stroke-text").querySelector("[data-stroke-layer]")!;
    const wipe = screen.getByTestId("stroke-text-outline-wipe");
    const clipPathId = wipe.closest("clipPath")!.id;
    expect(stroke.getAttribute("clip-path")).toBe(`url(#${clipPathId})`);
  });
});

test("leaves the per-character stagger alone on every other engine", () => {
  // The Firefox-only clip sweep reveals the whole word in one left-to-right
  // movement, independent of how far any single letter's own stroke has
  // drawn. Running it on engines where the per-character dash animation
  // already works correctly fought that stagger -- the last letter stopped
  // looking staggered and read as arriving with the rest of the word. It
  // must not run (and the stroke layer must carry no clip-path at all) on
  // anything that doesn't report itself as Firefox.
  (SVGElement.prototype as unknown as { getBBox: () => DOMRect }).getBBox = () =>
    ({ x: 100, y: 40, width: 60, height: 80 }) as DOMRect;
  try {
    render(<StrokeText text="ADRIAN" />);
    const root = screen.getByTestId("stroke-text");
    expect(root.querySelector('[data-testid="stroke-text-outline-wipe"]')).not.toBeInTheDocument();
    const stroke = root.querySelector("[data-stroke-layer]")!;
    expect(stroke).not.toHaveAttribute("clip-path");
  } finally {
    delete (SVGElement.prototype as unknown as { getBBox?: () => DOMRect }).getBBox;
  }
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
  });

  test("draws no correction at all when no glyph is singled out", () => {
    render(<StrokeText text="ADRIAN" animate={false} />);
    const root = screen.getByTestId("stroke-text");
    expect(root.querySelector("[data-correction-letter]")).not.toBeInTheDocument();
    expect(root.querySelectorAll("[data-correction-cross]")).toHaveLength(0);
  });

  test("prefers getExtentOfChar for the mark's position, when the engine has it", () => {
    // getBBox on an unpositioned tspan is a known WebKit quirk area: some
    // engines report the parent <text>'s box instead of just that glyph's,
    // which is what made the correction span the whole word instead of one
    // letter. getExtentOfChar measures the character directly and can't fall
    // back to a sibling's or the whole run's extent.
    const getExtentOfChar = jest.fn(() => ({ x: 300, y: 40, width: 25, height: 80 }) as DOMRect);
    (
      SVGElement.prototype as unknown as { getExtentOfChar: typeof getExtentOfChar }
    ).getExtentOfChar = getExtentOfChar;
    try {
      render(<StrokeText text="ADRIAN" animate={false} correctionIndex={5} />);
      const letter = screen.getByTestId("stroke-text").querySelector("[data-correction-letter]")!;
      expect(getExtentOfChar).toHaveBeenCalledWith(5);
      // The letter's x is derived from box.x (300 from getExtentOfChar), not
      // from the whole-word box.x (100) the stubbed getBBox in this suite's
      // beforeEach would have given if the fallback path had run instead.
      const x = Number(letter.getAttribute("transform")!.match(/translate\(([\d.-]+)/)![1]);
      expect(x).toBeGreaterThan(200);
    } finally {
      delete (SVGElement.prototype as unknown as { getExtentOfChar?: unknown }).getExtentOfChar;
    }
  });

  test("scopes the tspan fallback to the stroke layer, not any data-stroke-char", () => {
    // Once the correction has rendered once, its own mirrored glyph also
    // carries data-stroke-char. An unscoped query would count it as a
    // sibling character and could pick up the wrong element.
    render(<StrokeText text="ADRIAN" animate={false} correctionIndex={5} />);
    const root = screen.getByTestId("stroke-text");
    const strokeLayerChars = root.querySelectorAll("[data-stroke-layer] [data-stroke-char]");
    const allTaggedChars = root.querySelectorAll("[data-stroke-char]");
    // The correction's own stroke glyph is outside data-stroke-layer, so the
    // scoped query has to find fewer matches than the bare one once the
    // correction has drawn.
    expect(allTaggedChars.length).toBeGreaterThan(strokeLayerChars.length);
    expect(strokeLayerChars).toHaveLength("ADRIAN".length);
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

  test("dashes each mark to its own measured length, not a shared normalised one", () => {
    // Firefox does not rescale a strokeDasharray/strokeDashoffset set through
    // an inline style against a path's pathLength attribute -- it renders in
    // the path's real units instead. A dasharray/dashoffset of 1 against a
    // path dozens of units long is imperceptible, so the mark read as already
    // drawn (popped in) rather than drawing in. Measuring each path's real
    // length with getTotalLength() sidesteps that engine difference entirely.
    const lengthByPath = new Map<Element, number>();
    let nextLength = 40;
    (
      SVGElement.prototype as unknown as { getTotalLength: () => number }
    ).getTotalLength = jest.fn(function (this: Element) {
      if (!lengthByPath.has(this)) {
        lengthByPath.set(this, nextLength);
        nextLength += 10;
      }
      return lengthByPath.get(this)!;
    });
    try {
      render(<StrokeText text="ADRIAN" animate={false} correctionIndex={5} />);
      const marks = screen
        .getByTestId("stroke-text")
        .querySelectorAll<SVGPathElement>("[data-correction-cross], [data-correction-letter]");
      expect(marks.length).toBe(3);
      const dasharrays = new Set<string>();
      marks.forEach((mark) => {
        expect(mark.style.strokeDashoffset).toBe("0");
        expect(mark.style.strokeDasharray).not.toBe("1");
        dasharrays.add(mark.style.strokeDasharray);
      });
      // Each mark got its own measured length rather than one value copied
      // across all three -- the two crosses and the letter are different
      // paths, and the stub hands out a different length to each.
      expect(dasharrays.size).toBe(3);
    } finally {
      delete (SVGElement.prototype as unknown as { getTotalLength?: unknown }).getTotalLength;
    }
  });
});
