import { act, render, screen } from "@testing-library/react";
import { LazyVideo } from "./LazyVideo";

let notifyIntersection: IntersectionObserverCallback;
const originalIntersectionObserver = global.IntersectionObserver;

beforeEach(() => {
  class ControlledIntersectionObserver implements IntersectionObserver {
    readonly root: Element | Document | null = null;
    readonly rootMargin = "";
    readonly thresholds: ReadonlyArray<number> = [];
    observe = jest.fn();
    unobserve = jest.fn();
    disconnect = jest.fn();
    takeRecords = jest.fn(() => []);

    constructor(callback: IntersectionObserverCallback) {
      notifyIntersection = callback;
    }
  }

  global.IntersectionObserver = ControlledIntersectionObserver;
});

afterEach(() => {
  global.IntersectionObserver = originalIntersectionObserver;
});

test("waits to assign a video source until the player is near the viewport", () => {
  render(<LazyVideo data-testid="video" src="/assets/showreel.mp4" autoPlay />);

  const video = screen.getByTestId("video");
  expect(video).not.toHaveAttribute("src");
  expect(video).toHaveAttribute("preload", "none");

  act(() => {
    notifyIntersection([{ isIntersecting: true } as IntersectionObserverEntry], {} as IntersectionObserver);
  });

  expect(video).toHaveAttribute("src", "/assets/showreel.mp4");
});
