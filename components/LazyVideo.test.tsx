import { act, fireEvent, render, screen } from "@testing-library/react";
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

describe("progress line", () => {
  function load() {
    act(() => {
      intersectionObservers[0].callback(
        [{ isIntersecting: true } as IntersectionObserverEntry],
        {} as IntersectionObserver
      );
    });
  }

  let frames: FrameRequestCallback[];
  const nextFrame = () => act(() => frames.splice(0).forEach((frame) => frame(0)));

  beforeEach(() => {
    frames = [];
    jest.spyOn(window, "requestAnimationFrame").mockImplementation((frame) => frames.push(frame));
    jest.spyOn(window, "cancelAnimationFrame").mockImplementation(() => undefined);
    jest.spyOn(HTMLMediaElement.prototype, "play").mockResolvedValue(undefined);
    jest.spyOn(HTMLMediaElement.prototype, "pause").mockImplementation(() => undefined);
  });

  afterEach(() => jest.restoreAllMocks());

  test("isn't there unless asked for", () => {
    render(<LazyVideo data-testid="video" src="/a.mp4" playing muted />);
    expect(screen.queryByTestId("video-progress")).not.toBeInTheDocument();
  });

  test("follows the video while it plays, and shows only then", () => {
    const { rerender } = render(<LazyVideo data-testid="video" src="/a.mp4" playing showProgress muted />);
    load();
    const video = screen.getByTestId("video") as HTMLVideoElement;
    Object.defineProperty(video, "duration", { configurable: true, value: 20 });
    Object.defineProperty(video, "currentTime", { configurable: true, value: 5 });
    Object.defineProperty(video, "paused", { configurable: true, value: false });
    nextFrame();
    const line = screen.getByTestId("video-progress");
    expect(line).toHaveAttribute("aria-hidden", "true");
    expect(line).toHaveAttribute("data-playing", "true");
    expect(line.style.transform).toBe("scaleX(0.25)");

    rerender(<LazyVideo data-testid="video" src="/a.mp4" playing={false} showProgress muted />);
    expect(line).toHaveAttribute("data-playing", "false");
  });

  test("a click along the foot jumps to that point in the video", () => {
    render(<LazyVideo data-testid="video" src="/a.mp4" playing showProgress muted />);
    load();
    const video = screen.getByTestId("video") as HTMLVideoElement;
    Object.defineProperty(video, "duration", { configurable: true, value: 20 });
    Object.defineProperty(video, "currentTime", { configurable: true, writable: true, value: 0 });
    const hit = screen.getByTestId("video-progress-hit");
    jest.spyOn(hit, "getBoundingClientRect").mockReturnValue({ left: 100, width: 200 } as DOMRect);
    fireEvent.click(hit, { clientX: 250 });
    expect(video.currentTime).toBe(15);
  });

  test("a click does nothing until the video knows its length", () => {
    render(<LazyVideo data-testid="video" src="/a.mp4" playing showProgress muted />);
    load();
    const video = screen.getByTestId("video") as HTMLVideoElement;
    Object.defineProperty(video, "duration", { configurable: true, value: NaN });
    Object.defineProperty(video, "currentTime", { configurable: true, writable: true, value: 3 });
    const hit = screen.getByTestId("video-progress-hit");
    jest.spyOn(hit, "getBoundingClientRect").mockReturnValue({ left: 100, width: 200 } as DOMRect);
    fireEvent.click(hit, { clientX: 250 });
    expect(video.currentTime).toBe(3);
  });

  test("the click area only answers while the video plays", () => {
    const { rerender } = render(<LazyVideo data-testid="video" src="/a.mp4" playing showProgress muted />);
    load();
    const video = screen.getByTestId("video") as HTMLVideoElement;
    Object.defineProperty(video, "duration", { configurable: true, value: 20 });
    Object.defineProperty(video, "paused", { configurable: true, value: false });
    nextFrame();
    const hit = screen.getByTestId("video-progress-hit");
    expect(hit).toHaveAttribute("data-playing", "true");
    rerender(<LazyVideo data-testid="video" src="/a.mp4" playing={false} showProgress muted />);
    expect(hit).toHaveAttribute("data-playing", "false");
  });

  test("stays out of sight if the browser refuses to play", () => {
    render(<LazyVideo data-testid="video" src="/a.mp4" playing showProgress muted />);
    load();
    const video = screen.getByTestId("video") as HTMLVideoElement;
    Object.defineProperty(video, "duration", { configurable: true, value: 20 });
    Object.defineProperty(video, "paused", { configurable: true, value: true });
    nextFrame();
    expect(screen.getByTestId("video-progress")).toHaveAttribute("data-playing", "false");
  });
});
