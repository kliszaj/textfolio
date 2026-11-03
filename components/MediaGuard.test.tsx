import { createEvent, fireEvent, render, screen } from "@testing-library/react";
import { MediaGuard } from "./MediaGuard";

function setUp() {
  render(
    <>
      <MediaGuard />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/a.jpg" alt="Still" />
      <video data-testid="clip" />
      <p>Words</p>
    </>
  );
}

function blocked(element: Element, kind: "contextMenu" | "dragStart") {
  const event = createEvent[kind](element);
  fireEvent(element, event);
  return event.defaultPrevented;
}

test("no save menu and no dragging out on images and videos", () => {
  setUp();
  for (const media of [screen.getByAltText("Still"), screen.getByTestId("clip")]) {
    expect(blocked(media, "contextMenu")).toBe(true);
    expect(blocked(media, "dragStart")).toBe(true);
  }
});

test("everything else keeps the browser's own menu", () => {
  setUp();
  expect(blocked(screen.getByText("Words"), "contextMenu")).toBe(false);
  expect(blocked(screen.getByText("Words"), "dragStart")).toBe(false);
});

test("stops guarding once it's gone", () => {
  const { unmount } = render(<MediaGuard />);
  unmount();
  const image = document.body.appendChild(document.createElement("img"));
  expect(blocked(image, "contextMenu")).toBe(false);
  image.remove();
});
