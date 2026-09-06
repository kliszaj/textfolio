"use client";

import { useEffect, useId, useRef, useState } from "react";
import type { CSSProperties, PointerEvent, RefObject } from "react";
import dynamic from "next/dynamic";
import Image from "next/image";
import { NAME } from "@/data/letterTreatments";
import {
  ASCII_INK_LIME,
  DEFAULT_ASCII_TEXT_CONFIG,
} from "@/lib/asciiText";
import type { ASCIITextConfig } from "@/lib/asciiText";
import { DEFAULT_WARP_TEXT_CONFIG } from "@/lib/warpText";
import type { WarpTextConfig } from "@/lib/warpText";
import { DEFAULT_STROKE_TEXT_CONFIG, SKETCH_INK } from "@/lib/strokeText";
import type { StrokeTextConfig } from "@/lib/strokeText";
import { DEFAULT_PAPER_TEXTURE_CONFIG } from "@/lib/paperTexture";
import type { PaperTextureConfig } from "@/lib/paperTexture";
import { useHeadlineIntro } from "@/hooks/useHeadlineIntro";
import { useHeroReveal } from "@/hooks/useHeroReveal";
import { ASCII_INTRO_DEMO_MS, HEADLINE_INTRO_DEMO_MS } from "@/lib/headlineIntro";
import {
  DEFAULT_INTRO_CUT_RGB_CONFIG,
  INTRO_CUT_NOISE_BURST_MS,
  alternatingRgbOffsetY,
} from "@/lib/introCutEffect";
import type { IntroCutEffect, IntroCutRgbConfig } from "@/lib/introCutEffect";
import { ASCIIText } from "./ASCIIText";
import { StrokeText } from "./StrokeText";
import { WarpText } from "./WarpText";
import { PageIndicator } from "./PageIndicator";
import { isOverHeadline, unionBox } from "@/lib/headlineHit";
import { caseStudies } from "@/data/caseStudies";
import { ABOUT_PAGE } from "@/data/about";
import type { CaseStudy } from "@/data/caseStudies";
import styles from "./Hero.module.css";

// The shader package is only needed while the sketch treatment is visible;
// avoid sending it with the resting hero or the other two effects.
const SketchPaperShader = dynamic(
  () => import("./SketchPaperShader").then((module) => module.SketchPaperShader),
  { ssr: false }
);

const DEFAULT_BG_COLOR = "#F5EDE6";
const SELECTED_BG_COLOR = "#050505";
const DEFAULT_INK_COLOR = "#1C1C1C";
const ASCII_BG_COLOR = "#05AEAE";
const ASCII_STAGE_COLORS = ["#201D24", "#1A3030", "#252018", "#1D2635"];
const ASCII_DESKTOP_ICONS = [
  { name: "desktop", src: "/assets/desktop.svg" },
  { name: "documents", src: "/assets/documents.svg" },
  { name: "trash", src: "/assets/trash.svg" },
] as const;

// The script line needs enough scale to hold its own against the wide display
// word, while its clamp preserves a readable floor on narrow screens.
// 230px on a 1440 frame, per Figma. Capped, because the container stops at
// 72rem x 20rem: an uncapped size outgrows the box on wide screens, and only
// WarpText survives that (it shrink-to-fits). The others render at nominal and
// overflow, which is what made them look oversized next to it.
// min() takes the *smaller* term: on a phone that is the width one, on a
// desktop the height one. Raising the width term therefore grows narrow
// screens and leaves wide ones exactly where they were.
// The vw term itself steps up below lg (see --headline-vw in globals.css):
// the page-indicator rail is gone there, so there is no side margin left to
// protect and the name can read as monumental rather than a shrunk desktop
// layout.
const HEADLINE_SIZE = "clamp(3rem, min(var(--headline-vw), 18vh), 14.5rem)";
// The headline sits in a fixed-height box that is taller than the word itself,
// which left the tagline stranded well below it. Pull it back up so it sits
// just under the letters, in the same place for every treatment.
// The frame keeps a minimum height, so on a narrow screen there is far more
// empty box under the word than the word itself. A pull-up measured only in vw
// shrank away exactly where it was needed most; the rem term holds it there.
export const TAGLINE_OFFSET = "clamp(-6rem, -2.6rem - 1.4vw, -2.6rem)";
// The ASCII treatment puts the name on its own stage, where the ink reads as
// this blue rather than the page's.
const ASCII_ACCENT_COLOR = ASCII_INK_LIME;
const WARP_ACCENT_COLOR = "#FF04FF";
// The page at rest, before any treatment has been hovered.
const RESTING_ACCENT_COLOR = "#878787";
// The page, tagline, and arrow all change treatment together on hover. Keep
// their colour transition as one shared value so one cannot lag the others.
const TREATMENT_COLOR_TRANSITION = "500ms ease-out";
const TAGLINE_SIZE = "clamp(1.35rem, min(var(--tagline-vw), 6.2vh), 4.5rem)";
const ARROW_SIZE = "clamp(2.1rem, 3.8vw, 4.6rem)";
const SKETCH_ARROW_SIZE = "clamp(2.5rem, 4.2vw, 5.4rem)";
const HEADLINE_FONT_FAMILY = "var(--font-pp-frama)";
const HEADLINE_FONT_WEIGHT = 900;
// A named constant rather than an inline string: useHeroReveal needs its
// length to time the typewriter, and the two must never drift apart.
const TAGLINE_TEXT = "Designer, tinkerer, zero-to-one builder";

type HeroProps = {
  fanProgress: number;
  // How far up the name and tagline ride as the stack opens beneath them, in
  // vh. Keeps them centred in the shrinking cream area instead of sitting at
  // 50vh and being clipped from below.
  liftPercent?: number;
  subheaderRef?: RefObject<HTMLParagraphElement | null>;
  asciiConfig?: ASCIITextConfig;
  warpConfig?: WarpTextConfig;
  strokeConfig?: StrokeTextConfig;
  paperTextureConfig?: PaperTextureConfig;
  // Plays the sketch -> prototype -> finished story once on mount.
  playIntro?: boolean;
  // A return from a case study folds the stack back into place. Do not let the
  // cursor already resting on the name interrupt that transition.
  suppressHeadlineHover?: boolean;
  // From the page-indicator rail specifically -- shuffles the stack open to
  // find the case study before lifting, rather than lifting immediately
  // from wherever the dot itself was clicked. Direct clicks on an
  // already-fanned sheet keep using onSelectCaseStudy, unchanged.
  onJumpToCaseStudy?: (caseStudy: CaseStudy) => void;
  // What rides on top of each intro cut. "none" is a plain hard cut -- see
  // lib/introCutEffect.ts for why a hard cut alone reads as abrupt rather
  // than glitch.
  cutEffect?: IntroCutEffect;
  rgbConfig?: IntroCutRgbConfig;
};

type HeadlineEffect = "ascii" | "warp" | "stroke";
const HEADLINE_EFFECT_SEQUENCE: HeadlineEffect[] = ["ascii", "warp", "stroke"];
type MousePosition = { x: number; y: number };

function AsciiWindowsCursor({
  active,
  lastMousePosition,
}: {
  active: boolean;
  lastMousePosition: RefObject<MousePosition>;
}) {
  useEffect(() => {
    if (!active) return;

    const cursor = document.createElement("img");
    cursor.setAttribute("data-testid", "ascii-windows-cursor");
    cursor.setAttribute("src", "/cursors/win95-arrow.png");
    cursor.setAttribute("alt", "");
    cursor.setAttribute("aria-hidden", "true");
    cursor.className = styles.asciiWindowsCursor;
    Object.assign(cursor.style, {
      position: "fixed",
      top: "0",
      left: "0",
      zIndex: "2147483647",
      width: "32px",
      height: "32px",
      pointerEvents: "none",
      userSelect: "none",
      opacity: "1",
      willChange: "transform",
    });

    // Chrome can retain a descendant cursor declaration over an inherited
    // parent value. An ephemeral document-level rule is the only scope that
    // wins decisively over canvases and utility classes alike.
    const cursorRule = document.createElement("style");
    cursorRule.textContent = "html, body, body * { cursor: none !important; }";
    document.head.appendChild(cursorRule);
    document.body.appendChild(cursor);

    const placeCursor = ({ x, y }: MousePosition) => {
      cursor.style.transform = `translate3d(${x}px, ${y}px, 0)`;
    };
    const moveCursor = (event: MouseEvent) => placeCursor({ x: event.clientX, y: event.clientY });

    placeCursor(lastMousePosition.current);
    window.addEventListener("mousemove", moveCursor, { passive: true });
    return () => {
      window.removeEventListener("mousemove", moveCursor);
      cursor.remove();
      cursorRule.remove();
    };
  }, [active, lastMousePosition]);

  return null;
}

// A tiny generated static texture for the noise-burst cut effect. Not a pure,
// tested helper like the rest of this codebase's timing math -- it draws to a
// real canvas, which jsdom can't meaningfully verify, the same reason
// WarpText's own canvas drawing lives in its component rather than lib/.
function noiseTextureDataUrl(size: number): string {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const context = canvas.getContext("2d");
  if (!context) return "";
  const image = context.createImageData(size, size);
  for (let i = 0; i < image.data.length; i += 4) {
    const value = Math.random() * 255;
    image.data[i] = value;
    image.data[i + 1] = value;
    image.data[i + 2] = value;
    image.data[i + 3] = 255;
  }
  context.putImageData(image, 0, 0);
  return canvas.toDataURL();
}

export function Hero({
  fanProgress,
  liftPercent = 0,
  subheaderRef,
  onJumpToCaseStudy,
  asciiConfig = DEFAULT_ASCII_TEXT_CONFIG,
  warpConfig = DEFAULT_WARP_TEXT_CONFIG,
  strokeConfig = DEFAULT_STROKE_TEXT_CONFIG,
  paperTextureConfig = DEFAULT_PAPER_TEXTURE_CONFIG,
  playIntro = true,
  suppressHeadlineHover = false,
  cutEffect = "none",
  rgbConfig = DEFAULT_INTRO_CUT_RGB_CONFIG,
}: HeroProps) {
  const [hoverEffect, setHoverEffect] = useState<HeadlineEffect | null>(null);
  const lastMousePositionRef = useRef<MousePosition>({ x: -40, y: -40 });
  const intro = useHeadlineIntro(playIntro);
  const rgbSplitFilterId = useId();
  const [rgbFlash, setRgbFlash] = useState(false);
  // Alternates sign each cut (into ascii, into warp, into final each land on
  // a different one this way) rather than holding one fixed vertical split.
  const rgbYSignRef = useRef<1 | -1>(1);
  const [rgbOffsetY, setRgbOffsetY] = useState(() =>
    alternatingRgbOffsetY(rgbConfig.offsetY, 1)
  );
  const [noiseBursting, setNoiseBursting] = useState(false);
  const [noiseUrl, setNoiseUrl] = useState("");
  useEffect(() => {
    const rememberMousePosition = (event: MouseEvent) => {
      lastMousePositionRef.current = { x: event.clientX, y: event.clientY };
    };
    window.addEventListener("mousemove", rememberMousePosition, { passive: true });
    return () => window.removeEventListener("mousemove", rememberMousePosition);
  }, []);
  // intro.phase only ever changes during the scripted intro (four times:
  // into sketch, ascii, warp, then final) and never again afterward -- a
  // later hover swap is driven by hoverEffect, a separate piece of state.
  // That means watching this alone is enough to catch every intro cut and
  // nothing else, with no need to also check intro.done: phase becomes
  // "final" and done becomes true on the exact same tick (HEADLINE_HANDOVER_MS
  // is 0), so gating on done as well would silently skip the last cut.
  const previousIntroPhaseRef = useRef(intro.phase);
  // Deliberately an effect comparing against a ref, not a render-time
  // "adjust state when a prop changed" comparison (React's documented
  // pattern for that shape, and what react-hooks/set-state-in-effect
  // originally asked for here): tried that rewrite once, and with a
  // fast-cycling driver like the intro's rAF loop it silently stopped
  // re-arming after the first cut -- rgbFlash got stuck true forever from
  // the second cut onward, confirmed with logging showing the clearing
  // effect's cleanup never re-running for it. This version was verified
  // correct across all four cuts and settling, repeatedly, including under
  // React's own Strict Mode double-invocation.
  useEffect(() => {
    if (previousIntroPhaseRef.current === intro.phase) return;
    previousIntroPhaseRef.current = intro.phase;
    if (cutEffect === "rgb") {
      setRgbOffsetY(alternatingRgbOffsetY(rgbConfig.offsetY, rgbYSignRef.current));
      rgbYSignRef.current = rgbYSignRef.current === 1 ? -1 : 1;
      setRgbFlash(true);
      const timer = setTimeout(() => setRgbFlash(false), rgbConfig.durationMs);
      return () => clearTimeout(timer);
    }
    if (cutEffect === "noise") {
      setNoiseUrl(noiseTextureDataUrl(48));
      setNoiseBursting(true);
      const timer = setTimeout(() => setNoiseBursting(false), INTRO_CUT_NOISE_BURST_MS);
      return () => clearTimeout(timer);
    }
  }, [intro.phase, cutEffect, rgbConfig.durationMs, rgbConfig.offsetY]);
  // An invisible copy of the word, laid out at the headline's own size, so the
  // hit area follows the real glyph metrics at every viewport. Also the
  // reference width the tagline stretches to match, below.
  const wordRef = useRef<HTMLSpanElement>(null);
  // The tagline's own font (font-script) and the headline's don't share a
  // width-per-character, so matching TAGLINE_SIZE's clamp() to HEADLINE_SIZE's
  // could get close but never exactly as wide -- stretched instead, via
  // scaleX, to the headline's real measured width. Measured off a separate,
  // always-full-text invisible copy (taglineMetricsRef) rather than the
  // visible tagline itself: measuring the live node's own scrollWidth only
  // once it had resolved made the whole line visibly pop out wider at the
  // end. Computing the ratio from the full string up front keeps its final
  // width stable for the entire soft-focus reveal.
  const taglineMetricsRef = useRef<HTMLParagraphElement>(null);
  // The node itself is state, not a ref read inside the effect below:
  // manually mutating a ref that an effect also reads is its own separate
  // lint hazard (react-hooks/immutability), and state has the added benefit
  // of the effect properly re-running the instant the node actually
  // attaches, rather than depending on a ref mutation that triggers nothing
  // on its own.
  const [taglineNode, setTaglineNode] = useState<HTMLParagraphElement | null>(null);
  const [taglineScaleX, setTaglineScaleX] = useState(1);
  // The subheader, arrow, and page-indicator dots stay hidden until the
  // headline's own intro hands off, then type/draw/pop themselves in as the
  // intro's next beat -- gated on playIntro itself, not just intro.done,
  // since intro.done is already true immediately on a return visit
  // (playIntro false) and that visit should show everything at once, not
  // replay this too.
  const heroReveal = useHeroReveal(playIntro, intro.done, TAGLINE_TEXT.length, caseStudies.length + 1);
  // Keep the complete subheader mounted and use the old typewriter's timing
  // only as a continuous 0–1 reveal driver. The text now resolves as one
  // piece of soft-focus lettering instead of arriving in individual keys.
  const taglineFocusProgress =
    heroReveal.phase === "hidden"
      ? 0
      : Math.min(1, heroReveal.subheaderChars / TAGLINE_TEXT.length);
  useEffect(() => {
    const measure = () => {
      // offsetWidth, not getBoundingClientRect().width: the hero sheet
      // itself rotates (see PaperSheet's transform), and a return visit's
      // stack-collapse animation can still have it mid-rotation the instant
      // this effect first runs. getBoundingClientRect returns the rotated,
      // on-screen bounding box -- wider than the real word -- and since
      // ResizeObserver never fires again for a transform-only change, a
      // measurement taken then would stay wrong for the rest of the mount.
      // offsetWidth is the element's own layout-box width, unaffected by
      // any ancestor's rotation.
      const headerWidth = wordRef.current?.offsetWidth;
      const naturalTaglineWidth = taglineMetricsRef.current?.scrollWidth;
      if (!headerWidth || !naturalTaglineWidth) return;
      setTaglineScaleX(headerWidth / naturalTaglineWidth);
    };
    measure();
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(measure);
    if (wordRef.current) observer.observe(wordRef.current);
    if (taglineMetricsRef.current) observer.observe(taglineMetricsRef.current);
    return () => observer.disconnect();
  }, []);
  // The story owns the headline until it finishes; hover takes over after.
  const introEffect: HeadlineEffect | null =
    intro.phase === "sketch"
      ? "stroke"
      : intro.phase === "ascii"
        ? "ascii"
        : intro.phase === "warp"
          ? "warp"
          : null;
  const activeEffect = intro.done ? hoverEffect : introEffect;
  const [asciiStageColor, setAsciiStageColor] = useState(ASCII_BG_COLOR);
  const nextEffectIndexRef = useRef(0);
  const isHeadlinePointerInsideRef = useRef(false);
  const isHeadlineActive = activeEffect !== null;
  // Each treatment inks the tagline and arrow; the resting page has its own
  // grey rather than falling through to the hero's full-strength ink.
  const accentColor =
    activeEffect === "ascii"
      ? ASCII_ACCENT_COLOR
      : activeEffect === "warp"
        ? WARP_ACCENT_COLOR
        : activeEffect === "stroke"
          ? SKETCH_INK
          : RESTING_ACCENT_COLOR;
  const stageBackground =
    activeEffect === "ascii"
      ? asciiStageColor
      : activeEffect === "stroke"
        ? paperTextureConfig.colorBack
        : isHeadlineActive
          ? SELECTED_BG_COLOR
          : DEFAULT_BG_COLOR;
  // The doodle belongs to the sketch treatment only; other treatments keep
  // their own clean visual language.
  // Which component actually renders. The resting headline already is the
  // warp treatment, so rest and "warp" share an identity and never remount --
  // which is why that one transition was always clean.
  const treatment =
    activeEffect === "ascii" ? "ascii" : activeEffect === "stroke" ? "stroke" : "warp";
  const showCoolS = activeEffect === "stroke";
  const arrowOpacity = 1 - Math.min(1, fanProgress * 2);
  // The resting word is quiet grey, but the hand-drawn prompt needs enough
  // contrast to read as an affordance before any treatment has been invoked.
  const arrowColor = activeEffect === null ? DEFAULT_INK_COLOR : accentColor;

  const activateHeadline = () => {
    if (suppressHeadlineHover || !intro.done) return;
    if (isHeadlinePointerInsideRef.current) return;
    isHeadlinePointerInsideRef.current = true;
    const effect = HEADLINE_EFFECT_SEQUENCE[nextEffectIndexRef.current];
    if (effect === "ascii") {
      const nextStageColor = asciiConfig.randomizeStageColor
        ? ASCII_STAGE_COLORS[Math.floor(Math.random() * ASCII_STAGE_COLORS.length)]
        : ASCII_BG_COLOR;
      setAsciiStageColor(nextStageColor);
    }
    setHoverEffect(effect);
    nextEffectIndexRef.current = (nextEffectIndexRef.current + 1) % HEADLINE_EFFECT_SEQUENCE.length;
  };

  const deactivateHeadline = () => {
    if (!isHeadlinePointerInsideRef.current) return;
    isHeadlinePointerInsideRef.current = false;
    setHoverEffect(null);
  };

  // The frame is as wide as the page so it can size the treatments; the word
  // is not. Only the letters, and a little air around them, answer to the
  // cursor -- hovering the empty frame either side used to change treatment.
  // Extended to include the tagline too: its own box unions with the word's,
  // so hovering the subheader activates a treatment exactly like hovering
  // the name itself does.
  const handleHeadlinePointer = (event: PointerEvent<HTMLDivElement>) => {
    const word = wordRef.current?.getBoundingClientRect();
    const tagline = taglineNode?.getBoundingClientRect();
    const box = word ? unionBox(word, tagline) : undefined;
    const over = !box || isOverHeadline({ x: event.clientX, y: event.clientY }, box);
    if (over) activateHeadline();
    else deactivateHeadline();
  };

  return (
    <div
      // The 500ms background fade is for hover, after the intro -- switching
      // treatments by hand deserves a soft crossfade. The intro itself is a
      // hard cut with no fade anywhere else (HEADLINE_HANDOVER_MS is 0), so
      // this transition has to be off for its duration too, or the
      // background alone still visibly dissolves between each stage's
      // colour while the headline on top of it hard-cuts.
      className={`relative w-full min-h-[100dvh] md:h-screen flex flex-col items-center justify-center ${
        activeEffect === "ascii" ? styles.asciiCursor : ""
      }`}
      style={{
        backgroundColor: stageBackground,
        transition: intro.done ? `background-color ${TREATMENT_COLOR_TRANSITION}` : undefined,
        // The sketch lettering, tagline, and arrow share blue-pencil ink;
        // the correction mark stays red to remain visibly distinct.
        color: isHeadlineActive && activeEffect !== "stroke" ? "#FFFFFF" : DEFAULT_INK_COLOR,
        // This must be inline: the ASCII layer contains canvases and utility
        // classes whose cursor declarations can otherwise outrank the hero.
        // Its portal cursor is rendered separately above the whole viewport.
        cursor: activeEffect === "ascii" ? "none" : undefined,
      }}
    >
      <AsciiWindowsCursor
        active={activeEffect === "ascii"}
        lastMousePosition={lastMousePositionRef}
      />
      {/* Sits outside the headline block so it stays put while the name and
          tagline ride up on liftPercent. It fades before the stack opens far
          enough for the two to overlap. */}
      {/* About rides alongside the real case studies here even though it
          lives outside the caseStudies array -- the indicator is the one
          place a visitor should be able to see and jump to it directly. */}
      <PageIndicator
        caseStudies={[...caseStudies, ABOUT_PAGE]}
        fanProgress={fanProgress}
        onSelect={onJumpToCaseStudy}
        revealedCount={heroReveal.dotsRevealed}
      />
      {activeEffect === "stroke" && <SketchPaperShader config={paperTextureConfig} />}
      <div
        aria-hidden="true"
        data-testid="sketch-paper-surface"
        data-active={activeEffect === "stroke"}
        className={`${styles.surface} ${styles.paperSurface} ${activeEffect === "stroke" ? styles.visible : ""}`}
      />
      <div
        aria-hidden="true"
        data-testid="ascii-crt-surface"
        data-active={activeEffect === "ascii"}
        className={`${styles.surface} ${styles.asciiSurface} ${activeEffect === "ascii" ? styles.visible : ""}`}
      />
      {activeEffect === "ascii" && (
        <div
          aria-hidden="true"
          data-testid="ascii-desktop-icons"
          className={styles.asciiDesktopIcons}
        >
          {ASCII_DESKTOP_ICONS.map((icon) => (
            <Image
              key={icon.name}
              className={styles.asciiDesktopIcon}
              data-icon={icon.name}
              src={icon.src}
              width={150}
              height={139}
              alt=""
            />
          ))}
        </div>
      )}
      {showCoolS && (
        <Image
          data-testid="cool-s"
          className={`${styles.coolS} boil-line`}
          src="/assets/cool-s.svg"
          width={160}
          height={431}
          alt=""
          aria-hidden="true"
          priority
        />
      )}
      {showCoolS && (
        <Image
          data-testid="lightning"
          className={`${styles.lightning} boil-line`}
          src="/assets/lightning.svg"
          width={263}
          height={238}
          alt=""
          aria-hidden="true"
          priority
        />
      )}
      <div
        data-testid="hero-headline"
        className="relative z-10 flex flex-col items-center"
        style={{ transform: `translateY(-${liftPercent}vh)` }}
        // Moved up from the frame below: this wraps the frame and the
        // tagline both, so the union hit-test in handleHeadlinePointer
        // actually gets a chance to run while the cursor is over the
        // subheader too, not just the name.
        onPointerEnter={handleHeadlinePointer}
        onPointerMove={handleHeadlinePointer}
        onPointerLeave={deactivateHeadline}
      >
        {/* The frame sizes every treatment but no longer clips them: one
            that draws past its own box -- a correction mark, a warp, a tilted
            plane -- now paints instead of being cut off. Its layout box is
            unchanged, so nothing moves or resizes.

            Deliberately NOT isolated. isolation: isolate made the browser build
            a render surface the exact size of this frame, and a fresh surface
            paints white before it has been rasterised -- that was the white box
            flashing on every treatment that mounts. Warp was clean only because
            it never remounts. Nothing inside here blends: the one
            mix-blend-mode is the ascii gradient pre, which is display:none in
            the default colour mode and whose own root isolates when it is not. */}
        <div
          data-testid="headline-frame"
          className="relative w-[min(94vw,72rem)] max-lg:w-[min(98vw,72rem)]"
          style={{
            height: "clamp(11rem, min(25vw, 30vh), 20rem)",
            "--headline-font-size": HEADLINE_SIZE,
            "--headline-font-family": HEADLINE_FONT_FAMILY,
            "--headline-font-weight": String(HEADLINE_FONT_WEIGHT),
          } as CSSProperties}
        >
          <span
            ref={wordRef}
            data-testid="headline-word-metrics"
            aria-hidden="true"
            className="pointer-events-none invisible absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 whitespace-nowrap"
            style={{
              fontFamily: HEADLINE_FONT_FAMILY,
              fontSize: HEADLINE_SIZE,
              fontWeight: HEADLINE_FONT_WEIGHT,
              lineHeight: 1,
            }}
          >
            {NAME}
          </span>
          <div
            data-testid="headline-stage"
            className="absolute inset-0"
            style={{ opacity: intro.opacity }}
          >
          <div
            data-testid="treatment-mount"
            data-treatment={treatment}
            className={styles.treatmentMount}
            style={rgbFlash ? { filter: `url(#${rgbSplitFilterId})` } : undefined}
          >
          {rgbFlash && (
            <>
              {/* A marker for the flash's own on/off window -- the actual
                  effect is the filter style above; this just makes that
                  transient state queryable. */}
              <span data-testid="intro-cut-rgb" aria-hidden="true" className="sr-only" />
              {/* A CSS filter needs an SVG filter to point at, wherever it
                  lives in the document -- 0x0 and hidden, it never paints
                  itself. colorInterpolationFilters="sRGB" keeps the channel
                  math predictable instead of the linearRGB spec default.

                  Each channel is colourised from the glyph's own alpha
                  (silhouette), not its original RGB value: extracting the
                  literal red/green/blue component of dark ink extracts a
                  dark, barely-visible fringe -- #1C1C1C's own red channel
                  is only ~11% bright, so the split read as "does nothing"
                  against the resting treatment's near-black text on cream,
                  even though it was working correctly the whole time. Using
                  alpha as the intensity source instead gives every
                  treatment's ink a full-strength coloured fringe regardless
                  of how dark that ink actually is. */}
              <svg width="0" height="0" aria-hidden="true" style={{ position: "absolute" }}>
                <defs>
                  <filter id={rgbSplitFilterId} x="-20%" y="-20%" width="140%" height="140%" colorInterpolationFilters="sRGB">
                    <feColorMatrix in="SourceGraphic" type="matrix" values="0 0 0 1 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0" result="r" />
                    <feOffset in="r" dx={-rgbConfig.offsetX} dy={-rgbOffsetY} result="rOffset" />
                    <feColorMatrix in="SourceGraphic" type="matrix" values="0 0 0 0 0  0 0 0 1 0  0 0 0 0 0  0 0 0 1 0" result="g" />
                    <feColorMatrix in="SourceGraphic" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 1 0  0 0 0 1 0" result="b" />
                    <feOffset in="b" dx={rgbConfig.offsetX} dy={rgbOffsetY} result="bOffset" />
                    <feBlend in="rOffset" in2="g" mode="screen" result="rg" />
                    <feBlend in="rg" in2="bOffset" mode="screen" />
                  </filter>
                </defs>
              </svg>
            </>
          )}
          {noiseBursting && (
            // One frame of generated static, on top of whichever treatment is
            // active. Conditionally rendered rather than opacity-toggled, so
            // it is a hard on/off with no transition of its own. Gated on the
            // boolean, not the URL itself: noiseTextureDataUrl returns ""
            // wherever canvas 2D isn't available (every jsdom test
            // environment, absent the optional `canvas` package) rather than
            // throwing, and "" is falsy -- gating on the string directly
            // would hide the overlay in every test even though the real
            // effect is genuinely active.
            <div
              data-testid="intro-cut-noise"
              aria-hidden="true"
              className={styles.treatmentLayer}
              style={{
                backgroundImage: `url(${noiseUrl})`,
                backgroundRepeat: "repeat",
                backgroundSize: "48px 48px",
                imageRendering: "pixelated",
                mixBlendMode: "overlay",
              }}
            />
          )}
          {/* Warp stays mounted whatever is on top of it. Its webgl canvas is a
              composited layer the size of the frame; tearing that out left the
              rectangle it occupied unpainted for a frame or two, which is the
              white box. Every hover swap starts from warp -- leaving the
              headline returns to it -- so every swap was destroying that layer.
              The intro never showed it only because the stage is faded to zero
              across each handover. */}
          <div
            data-testid="treatment-layer-warp"
            className={styles.treatmentLayer}
            data-active={treatment === "warp"}
            // Still painting, but not the headline any more: without this a
            // screen reader would read the word twice.
            aria-hidden={treatment !== "warp"}
          >
            <WarpText
              text={NAME}
              color={isHeadlineActive ? "#FFFFFF" : DEFAULT_INK_COLOR}
              {...warpConfig}
              fontSize={HEADLINE_SIZE}
              fontWeight={HEADLINE_FONT_WEIGHT}
              fontFamily={HEADLINE_FONT_FAMILY}
              demoSweepMs={intro.phase === "warp" ? HEADLINE_INTRO_DEMO_MS : 0}
              // A gentle circle held at the centre, not the old sweep across
              // the whole headline -- enough to prove the warp reacts to a
              // pointer at all, without touring the word in only a second.
              demoMode="circle"
              letterSpacing="0"
              lineHeight={1}
            />
          </div>
          {activeEffect === "ascii" ? (
            <div className={styles.treatmentLayer} data-active="true">
            <ASCIIText
              text={NAME}
              {...asciiConfig}
              demoTiltMs={intro.phase === "ascii" ? ASCII_INTRO_DEMO_MS : 0}
              // No type-in rain any more: the flip-through shows the settled
              // word straight away, leaning as its one bit of scripted
              // motion, same as sketch shows itself already drawn.
              typeProgress={1}
            />
            </div>
          ) : activeEffect === "stroke" ? (
            <div className={styles.treatmentLayer} data-active="true">
            <StrokeText
              text={NAME}
              {...strokeConfig}
              fontSize={HEADLINE_SIZE}
              fontWeight={HEADLINE_FONT_WEIGHT}
              correctionIndex={NAME.length - 1}
              // Always shown drawn, filled, and corrected already -- during
              // the flip-through and on every hover afterwards alike. Its
              // whole appeal is the finished hand-inked look, which a still
              // frame shows off in an instant instead of over several seconds.
              animate={false}
              style={{ fontFamily: HEADLINE_FONT_FAMILY }}
            />
            </div>
          ) : null}
          </div>
          </div>
        </div>
        <p
          ref={taglineMetricsRef}
          data-testid="tagline-width-metrics"
          aria-hidden="true"
          className="font-script pointer-events-none invisible absolute whitespace-nowrap"
          style={{ fontSize: TAGLINE_SIZE, lineHeight: 1.1 }}
        >
          {TAGLINE_TEXT}
        </p>
        <p
          ref={(node) => {
            setTaglineNode(node);
            if (subheaderRef) subheaderRef.current = node;
          }}
          data-testid="hero-tagline"
          className="font-script"
          aria-hidden={taglineFocusProgress === 0}
          style={{
            fontSize: TAGLINE_SIZE,
            lineHeight: 1.1,
            marginTop: TAGLINE_OFFSET,
            color: accentColor,
            transition: `color ${TREATMENT_COLOR_TRANSITION}`,
            // The full sentence fades through a soft focus rather than
            // typing in. Its baseline stays fixed throughout the reveal.
            // Once sharp, remove the inline filter altogether so the global
            // line-boil filter can take over; blur(0px) would otherwise win
            // the CSS cascade and freeze the handwriting treatment.
            opacity: taglineFocusProgress,
            filter:
              taglineFocusProgress < 1
                ? `blur(${(1 - taglineFocusProgress) * 10}px)`
                : undefined,
            transform: `scaleX(${taglineScaleX})`,
            transformOrigin: "center",
          }}
        >
          {TAGLINE_TEXT}
        </p>
      </div>
      <div
        data-testid="scroll-hint"
        className="boil-line scroll-hint-bob absolute z-10 bottom-8 leading-none"
        style={{
          // A plain fade, not a clip-path draw -- and it waits for every
          // dot to have already popped in (see heroRevealStateAt) rather
          // than running alongside them. No CSS transition on opacity
          // itself: arrowProgress already steps smoothly every frame, so a
          // transition on top would double-ease it.
          opacity: arrowOpacity * heroReveal.arrowProgress,
          color: arrowColor,
          fontSize: activeEffect === "stroke" ? SKETCH_ARROW_SIZE : ARROW_SIZE,
          transition: `color ${TREATMENT_COLOR_TRANSITION}`,
        }}
      >
        ↓
      </div>
    </div>
  );
}
