"use client";

import { useRef, useState } from "react";
import type { CSSProperties, RefObject } from "react";
import dynamic from "next/dynamic";
import { NAME } from "@/data/letterTreatments";
import { ASCII_DEMO_TILT_MS, DEFAULT_ASCII_TEXT_CONFIG } from "@/lib/asciiText";
import type { ASCIITextConfig } from "@/lib/asciiText";
import { DEFAULT_WARP_TEXT_CONFIG, WARP_DEMO_SWEEP_MS } from "@/lib/warpText";
import type { WarpTextConfig } from "@/lib/warpText";
import { CORRECTION_INK, DEFAULT_STROKE_TEXT_CONFIG } from "@/lib/strokeText";
import type { StrokeTextConfig } from "@/lib/strokeText";
import { useHeadlineIntro } from "@/hooks/useHeadlineIntro";
import { ASCIIText } from "./ASCIIText";
import { StrokeText } from "./StrokeText";
import { WarpText } from "./WarpText";
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

// Figma: 230px headline / 64px tagline on a 1440 frame. Expressed as vw so the
// proportion holds at any viewport width rather than only at 1440.
// 230px on a 1440 frame, per Figma. Capped, because the container stops at
// 72rem x 20rem: an uncapped size outgrows the box on wide screens, and only
// WarpText survives that (it shrink-to-fits). The others render at nominal and
// overflow, which is what made them look oversized next to it.
const HEADLINE_SIZE = "clamp(3rem, 15.97vw, 14.5rem)";
// The headline sits in a fixed-height box that is taller than the word itself,
// which left the tagline stranded well below it. Pull it back up so it sits
// just under the letters, in the same place for every treatment.
const TAGLINE_OFFSET = "clamp(-3.5rem, -3vw, -0.5rem)";
// The ASCII treatment puts the name on its own stage, where the ink reads as
// this blue rather than the page's.
const ASCII_ACCENT_COLOR = "#3E18FF";
const WARP_ACCENT_COLOR = "#FF04FF";
const TAGLINE_SIZE = "clamp(1.1rem, 4.44vw, 4rem)";
const ARROW_SIZE = "clamp(2.5rem, 4.5vw, 5.5rem)";
const HEADLINE_FONT_FAMILY = "var(--font-pp-frama)";
const HEADLINE_FONT_WEIGHT = 900;

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
  // Plays the sketch -> prototype -> finished story once on mount.
  playIntro?: boolean;
};

type HeadlineEffect = "ascii" | "warp" | "stroke";
const HEADLINE_EFFECT_SEQUENCE: HeadlineEffect[] = ["ascii", "warp", "stroke"];

export function Hero({
  fanProgress,
  liftPercent = 0,
  subheaderRef,
  asciiConfig = DEFAULT_ASCII_TEXT_CONFIG,
  warpConfig = DEFAULT_WARP_TEXT_CONFIG,
  strokeConfig = DEFAULT_STROKE_TEXT_CONFIG,
  playIntro = true,
}: HeroProps) {
  const [hoverEffect, setHoverEffect] = useState<HeadlineEffect | null>(null);
  const intro = useHeadlineIntro(playIntro);
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
  // Undefined leaves both inheriting the hero's own colour, as before.
  const accentColor =
    activeEffect === "ascii"
      ? ASCII_ACCENT_COLOR
      : activeEffect === "warp"
        ? WARP_ACCENT_COLOR
        : activeEffect === "stroke"
          ? CORRECTION_INK
        : undefined;
  const stageBackground =
    activeEffect === "ascii"
      ? asciiStageColor
      : activeEffect === "stroke"
        ? DEFAULT_BG_COLOR
        : isHeadlineActive
          ? SELECTED_BG_COLOR
          : DEFAULT_BG_COLOR;
  const arrowOpacity = 1 - Math.min(1, fanProgress * 2);

  const activateHeadline = () => {
    if (!intro.done) return;
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
    isHeadlinePointerInsideRef.current = false;
    setHoverEffect(null);
  };

  return (
    <div
      className="relative w-full min-h-[100dvh] md:h-screen flex flex-col items-center justify-center transition-[background-color] duration-500 ease-out"
      style={{
        backgroundColor: stageBackground,
        // The stroke treatment draws on the page's own ground, with the
        // tagline and arrow borrowing the correction pen's red ink.
        color: isHeadlineActive && activeEffect !== "stroke" ? "#FFFFFF" : DEFAULT_INK_COLOR,
      }}
    >
      {activeEffect === "stroke" && <SketchPaperShader />}
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
      <div
        data-testid="hero-headline"
        className="relative z-10 flex flex-col items-center"
        style={{ transform: `translateY(-${liftPercent}vh)` }}
      >
        {/* The frame sizes every treatment but no longer clips them: one
            that draws past its own box -- a correction mark, a warp, a tilted
            plane -- now paints instead of being cut off. Its layout box is
            unchanged, so nothing moves or resizes. */}
        <div
          data-testid="headline-frame"
          className="relative isolate w-[min(86vw,72rem)]"
          style={{
            height: "clamp(13rem, 25vw, 20rem)",
            "--headline-font-size": HEADLINE_SIZE,
            "--headline-font-family": HEADLINE_FONT_FAMILY,
            "--headline-font-weight": String(HEADLINE_FONT_WEIGHT),
          } as CSSProperties}
          onPointerEnter={activateHeadline}
          onPointerLeave={deactivateHeadline}
        >
          <div
            data-testid="headline-stage"
            className="absolute inset-0"
            style={{ opacity: intro.opacity }}
          >
          {activeEffect === "ascii" ? (
            <ASCIIText
              text={NAME}
              {...asciiConfig}
              demoTiltMs={intro.done ? 0 : ASCII_DEMO_TILT_MS}
            />
          ) : activeEffect === "stroke" ? (
            <StrokeText
              text={NAME}
              {...strokeConfig}
              fontSize={HEADLINE_SIZE}
              fontWeight={HEADLINE_FONT_WEIGHT}
              correctionIndex={NAME.length - 1}
              style={{ fontFamily: HEADLINE_FONT_FAMILY }}
            />
          ) : (
            <WarpText
              text={NAME}
              color={isHeadlineActive ? "#FFFFFF" : DEFAULT_INK_COLOR}
              {...warpConfig}
              fontSize={HEADLINE_SIZE}
              fontWeight={HEADLINE_FONT_WEIGHT}
              fontFamily={HEADLINE_FONT_FAMILY}
              demoSweepMs={intro.phase === "warp" ? WARP_DEMO_SWEEP_MS : 0}
              letterSpacing="0"
              lineHeight={1}
            />
          )}
          </div>
        </div>
        <p
          ref={subheaderRef}
          data-testid="hero-tagline"
          className="font-script"
          style={{
            fontSize: TAGLINE_SIZE,
            lineHeight: 1.1,
            marginTop: TAGLINE_OFFSET,
            color: accentColor,
            transition: "color 420ms ease",
          }}
        >
          Designer, tinkerer, product builder
        </p>
      </div>
      <div
        data-testid="scroll-hint"
        className="boil-line absolute z-10 bottom-8 leading-none transition-opacity duration-300"
        style={{
          opacity: arrowOpacity,
          color: accentColor,
          fontSize: ARROW_SIZE,
          transition: "color 420ms ease",
        }}
      >
        ↓
      </div>
    </div>
  );
}
