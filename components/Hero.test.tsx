import { readFileSync } from "node:fs";
import { createRef } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { ASCII_INK_LIME, DEFAULT_ASCII_TEXT_CONFIG } from "@/lib/asciiText";
import { SKETCH_INK } from "@/lib/strokeText";
import styles from "./Hero.module.css";
import { Hero, TAGLINE_OFFSET } from "./Hero";

test("renders ADRIAN through the WarpText treatment", () => {
  render(<Hero playIntro={false} fanProgress={0} />);
  expect(screen.getByTestId("warp-text")).toHaveAttribute("aria-label", "ADRIAN");
  expect(screen.queryByTestId("cool-s")).not.toBeInTheDocument();
});

test("keeps a readable headline fallback when WebGL is unavailable", () => {
  render(<Hero playIntro={false} fanProgress={0} />);
  // One copy of the word is the invisible metrics span that sizes the hover
  // target; the readable fallback is the other.
  const copies = screen.getAllByText("ADRIAN");
  expect(copies.some((el) => el.dataset.testid !== "headline-word-metrics")).toBe(true);
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
    "--headline-font-size": "clamp(3rem, min(18vw, 18vh), 14.5rem)",
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
  // The frame owns the hover handlers and never remounts; the treatment
  // inside it does, so it is not a stable handle.
  const headline = screen.getByTestId("headline-frame");

  fireEvent.pointerEnter(headline, { pointerType: "mouse" });
  expect(screen.getByTestId("ascii-text")).toHaveAttribute("aria-label", "ADRIAN");
  expect(screen.getByTestId("ascii-desktop-icons").querySelectorAll("img")).toHaveLength(3);
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
  // The frame owns the hover handlers and never remounts; the treatment
  // inside it does, so it is not a stable handle.
  const headline = screen.getByTestId("headline-frame");

  fireEvent.pointerEnter(headline, { pointerType: "mouse" });
  expect(screen.getByTestId("ascii-text")).toBeInTheDocument();
  expect(screen.getByTestId("ascii-desktop-icons")).toBeInTheDocument();
  expect(screen.queryByTestId("cool-s")).not.toBeInTheDocument();
  fireEvent.pointerLeave(headline);
  fireEvent.pointerEnter(headline, { pointerType: "mouse" });
  expect(screen.getByTestId("warp-text")).toBeInTheDocument();
  expect(screen.queryByTestId("ascii-desktop-icons")).not.toBeInTheDocument();
  expect(screen.queryByTestId("cool-s")).not.toBeInTheDocument();
  expect(hero).toHaveStyle({ backgroundColor: "#050505" });
  expect(hero).toHaveStyle({ color: "#FFFFFF" });
  fireEvent.pointerLeave(headline);
  fireEvent.pointerEnter(headline, { pointerType: "mouse" });
  expect(screen.getByTestId("stroke-text")).toHaveAttribute("aria-label", "ADRIAN");
  expect(screen.queryByTestId("ascii-desktop-icons")).not.toBeInTheDocument();
  expect(screen.getByTestId("cool-s")).toBeInTheDocument();
  expect(screen.getByTestId("sketch-paper-surface")).toHaveAttribute("data-active", "true");
  expect(screen.getByTestId("ascii-crt-surface")).toHaveAttribute("data-active", "false");
  // The stroke treatment draws on the page's own ground, with the supporting
  // text using the same blue-pencil ink as the sketch lettering.
  expect(hero).toHaveStyle({ backgroundColor: "#FFFFFF" });
  expect(hero).toHaveStyle({ color: "#1C1C1C" });
  expect(screen.getByTestId("hero-tagline")).toHaveStyle({ color: SKETCH_INK });
  expect(screen.getByTestId("scroll-hint")).toHaveStyle({
    color: SKETCH_INK,
    fontSize: "clamp(2.5rem, 4.2vw, 5.4rem)",
  });
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
  expect(subheaderRef.current).toBe(screen.getByText("Designer, tinkerer, zero-to-one builder"));
});

test("pulls the tagline up close under the headline", () => {
  // Asserted on the constant rather than the DOM: jsdom mangles arithmetic
  // inside clamp() beyond recognition, though browsers parse it fine.
  expect(TAGLINE_OFFSET).toMatch(/^clamp\(/);
  const pullUps = TAGLINE_OFFSET.match(/-[\d.]+rem/g) ?? [];
  // Every bound is negative: the headline box is taller than the word.
  expect(pullUps.length).toBeGreaterThanOrEqual(2);
});

test("scales the tagline up toward the headline while keeping a readable floor", () => {
  // Height-aware like the headline: the width term grows narrow screens while
  // the height term keeps wide ones where they were.
  render(<Hero playIntro={false} fanProgress={0} />);
  expect(screen.getByTestId("hero-tagline")).toHaveStyle({
    fontSize: "clamp(1.35rem, min(7vw, 6.2vh), 4.5rem)",
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

test("the resting page inks its tagline and arrow in grey", () => {
  render(<Hero playIntro={false} fanProgress={0} />);
  expect(screen.getByTestId("hero-tagline")).toHaveStyle({ color: "#878787" });
  expect(screen.getByTestId("scroll-hint")).toHaveStyle({ color: "#878787" });
});

test("fades a freshly mounted treatment in, and does not remount an unchanged one", () => {
  const { container } = render(
    <Hero
      playIntro={false}
      fanProgress={0}
      asciiConfig={{ ...DEFAULT_ASCII_TEXT_CONFIG, randomizeStageColor: false }}
    />
  );

  const mount = screen.getByTestId("treatment-mount");
  // Every treatment shows something wrong in its first frames -- an unmeasured
  // svg, a canvas that has not drawn, a fallback headline -- so the wrapper
  // fades each one in. The resting headline already IS the warp treatment, so
  // its identity must stay "warp": a changed key there would remount the one
  // swap that is currently clean.
  expect(mount).toHaveClass(styles.treatmentMount);
  expect(mount).toHaveAttribute("data-treatment", "warp");

  fireEvent.pointerEnter(screen.getByTestId("headline-frame"), { pointerType: "mouse" });
  expect(screen.getByTestId("treatment-mount")).toHaveAttribute("data-treatment", "ascii");

  expect(container).toBeTruthy();
});

test("pins the doodles to the sketch treatment, opposite the cool-s", () => {
  render(
    <Hero
      playIntro={false}
      fanProgress={0}
      asciiConfig={{ ...DEFAULT_ASCII_TEXT_CONFIG, randomizeStageColor: false }}
    />
  );
  const headline = screen.getByTestId("headline-frame");
  expect(screen.queryByTestId("doodles")).not.toBeInTheDocument();

  // ascii, then warp, then stroke.
  fireEvent.pointerEnter(headline, { pointerType: "mouse" });
  fireEvent.pointerLeave(headline);
  fireEvent.pointerEnter(headline, { pointerType: "mouse" });
  fireEvent.pointerLeave(headline);
  fireEvent.pointerEnter(headline, { pointerType: "mouse" });

  const doodles = screen.getByTestId("doodles");
  expect(screen.getByTestId("cool-s")).toBeInTheDocument();
  // Shivers with the rest of the hand-drawn treatment.
  expect(doodles).toHaveClass("boil-line");
  expect(doodles).toHaveClass(styles.doodles);
});

test("inks the doodles in the cool-s blue and leaves both flat", () => {
  const inks = ["public/assets/cool-s.svg", "public/assets/doodles.svg"].map((path) => {
    const svg = readFileSync(path, "utf8");
    return {
      path,
      colours: [...new Set(svg.match(/fill="#[0-9A-Fa-f]{6}"/g) ?? [])],
      // A shadow would arrive as a filter primitive baked into the asset; the
      // only filter these may carry is the line boil, applied in CSS.
      shadowed: /feDropShadow|feGaussianBlur|filter=/.test(svg),
    };
  });

  for (const ink of inks) {
    expect(ink.colours).toEqual(['fill="#0040C0"']);
    expect(ink.shadowed).toBe(false);
  }
});

test("keeps the tagline tucked under the headline on narrow screens too", () => {
  const offset = TAGLINE_OFFSET;

  // A purely viewport-width offset shrinks toward zero as the screen narrows,
  // which is exactly where the headline frame's minimum height leaves the most
  // dead space under the word -- so the tagline drifted furthest away on the
  // smallest screens. A constant rem term holds the pull-up there.
  expect(offset).toMatch(/-[\d.]+rem/);
  expect(offset).toMatch(/vw/);
});

test("nudges the scroll arrow so it reads as an invitation, not a mark", () => {
  render(<Hero playIntro={false} fanProgress={0} />);
  expect(screen.getByTestId("scroll-hint")).toHaveClass("scroll-hint-bob");
});
