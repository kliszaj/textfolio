import { readFileSync } from "node:fs";
import { createRef } from "react";
import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { ASCII_INK_LIME, DEFAULT_ASCII_TEXT_CONFIG } from "@/lib/asciiText";
import { SKETCH_INK } from "@/lib/strokeText";
import { HEADLINE_TREATMENT_DURATION_MS } from "@/lib/headlineIntro";
import { INTRO_CUT_NOISE_BURST_MS, INTRO_CUT_RGB_FLASH_MS } from "@/lib/introCutEffect";
import { SUBHEADER_REVEAL_START_DELAY_MS, TAGLINE_FOCUS_MS } from "@/lib/heroReveal";
import { caseStudies } from "@/data/caseStudies";
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
  expect(frame).toHaveClass("relative");
  // Not isolated: isolation makes the browser build a render surface the exact
  // size of this frame, and a fresh one paints white before it is rasterised.
  // That was the white box flashing in on every treatment that mounts.
  expect(frame).not.toHaveClass("isolate");
  expect(frame).toHaveStyle({
    "--headline-font-size": "clamp(3rem, min(var(--headline-vw), 18vh), 14.5rem)",
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
  expect(hero).toHaveStyle({ cursor: "none" });

  expect(hero.className).toContain("asciiCursor");
  expect(screen.getByTestId("ascii-windows-cursor")).toHaveAttribute(
    "src",
    "/cursors/win95-arrow.png"
  );
  fireEvent.mouseMove(window, { clientX: 320, clientY: 180 });
  expect(screen.getByTestId("ascii-windows-cursor")).toHaveStyle({
    transform: "translate3d(320px, 180px, 0)",
    opacity: "1",
  });

  fireEvent.pointerLeave(headline);
  expect(hero).toHaveStyle({ backgroundColor: "#F5EDE6" });
  expect(hero).toHaveStyle({ color: "#1C1C1C" });
  expect(hero.style.cursor).toBe("");
  expect(hero.className).not.toContain("asciiCursor");
  expect(screen.queryByTestId("ascii-windows-cursor")).not.toBeInTheDocument();
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
    fontSize: "5.4rem",
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
  // Not getByText: an invisible width-metrics copy of the same full string
  // also renders (see the tagline scaleX effect), so the visible tagline
  // needs its own testid to stay unambiguous.
  expect(subheaderRef.current).toBe(screen.getByTestId("hero-tagline"));
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
    fontSize: "clamp(1.35rem, min(var(--tagline-vw), 6.2vh), 4.5rem)",
  });
});

test("reveals the complete tagline from blur to sharp focus", () => {
  // The width is still measured off a dedicated full-text copy. The visible
  // line now stays complete and is driven through opacity and blur instead
  // of revealing individual characters.
  // offsetWidth, not getBoundingClientRect: the real effect reads
  // offsetWidth specifically so a rotated ancestor (the hero sheet, mid
  // stack-collapse on a return visit) can't skew the measurement.
  const offsetWidthSpy = jest
    .spyOn(HTMLElement.prototype, "offsetWidth", "get")
    .mockReturnValue(500);
  const scrollWidthSpy = jest
    .spyOn(HTMLElement.prototype, "scrollWidth", "get")
    .mockReturnValue(250);
  jest.useFakeTimers();
  try {
    render(<Hero playIntro fanProgress={0} />);
    // Stepped in increments, not one lump sum: jsdom's faked
    // requestAnimationFrame needs to actually process the intro's own three
    // treatment beats before the reveal's separate rAF loop can even start
    // (same lesson as the cut-effect tests above).
    for (let i = 0; i < 3; i += 1) {
      act(() => {
        jest.advanceTimersByTime(HEADLINE_TREATMENT_DURATION_MS);
      });
    }
    const focusTarget = SUBHEADER_REVEAL_START_DELAY_MS + TAGLINE_FOCUS_MS * 0.35 + 50;
    for (let elapsed = 0; elapsed < focusTarget; elapsed += 50) {
      act(() => {
        jest.advanceTimersByTime(50);
      });
    }
    const tagline = screen.getByTestId("hero-tagline");
    expect(tagline).toHaveTextContent("Designer, tinkerer, zero-to-one builder");
    expect(Number(tagline.style.opacity)).toBeGreaterThan(0);
    expect(Number(tagline.style.opacity)).toBeLessThan(1);
    expect(tagline.style.filter).not.toBe("blur(0px)");
    expect(tagline.style.transform).toContain("scaleX(2)");
  } finally {
    jest.useRealTimers();
    offsetWidthSpy.mockRestore();
    scrollWidthSpy.mockRestore();
  }
});

test("uses the enlarged middle down-arrow size outside the sketch treatment", () => {
  render(<Hero playIntro={false} fanProgress={0} />);
  expect(screen.getByTestId("scroll-hint")).toHaveStyle({ fontSize: "3.75rem" });
});

test("hands the tagline back to the line-boil filter once its focus reveal has finished", () => {
  render(<Hero playIntro={false} fanProgress={0} />);

  const tagline = screen.getByTestId("hero-tagline");
  expect(tagline).toHaveClass("font-script");
  // An inline blur(0px) would override the global .font-script boil filter.
  expect(tagline.style.filter).toBe("");
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

  // The hover handlers now live on hero-headline itself (so the tagline
  // shares the same touch target as the word), and the hover cycle always
  // starts on ASCII for a fresh render.
  fireEvent.pointerEnter(screen.getByTestId("hero-headline"));
  expect(tagline).toHaveStyle({ color: ASCII_INK_LIME });
  expect(arrow).toHaveStyle({ color: ASCII_INK_LIME });
});

test("keeps the background, tagline, and arrow colour changes in sync", () => {
  render(<Hero fanProgress={0} playIntro={false} />);

  const hero = screen.getByTestId("hero-headline").parentElement!;
  expect(hero.style.transition).toBe("background-color 500ms ease-out");
  expect(screen.getByTestId("hero-tagline").style.transition).toBe("color 500ms ease-out");
  expect(screen.getByTestId("scroll-hint").style.transition).toBe("color 500ms ease-out");
});

test("the resting page keeps the tagline quiet but inks the sketchy arrow black", () => {
  render(<Hero playIntro={false} fanProgress={0} />);
  expect(screen.getByTestId("hero-tagline")).toHaveStyle({ color: "#878787" });
  expect(screen.getByTestId("scroll-hint")).toHaveStyle({ color: "#1C1C1C" });
});

test("ignores the headline already under the cursor while the return settles", () => {
  const { rerender } = render(
    <Hero
      playIntro={false}
      fanProgress={0}
      suppressHeadlineHover
      asciiConfig={{ ...DEFAULT_ASCII_TEXT_CONFIG, randomizeStageColor: false }}
    />
  );
  const headline = screen.getByTestId("headline-frame");

  fireEvent.pointerEnter(headline, { pointerType: "mouse" });
  expect(screen.queryByTestId("ascii-text")).not.toBeInTheDocument();

  rerender(
    <Hero
      playIntro={false}
      fanProgress={0}
      suppressHeadlineHover={false}
      asciiConfig={{ ...DEFAULT_ASCII_TEXT_CONFIG, randomizeStageColor: false }}
    />
  );
  // Once the return has settled, a new intentional pointer event resumes the
  // ordinary hover sequence.
  fireEvent.pointerMove(headline, { pointerType: "mouse" });
  expect(screen.getByTestId("ascii-text")).toHaveAttribute("aria-label", "ADRIAN");
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

test("pins the lightning sketch to the sketch treatment, opposite the cool-s", () => {
  render(
    <Hero
      playIntro={false}
      fanProgress={0}
      asciiConfig={{ ...DEFAULT_ASCII_TEXT_CONFIG, randomizeStageColor: false }}
    />
  );
  const headline = screen.getByTestId("headline-frame");
  expect(screen.queryByTestId("lightning")).not.toBeInTheDocument();

  // ascii, then warp, then stroke.
  fireEvent.pointerEnter(headline, { pointerType: "mouse" });
  fireEvent.pointerLeave(headline);
  fireEvent.pointerEnter(headline, { pointerType: "mouse" });
  fireEvent.pointerLeave(headline);
  fireEvent.pointerEnter(headline, { pointerType: "mouse" });

  const lightning = screen.getByTestId("lightning");
  expect(screen.getByTestId("cool-s")).toBeInTheDocument();
  // Shivers with the rest of the hand-drawn treatment.
  expect(lightning).toHaveClass("boil-line");
  expect(lightning).toHaveClass(styles.lightning);
  expect(lightning).toHaveAttribute("src", expect.stringContaining("/assets/lightning.svg"));
});

test("keeps the sketch assets flat and preserves their supplied inks", () => {
  const inks = ["public/assets/cool-s.svg", "public/assets/lightning.svg"].map((path) => {
    const svg = readFileSync(path, "utf8");
    return {
      path,
      colours: [...new Set(svg.match(/fill="#[0-9A-Fa-f]{6}"/g) ?? [])],
      // A shadow would arrive as a filter primitive baked into the asset; the
      // only filter these may carry is the line boil, applied in CSS.
      shadowed: /feDropShadow|feGaussianBlur|filter=/.test(svg),
    };
  });

  expect(inks[0].colours).toEqual(['fill="#0040C0"']);
  expect(inks[1].colours).toEqual(['fill="#0040C0"']);
  for (const ink of inks) {
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

test("never tears the warp layer down, whatever treatment is showing", () => {
  const { container } = render(
    <Hero
      playIntro={false}
      fanProgress={0}
      asciiConfig={{ ...DEFAULT_ASCII_TEXT_CONFIG, randomizeStageColor: false }}
    />
  );
  const headline = screen.getByTestId("headline-frame");
  const warpLayer = screen.getByTestId("treatment-layer-warp");
  expect(warpLayer).toHaveAttribute("data-active", "true");

  fireEvent.pointerEnter(headline, { pointerType: "mouse" });

  // Warp's webgl canvas is a composited layer the size of the frame. Removing
  // it left that rectangle unpainted for a frame or two -- the white box. It
  // stays mounted underneath instead, just inactive.
  const stillThere = screen.getByTestId("treatment-layer-warp");
  expect(stillThere).toBe(warpLayer);
  expect(stillThere).toHaveAttribute("data-active", "false");
  expect(stillThere).toHaveAttribute("aria-hidden", "true");
  expect(container).toBeTruthy();
});

test("includes About alongside the case studies in the page indicator", () => {
  render(<Hero playIntro={false} fanProgress={0} />);
  const indicator = screen.getByTestId("page-indicator");
  expect(within(indicator).getByRole("button", { name: "About Me" })).toBeInTheDocument();
});

test("routes the page indicator through onJumpToCaseStudy", () => {
  const onJumpToCaseStudy = jest.fn();
  render(
    <Hero
      playIntro={false}
      fanProgress={0}
      onJumpToCaseStudy={onJumpToCaseStudy}
    />
  );

  fireEvent.click(screen.getByRole("button", { name: caseStudies[0].title }));

  expect(onJumpToCaseStudy).toHaveBeenCalledWith(caseStudies[0]);
});

describe("the intro's cut effect", () => {
  // The cut itself never fades (HEADLINE_HANDOVER_MS is 0). These effects are
  // separate, short-lived transients that ride on top of the cut instant --
  // testing them means actually running the intro's real timers, unlike
  // every other test in this file.
  //
  // Each scenario below mounts Hero exactly once and walks its single
  // instance through every boundary it checks, rather than mounting a fresh
  // Hero per assertion. Multiple mount/unmount cycles of Hero (which mounts
  // StrokeText's dynamically-imported SketchPaperShader once phase reaches
  // "sketch") inside one fake-timer describe block left a stray queued
  // callback from an earlier instance firing during a later instance's own
  // advanceTimersByTime, throwing that later test's timing off by an amount
  // that had nothing to do with its own boundaries -- a real, reproduced
  // Jest+rAF+dynamic-import interaction, not a bug in the cut-effect logic
  // itself (confirmed by running each scenario as the only test in its own
  // file, where it passed every time). One continuous mount per scenario
  // sidesteps it entirely.
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => {
    jest.useRealTimers();
  });

  test("flashes the rgb-split filter on, then off, at every cut -- but never once settled", () => {
    render(<Hero playIntro fanProgress={0} cutEffect="rgb" />);

    // The reel opens directly on sketch (no resting beat first), so the
    // first real cut is sketch -> ascii, one treatment beat in. Comfortably
    // before it: not yet flashing.
    act(() => {
      jest.advanceTimersByTime(HEADLINE_TREATMENT_DURATION_MS - 50);
    });
    expect(screen.queryByTestId("intro-cut-rgb")).not.toBeInTheDocument();

    // Past the cut (jsdom's faked requestAnimationFrame lands within about a
    // frame of the target, not exactly on it, so every boundary check here
    // gives itself a real margin either side rather than asserting at
    // +1ms), still inside the flash's own short window.
    act(() => {
      jest.advanceTimersByTime(70);
    });
    expect(screen.getByTestId("intro-cut-rgb")).toBeInTheDocument();

    // Past the flash's own window entirely: cleared again.
    act(() => {
      jest.advanceTimersByTime(INTRO_CUT_RGB_FLASH_MS + 50);
    });
    expect(screen.queryByTestId("intro-cut-rgb")).not.toBeInTheDocument();

    // Comfortably into the second cut's own flash window (ascii -> warp,
    // one treatment beat later): fires again, not just the first time.
    act(() => {
      jest.advanceTimersByTime(HEADLINE_TREATMENT_DURATION_MS - INTRO_CUT_RGB_FLASH_MS - 20);
    });
    expect(screen.getByTestId("intro-cut-rgb")).toBeInTheDocument();

    // Run out the rest of the intro (through the ascii -> warp and
    // warp -> final cuts) and settle: no flash left lingering. Stepped in
    // the same small increments as the boundaries above, rather than one
    // huge jump -- jsdom's faked requestAnimationFrame needs to actually
    // process each intermediate cut's own timers along the way.
    for (let i = 0; i < 6; i += 1) {
      act(() => {
        jest.advanceTimersByTime(HEADLINE_TREATMENT_DURATION_MS);
      });
    }
    expect(screen.queryByTestId("intro-cut-rgb")).not.toBeInTheDocument();

    // A real hover swap afterward is a deliberate, user-driven change, not a
    // scripted cut -- it should stay clean.
    fireEvent.pointerEnter(screen.getByTestId("headline-frame"), { pointerType: "mouse" });
    expect(screen.queryByTestId("intro-cut-rgb")).not.toBeInTheDocument();
  });

  test("bursts one frame of noise at a cut, then clears it", () => {
    render(<Hero playIntro fanProgress={0} cutEffect="noise" />);

    act(() => {
      jest.advanceTimersByTime(HEADLINE_TREATMENT_DURATION_MS - 50);
    });
    expect(screen.queryByTestId("intro-cut-noise")).not.toBeInTheDocument();

    act(() => {
      jest.advanceTimersByTime(70);
    });
    expect(screen.getByTestId("intro-cut-noise")).toBeInTheDocument();

    act(() => {
      jest.advanceTimersByTime(INTRO_CUT_NOISE_BURST_MS + 50);
    });
    expect(screen.queryByTestId("intro-cut-noise")).not.toBeInTheDocument();
  });

  test("defaults to no cut effect at all", () => {
    render(<Hero playIntro fanProgress={0} />);
    act(() => {
      jest.advanceTimersByTime(HEADLINE_TREATMENT_DURATION_MS + 1);
    });
    expect(screen.queryByTestId("intro-cut-rgb")).not.toBeInTheDocument();
    expect(screen.queryByTestId("intro-cut-noise")).not.toBeInTheDocument();
  });
});
