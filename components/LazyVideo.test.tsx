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

test("on the desk's monitor, loads only what shows and never plays", () => {
  document.documentElement.dataset.embedded = "1";
  const play = jest
    .spyOn(HTMLMediaElement.prototype, "play")
    .mockResolvedValue(undefined);

  render(<LazyVideo data-testid="video" src="/assets/showreel.mp4" playing muted />);

  expect(intersectionObservers[0].options?.rootMargin).toBe("0px");
  act(() => {
    intersectionObservers[0].callback(
      [{ isIntersecting: true } as IntersectionObserverEntry],
      {} as IntersectionObserver
    );
  });

  const video = screen.getByTestId("video");
  expect(video).toHaveAttribute("preload", "metadata");
  expect(play).not.toHaveBeenCalled();

  play.mockRestore();
  delete document.documentElement.dataset.embedded;
});
