import { fireEvent, render, screen } from "@testing-library/react";
import { PhotoZoom } from "./PhotoZoom";

beforeAll(() => {
  HTMLDialogElement.prototype.showModal = function showModal(this: HTMLDialogElement) {
    this.setAttribute("open", "");
  };
  HTMLDialogElement.prototype.close = function close(this: HTMLDialogElement) {
    this.removeAttribute("open");
  };
});

function open() {
  render(
    <PhotoZoom src="/photo.jpg" alt="A photo">
      <span>thumbnail</span>
    </PhotoZoom>
  );
  fireEvent.click(screen.getByRole("button", { name: "Enlarge image: A photo" }));
  return screen.getByRole("dialog", { name: "A photo", hidden: true });
}

function giveImage(naturalWidth: number, shownWidth: number) {
  const image = screen.getByAltText("A photo") as HTMLImageElement;
  Object.defineProperty(image, "naturalWidth", { value: naturalWidth });
  image.getBoundingClientRect = () => ({ left: 0, top: 0, width: shownWidth, height: shownWidth }) as DOMRect;
  fireEvent.load(image);
  return image;
}

test("stays closed until the photo is clicked", () => {
  render(
    <PhotoZoom src="/photo.jpg" alt="A photo">
      <span>thumbnail</span>
    </PhotoZoom>
  );
  expect(screen.queryByRole("dialog", { hidden: true })).not.toBeInTheDocument();
});

test("opens the full photo in a modal dialog", () => {
  const dialog = open();
  expect(dialog).toHaveAttribute("open");
  expect(screen.getByAltText("A photo")).toHaveAttribute("src", "/photo.jpg");
});

test("the close button closes it and hands focus back to the photo", () => {
  open();
  fireEvent.click(screen.getByRole("button", { name: "Close", hidden: true }));
  expect(screen.queryByRole("dialog", { hidden: true })).not.toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Enlarge image: A photo" })).toHaveFocus();
});

test("Escape closes it and is marked handled, so the page doesn't also go home", () => {
  const onWindowKey = jest.fn((event: KeyboardEvent) => event.defaultPrevented);
  window.addEventListener("keydown", onWindowKey);
  const dialog = open();
  fireEvent.keyDown(dialog, { key: "Escape" });
  window.removeEventListener("keydown", onWindowKey);
  expect(onWindowKey).toHaveReturnedWith(true);
  expect(screen.queryByRole("dialog", { hidden: true })).not.toBeInTheDocument();
});

test("clicking beside the photo closes it", () => {
  open();
  fireEvent.click(screen.getByTestId("photo-modal-scroller"));
  expect(screen.queryByRole("dialog", { hidden: true })).not.toBeInTheDocument();
});

test("clicking a photo with pixels to spare zooms in, and again zooms out", () => {
  open();
  const image = giveImage(2000, 800);
  const scroller = screen.getByTestId("photo-modal-scroller");
  fireEvent.click(image);
  expect(scroller).toHaveAttribute("data-zoomed");
  fireEvent.click(image);
  expect(scroller).not.toHaveAttribute("data-zoomed");
});

test("a photo already at full size doesn't zoom or close when clicked", () => {
  open();
  const image = giveImage(800, 800);
  fireEvent.click(image);
  expect(screen.getByTestId("photo-modal-scroller")).not.toHaveAttribute("data-zoomed");
  expect(screen.getByRole("dialog", { hidden: true })).toBeInTheDocument();
});
