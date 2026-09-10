import { fireEvent, render, screen } from "@testing-library/react";
import { Windows95Cursor } from "./Windows95Cursor";

function pointerMove(clientX: number, clientY: number) {
  const event = new Event("pointermove", { bubbles: true });
  Object.defineProperties(event, {
    clientX: { value: clientX },
    clientY: { value: clientY },
  });
  return event;
}

test("mounts one visible cursor at the supplied pointer position when active", () => {
  render(<Windows95Cursor active initialPosition={{ x: 120, y: 80 }} />);

  const cursor = screen.getByTestId("win95-cursor");
  expect(cursor).toHaveAttribute("src", "/cursors/win95-arrow.png");
  expect(cursor).toHaveStyle({
    opacity: "1",
    transform: "translate3d(120px, 80px, 0)",
  });
  expect(cursor).toHaveClass("pointer-events-none");
  // The 32px source is shown at an exact 2x multiple, so its pixels stay
  // evenly stepped instead of softening at a fractional scale.
  expect(cursor).toHaveClass("size-16");
  expect(document.documentElement).toHaveAttribute("data-win95-cursor", "active");
});

test("follows pointer movement and disappears when inactive", () => {
  const { rerender } = render(<Windows95Cursor active />);
  const cursor = screen.getByTestId("win95-cursor");

  fireEvent(document, pointerMove(240, 160));
  expect(cursor).toHaveStyle({
    opacity: "1",
    transform: "translate3d(240px, 160px, 0)",
  });

  rerender(<Windows95Cursor active={false} />);
  expect(screen.queryByTestId("win95-cursor")).not.toBeInTheDocument();
  expect(document.documentElement).not.toHaveAttribute("data-win95-cursor");
});
