import { act, render, screen } from "@testing-library/react";
import { LazyVideo } from "./LazyVideo";

const intersectionObservers: Array<{
  callback: IntersectionObserverCallback;
  options?: IntersectionObserverInit;
}> = [];
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

    constructor(callback: IntersectionObserverCallback, options?: IntersectionObserverInit) {
      intersectionObservers.push({ callback, options });
    }
  }

  intersectionObservers.length = 0;
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
    intersectionObservers[0].callback(
      [{ isIntersecting: true } as IntersectionObserverEntry],
      {} as IntersectionObserver
    );
  });

  expect(video).toHaveAttribute("src", "/assets/showreel.mp4");
});

test("follows row-controlled playback once it has loaded", () => {
  const play = jest
    .spyOn(HTMLMediaElement.prototype, "play")
    .mockResolvedValue(undefined);
  const pause = jest
    .spyOn(HTMLMediaElement.prototype, "pause")
    .mockImplementation(() => undefined);

  render(<LazyVideo data-testid="video" src="/assets/showreel.mp4" playing muted />);

  const video = screen.getByTestId("video");
  expect(video).not.toHaveAttribute("src");
  expect(play).not.toHaveBeenCalled();

  act(() => {
    intersectionObservers[0].callback(
      [{ isIntersecting: true } as IntersectionObserverEntry],
      {} as IntersectionObserver
    );
  });

  expect(video).toHaveAttribute("src", "/assets/showreel.mp4");
  expect(video).toHaveAttribute("preload", "auto");
  expect(video).not.toHaveAttribute("autoplay");
  expect(play).toHaveBeenCalled();

  pause.mockClear();
  render(<LazyVideo data-testid="paused-video" src="/assets/paused.mp4" playing={false} muted />);

  expect(pause).toHaveBeenCalled();
  play.mockRestore();
  pause.mockRestore();
});

test("on the desk's monitor, loads a still of what shows and never plays", () => {
  jest.useFakeTimers();
  document.documentElement.dataset.embedded = "1";
  const play = jest
    .spyOn(HTMLMediaElement.prototype, "play")
    .mockResolvedValue(undefined);
  const bounds = jest
    .spyOn(HTMLElement.prototype, "getBoundingClientRect")
    .mockReturnValue({ top: 600, bottom: 1000 } as DOMRect);

  render(<LazyVideo data-testid="shown" src="/assets/showreel.mp4" playing muted />);
  act(() => jest.runAllTimers());

  const video = screen.getByTestId("shown");
  expect(video).toHaveAttribute("src", "/assets/showreel.mp4#t=0.1");
  expect(video).toHaveAttribute("preload", "metadata");
  expect(play).not.toHaveBeenCalled();
  expect(intersectionObservers).toHaveLength(0);

  bounds.mockReturnValue({ top: 1400, bottom: 1800 } as DOMRect);
  render(<LazyVideo data-testid="below" src="/assets/below.mp4" muted />);
  act(() => jest.runAllTimers());
  expect(screen.getByTestId("below")).not.toHaveAttribute("src");

  bounds.mockRestore();
  play.mockRestore();
  jest.useRealTimers();
  delete document.documentElement.dataset.embedded;
});
