import { fireEvent, render, screen } from "@testing-library/react";
import { InlineLinkPreview } from "./InlineLinkPreview";
import {
  PREVIEW_CARD_HEIGHT_PX,
  PREVIEW_CARD_WIDTH_PX,
  PREVIEW_VIEWPORT_MARGIN_PX,
} from "@/lib/inlineLinkPreviewPosition";

const link = {
  label: "multiplayer strategy",
  href: "https://newsroom.spotify.com/2026-05-21/investor-day-recap/",
};

// usePointerType reads window.matchMedia("(pointer: coarse)"); jest.setup.ts's
// own polyfill always answers false (fine), which is what every other test
// in this file relies on implicitly. This overrides it just for the one
// test that needs a coarse/touch device.
function mockPointerType(coarse: boolean) {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    configurable: true,
    value: (query: string) => ({
      matches: query.includes("pointer: coarse") ? coarse : false,
      media: query,
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
    }),
  });
}

afterEach(() => mockPointerType(false));

test("does not reveal anything on a coarse (touch) pointer -- desktop only", () => {
  mockPointerType(true);
  render(<InlineLinkPreview link={link} />);
  fireEvent.pointerEnter(screen.getByRole("link", { name: link.label }), { pointerType: "touch" });
  expect(screen.queryByTestId("inline-link-preview")).not.toBeInTheDocument();
});

test("anchors the preview to the focused link, clamped inside the viewport", () => {
  Object.defineProperty(window, "innerWidth", { value: 1200, configurable: true });
  Object.defineProperty(window, "innerHeight", { value: 800, configurable: true });
  // Placed close to the bottom-right corner -- exactly the case that used
  // to send the card off the page entirely.
  const rectSpy = jest
    .spyOn(HTMLElement.prototype, "getBoundingClientRect")
    .mockReturnValue({ left: 1150, right: 1250, top: 780, bottom: 800 } as DOMRect);

  render(<InlineLinkPreview link={link} />);
  fireEvent.focus(screen.getByRole("link", { name: link.label }));

  const preview = screen.getByTestId("inline-link-preview");
  const expectedX = 1200 - PREVIEW_CARD_WIDTH_PX - PREVIEW_VIEWPORT_MARGIN_PX;
  const expectedY = 800 - PREVIEW_CARD_HEIGHT_PX - PREVIEW_VIEWPORT_MARGIN_PX;
  expect(preview.style.left).toBe(`${expectedX}px`);
  expect(preview.style.top).toBe(`${expectedY}px`);

  rectSpy.mockRestore();
});

test("reveals the linked page's compact preview on hover", () => {
  render(<InlineLinkPreview link={link} />);

  const source = screen.getByRole("link", { name: link.label });
  expect(screen.queryByTestId("inline-link-preview")).not.toBeInTheDocument();

  fireEvent.pointerEnter(source, { pointerType: "mouse" });
  const preview = screen.getByTestId("inline-link-preview");
  expect(preview).toHaveTextContent("Spotify’s 2026 Investor Day Recap");
  expect(preview).toHaveTextContent("Spotify Newsroom");

  fireEvent.pointerLeave(source, { pointerType: "mouse" });
  expect(screen.queryByTestId("inline-link-preview")).not.toBeInTheDocument();
});

test("shows the destination's own real preview image when it has one", () => {
  render(<InlineLinkPreview link={link} />);
  fireEvent.pointerEnter(screen.getByRole("link", { name: link.label }), { pointerType: "mouse" });
  const image = screen.getByAltText("");
  expect(image).toHaveAttribute(
    "src",
    "https://storage.googleapis.com/pr-newsroom-wp/1/2026/05/Spotify-Investor-Day-logo.jpeg"
  );
});

test("puts the image at the bottom of the card, after the text", () => {
  render(<InlineLinkPreview link={link} />);
  fireEvent.pointerEnter(screen.getByRole("link", { name: link.label }), { pointerType: "mouse" });
  const card = screen.getByTestId("inline-link-preview");
  expect(card.lastElementChild?.tagName).toBe("IMG");
});

test("uses the given accent color instead of the link's own preview color, when provided", () => {
  render(<InlineLinkPreview link={link} accentColor="#F850C0" />);
  fireEvent.pointerEnter(screen.getByRole("link", { name: link.label }), { pointerType: "mouse" });
  const preview = screen.getByTestId("inline-link-preview");
  expect(preview.style.getPropertyValue("--preview-color")).toBe("#F850C0");
});

test("falls back to the link's own preview color when no accent override is given", () => {
  render(<InlineLinkPreview link={link} />);
  fireEvent.pointerEnter(screen.getByRole("link", { name: link.label }), { pointerType: "mouse" });
  const preview = screen.getByTestId("inline-link-preview");
  expect(preview.style.getPropertyValue("--preview-color")).toBe("#15FF76");
});

test("skips the image entirely for a link with none, rather than a broken img", () => {
  render(
    <InlineLinkPreview
      link={{ label: "proactive nudging", href: "https://en.wikipedia.org/wiki/Nudge_theory" }}
    />
  );
  fireEvent.pointerEnter(screen.getByRole("link", { name: "proactive nudging" }), {
    pointerType: "mouse",
  });
  expect(screen.queryByAltText("")).not.toBeInTheDocument();
});

test("keeps the source as a safe external link", () => {
  render(<InlineLinkPreview link={link} />);

  const source = screen.getByRole("link", { name: link.label });
  expect(source).toHaveAttribute("href", link.href);
  expect(source).toHaveAttribute("target", "_blank");
  expect(source).toHaveAttribute("rel", "noreferrer");
});
