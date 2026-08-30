import { createRef } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { ASCII_INK_LIME, DEFAULT_ASCII_TEXT_CONFIG } from "@/lib/asciiText";
import { SKETCH_INK } from "@/lib/strokeText";
import { Hero } from "./Hero";

test("renders ADRIAN through the WarpText treatment", () => {
  render(<Hero playIntro={false} fanProgress={0} />);
  expect(screen.getByTestId("warp-text")).toHaveAttribute("aria-label", "ADRIAN");
  expect(screen.getByTestId("cool-s")).toHaveAttribute("src", "/assets/cool-s.svg");
});

test("keeps a readable headline fallback when WebGL is unavailable", () => {
  render(<Hero playIntro={false} fanProgress={0} />);
  expect(screen.getByText("ADRIAN")).toBeInTheDocument();
  expect(screen.queryByTestId("text-explosion")).not.toBeInTheDocument();
});

test("uses one shared headline frame and typography baseline across treatments", () => {
  render(<Hero playIntro={false} fanProgress={0} />);
  const frame = screen.getByTestId("headline-frame");

  // The frame sizes the treatments; it deliberately does not clip them, or a
  // mark drawn past a glyph would be cut off.
  expect(frame).not.toHaveClass("overflow-hidden");
  expect(frame).toHaveClass("relative", "isolate");
  expect(frame).toHaveStyle({
    "--headline-font-size": "clamp(3rem, 15.97vw, 14.5rem)",
    "--headline-font-family": "var(--font-pp-frama)",
    "--headline-font-weight": "900",
  });
});

test("starts the hover cycle with ASCII text", () => {
  const { container } = render(
    <Hero
      playIntro={false}
      fanProgress={0}
      asciiConfig={{ ...DEFAULT_ASCII_TEXT_CONFIG, randomizeStageColor: false }}
    />
  );
  const hero = container.firstChild as HTMLElement;
  const headline = screen.getByTestId("warp-text").parentElement!;

  fireEvent.pointerEnter(headline, { pointerType: "mouse" });
  expect(screen.getByTestId("ascii-text")).toHaveAttribute("aria-label", "ADRIAN");
  expect(screen.getByTestId("ascii-crt-surface")).toHaveAttribute("data-active", "true");
  expect(screen.getByTestId("sketch-paper-surface")).toHaveAttribute("data-active", "false");
  expect(hero).toHaveStyle({ backgroundColor: "#05AEAE" });
  expect(hero).toHaveStyle({ color: "#FFFFFF" });

  fireEvent.pointerLeave(headline);
  expect(hero).toHaveStyle({ backgroundColor: "#F5EDE6" });
  expect(hero).toHaveStyle({ color: "#1C1C1C" });
});

test("cycles ASCII, Warp, Stroke, then back to ASCII on distinct hover entries", () => {
  const { container } = render(
    <Hero
      playIntro={false}
      fanProgress={0}
      asciiConfig={{ ...DEFAULT_ASCII_TEXT_CONFIG, randomizeStageColor: false }}
    />
  );
  const hero = container.firstChild as HTMLElement;
  const headline = screen.getByTestId("warp-text").parentElement!;

  fireEvent.pointerEnter(headline, { pointerType: "mouse" });
  expect(screen.getByTestId("ascii-text")).toBeInTheDocument();
  fireEvent.pointerLeave(headline);
  fireEvent.pointerEnter(headline, { pointerType: "mouse" });
  expect(screen.getByTestId("warp-text")).toBeInTheDocument();
  expect(hero).toHaveStyle({ backgroundColor: "#050505" });
  expect(hero).toHaveStyle({ color: "#FFFFFF" });
  fireEvent.pointerLeave(headline);
  fireEvent.pointerEnter(headline, { pointerType: "mouse" });
  expect(screen.getByTestId("stroke-text")).toHaveAttribute("aria-label", "ADRIAN");
  expect(screen.getByTestId("cool-s")).toBeInTheDocument();
  expect(screen.getByTestId("sketch-paper-surface")).toHaveAttribute("data-active", "true");
  expect(screen.getByTestId("ascii-crt-surface")).toHaveAttribute("data-active", "false");
  // The stroke treatment draws on the page's own ground, with the supporting
  // text using the same blue-pencil ink as the sketch lettering.
  expect(hero).toHaveStyle({ backgroundColor: "#FFFFFF" });
  expect(hero).toHaveStyle({ color: "#1C1C1C" });
  expect(screen.getByTestId("hero-tagline")).toHaveStyle({ color: SKETCH_INK });
  expect(screen.getByTestId("scroll-hint")).toHaveStyle({ color: SKETCH_INK });
  fireEvent.pointerLeave(headline);
  fireEvent.pointerEnter(headline, { pointerType: "mouse" });
  expect(screen.getByTestId("ascii-text")).toBeInTheDocument();
  expect(hero).toHaveStyle({ backgroundColor: "#05AEAE" });
});

test("the down-arrow hint fades as fanProgress increases", () => {
  const { rerender } = render(<Hero playIntro={false} fanProgress={0} />);
  expect(screen.getByTestId("scroll-hint")).toHaveStyle({ opacity: 1 });
  rerender(<Hero playIntro={false} fanProgress={1} />);
  expect(screen.getByTestId("scroll-hint")).toHaveStyle({ opacity: 0 });
});

test("attaches the given subheaderRef to the tagline paragraph", () => {
  const subheaderRef = createRef<HTMLParagraphElement>();
  render(<Hero playIntro={false} fanProgress={0} subheaderRef={subheaderRef} />);
  expect(subheaderRef.current).toBe(screen.getByText("Designer, tinkerer, product builder"));
});

test("pulls the tagline up close under the headline", () => {
  render(<Hero playIntro={false} fanProgress={0} />);
  const tagline = screen.getByTestId("hero-tagline");
  // A negative offset: the headline box is taller than the word inside it.
  // jsdom does not resolve clamp(), so assert the expression is negative.
  expect(tagline.style.marginTop).toMatch(/^clamp\(-/);
});

test("scales the tagline up toward the headline while keeping a readable floor", () => {
  render(<Hero playIntro={false} fanProgress={0} />);
  expect(screen.getByTestId("hero-tagline")).toHaveStyle({
    fontSize: "clamp(1.6rem, 6vw, 5.5rem)",
  });
});

test("the tagline sits in the same place whatever treatment is active", () => {
  render(<Hero playIntro={false} fanProgress={0} />);
  const tagline = screen.getByTestId("hero-tagline");
  const resting = tagline.style.marginTop;
  fireEvent.pointerEnter(screen.getByTestId("hero-headline"));
  expect(tagline.style.marginTop).toBe(resting);
});

test("tagline and arrow take the yellow accent under the ASCII treatment", () => {
  render(<Hero playIntro={false} fanProgress={0} asciiConfig={undefined} />);
  const tagline = screen.getByTestId("hero-tagline");
  const arrow = screen.getByTestId("scroll-hint");
  const restingTagline = tagline.style.color;

  fireEvent.pointerEnter(screen.getByTestId("hero-headline"));
  if (screen.getByTestId("hero-headline").dataset.effect === "ascii") {
    expect(tagline).toHaveStyle({ color: ASCII_INK_LIME });
    expect(arrow).toHaveStyle({ color: ASCII_INK_LIME });
  } else {
    expect(tagline.style.color).toBe(restingTagline);
  }
});
