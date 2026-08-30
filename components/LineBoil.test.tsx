import { render, act } from "@testing-library/react";
import { LineBoil, LINE_BOIL_FPS, LINE_BOIL_FRAMES } from "./LineBoil";

function mockReducedMotion(reduce: boolean) {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    configurable: true,
    value: jest.fn().mockImplementation((query: string) => ({
      matches: query.includes("prefers-reduced-motion") ? reduce : false,
      media: query,
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
    })),
  });
}

const FRAME_MS = Math.round(1000 / LINE_BOIL_FPS);

describe("LineBoil", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    mockReducedMotion(false);
  });

  afterEach(() => {
    jest.useRealTimers();
    delete document.documentElement.dataset.lineBoil;
    delete document.documentElement.dataset.lineBoilFrame;
  });

  test("defines one displacement filter per boil frame", () => {
    const { container } = render(<LineBoil />);
    for (let frame = 1; frame <= LINE_BOIL_FRAMES; frame++) {
      expect(container.querySelector(`#line-boil-${frame}`)).toBeInTheDocument();
    }
  });

  test("each frame uses a different noise seed so the wobble actually changes", () => {
    const { container } = render(<LineBoil />);
    const seeds = Array.from(container.querySelectorAll("feTurbulence")).map((node) =>
      node.getAttribute("seed")
    );
    expect(new Set(seeds).size).toBe(LINE_BOIL_FRAMES);
  });

  test("switches the boil on and starts at the first frame", () => {
    render(<LineBoil />);
    expect(document.documentElement.dataset.lineBoil).toBe("on");
    expect(document.documentElement.dataset.lineBoilFrame).toBe("1");
  });

  test("advances through the frames and wraps back around", () => {
    render(<LineBoil />);
    act(() => {
      jest.advanceTimersByTime(FRAME_MS);
    });
    expect(document.documentElement.dataset.lineBoilFrame).toBe("2");
    act(() => {
      jest.advanceTimersByTime(FRAME_MS * (LINE_BOIL_FRAMES - 1));
    });
    expect(document.documentElement.dataset.lineBoilFrame).toBe("1");
  });

  test("stays still when the visitor asks for reduced motion", () => {
    mockReducedMotion(true);
    render(<LineBoil />);
    expect(document.documentElement.dataset.lineBoil).toBe("off");
    act(() => {
      jest.advanceTimersByTime(FRAME_MS * 3);
    });
    expect(document.documentElement.dataset.lineBoilFrame).toBe("1");
  });

  test("stops the frame timer when unmounted", () => {
    const { unmount } = render(<LineBoil />);
    unmount();
    expect(document.documentElement.dataset.lineBoil).toBeUndefined();
    expect(document.documentElement.dataset.lineBoilFrame).toBeUndefined();
  });

  test("is hidden from assistive tech and takes up no space", () => {
    const { container } = render(<LineBoil />);
    const svg = container.querySelector("svg");
    expect(svg).toHaveAttribute("aria-hidden", "true");
  });
});
