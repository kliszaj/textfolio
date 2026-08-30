import { createRef } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { DEFAULT_ASCII_TEXT_CONFIG } from "@/lib/asciiText";
import { Hero } from "./Hero";

test("renders ADRIAN through the WarpText treatment", () => {
  render(<Hero fanProgress={0} />);
  expect(screen.getByTestId("warp-text")).toHaveAttribute("aria-label", "ADRIAN");
});

test("keeps a readable headline fallback when WebGL is unavailable", () => {
  render(<Hero fanProgress={0} />);
  expect(screen.getByText("ADRIAN")).toBeInTheDocument();
  expect(screen.queryByTestId("text-explosion")).not.toBeInTheDocument();
});

test("uses one shared headline frame and typography baseline across treatments", () => {
  render(<Hero fanProgress={0} />);
  const frame = screen.getByTestId("warp-text").parentElement!;

  expect(frame).toHaveClass("overflow-hidden");
  expect(frame).toHaveStyle({
    "--headline-font-size": "max(3rem, 15.97vw)",
    "--headline-font-family": '"PP Frama", sans-serif',
    "--headline-font-weight": "900",
  });
});

test("starts the hover cycle with ASCII text", () => {
  const { container } = render(
    <Hero
      fanProgress={0}
      asciiConfig={{ ...DEFAULT_ASCII_TEXT_CONFIG, randomizeStageColor: false }}
    />
  );
  const hero = container.firstChild as HTMLElement;
  const headline = screen.getByTestId("warp-text").parentElement!;

  fireEvent.pointerEnter(headline, { pointerType: "mouse" });
  expect(screen.getByTestId("ascii-text")).toHaveAttribute("aria-label", "ADRIAN");
  expect(hero).toHaveStyle({ backgroundColor: "#05AEAE" });
  expect(hero).toHaveStyle({ color: "#FFFFFF" });

  fireEvent.pointerLeave(headline);
  expect(hero).toHaveStyle({ backgroundColor: "#F5EDE6" });
  expect(hero).toHaveStyle({ color: "#1C1C1C" });
});

test("cycles ASCII, Warp, Stroke, then back to ASCII on distinct hover entries", () => {
  const { container } = render(
    <Hero
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
  // The stroke treatment draws on paper, so its stage is white.
  expect(hero).toHaveStyle({ backgroundColor: "#FFFFFF" });
  fireEvent.pointerLeave(headline);
  fireEvent.pointerEnter(headline, { pointerType: "mouse" });
  expect(screen.getByTestId("ascii-text")).toBeInTheDocument();
  expect(hero).toHaveStyle({ backgroundColor: "#05AEAE" });
});

test("the down-arrow hint fades as fanProgress increases", () => {
  const { rerender } = render(<Hero fanProgress={0} />);
  expect(screen.getByTestId("scroll-hint")).toHaveStyle({ opacity: 1 });
  rerender(<Hero fanProgress={1} />);
  expect(screen.getByTestId("scroll-hint")).toHaveStyle({ opacity: 0 });
});

test("attaches the given subheaderRef to the tagline paragraph", () => {
  const subheaderRef = createRef<HTMLParagraphElement>();
  render(<Hero fanProgress={0} subheaderRef={subheaderRef} />);
  expect(subheaderRef.current).toBe(screen.getByText("Designer, tinkerer, idea-booster"));
});

test("pulls the tagline up close under the headline", () => {
  render(<Hero fanProgress={0} />);
  const tagline = screen.getByTestId("hero-tagline");
  // A negative offset: the headline box is taller than the word inside it.
  // jsdom does not resolve clamp(), so assert the expression is negative.
  expect(tagline.style.marginTop).toMatch(/^clamp\(-/);
});

test("the tagline sits in the same place whatever treatment is active", () => {
  render(<Hero fanProgress={0} />);
  const tagline = screen.getByTestId("hero-tagline");
  const resting = tagline.style.marginTop;
  fireEvent.pointerEnter(screen.getByTestId("hero-headline"));
  expect(tagline.style.marginTop).toBe(resting);
});

test("tagline and arrow take the accent blue under the ASCII treatment", () => {
  render(<Hero fanProgress={0} asciiConfig={undefined} />);
  const tagline = screen.getByTestId("hero-tagline");
  const arrow = screen.getByTestId("scroll-hint");
  const restingTagline = tagline.style.color;

  fireEvent.pointerEnter(screen.getByTestId("hero-headline"));
  if (screen.getByTestId("hero-headline").dataset.effect === "ascii") {
    expect(tagline).toHaveStyle({ color: "#3E18FF" });
    expect(arrow).toHaveStyle({ color: "#3E18FF" });
  } else {
    expect(tagline.style.color).toBe(restingTagline);
  }
});
