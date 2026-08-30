"use client";

import { useRef, useState } from "react";
import type { CSSProperties, RefObject } from "react";
import { NAME } from "@/data/letterTreatments";
import { DEFAULT_ASCII_TEXT_CONFIG } from "@/lib/asciiText";
import type { ASCIITextConfig } from "@/lib/asciiText";
import { DEFAULT_WARP_TEXT_CONFIG } from "@/lib/warpText";
import type { WarpTextConfig } from "@/lib/warpText";
import { DEFAULT_STROKE_TEXT_CONFIG } from "@/lib/strokeText";
import type { StrokeTextConfig } from "@/lib/strokeText";
import { ASCIIText } from "./ASCIIText";
import { StrokeText } from "./StrokeText";
import { WarpText } from "./WarpText";

const DEFAULT_BG_COLOR = "#F5EDE6";
const SELECTED_BG_COLOR = "#050505";
const ASCII_BG_COLOR = "#05AEAE";
const ASCII_STAGE_COLORS = ["#201D24", "#1A3030", "#252018", "#1D2635"];

// Figma: 230px headline / 64px tagline on a 1440 frame. Expressed as vw so the
// proportion holds at any viewport width rather than only at 1440.
const HEADLINE_SIZE = "max(3rem, 15.97vw)";
const TAGLINE_SIZE = "max(1.1rem, 4.44vw)";
const HEADLINE_FONT_FAMILY = '"PP Frama", sans-serif';
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
}: HeroProps) {
  const [activeEffect, setActiveEffect] = useState<HeadlineEffect | null>(null);
  const [asciiStageColor, setAsciiStageColor] = useState(ASCII_BG_COLOR);
  const nextEffectIndexRef = useRef(0);
  const isHeadlinePointerInsideRef = useRef(false);
  const isHeadlineActive = activeEffect !== null;
  const stageBackground = activeEffect === "ascii"
    ? asciiStageColor
    : isHeadlineActive
      ? SELECTED_BG_COLOR
      : DEFAULT_BG_COLOR;
  const arrowOpacity = 1 - Math.min(1, fanProgress * 2);

  const activateHeadline = () => {
    if (isHeadlinePointerInsideRef.current) return;
    isHeadlinePointerInsideRef.current = true;
    const effect = HEADLINE_EFFECT_SEQUENCE[nextEffectIndexRef.current];
    if (effect === "ascii") {
      const nextStageColor = asciiConfig.randomizeStageColor
        ? ASCII_STAGE_COLORS[Math.floor(Math.random() * ASCII_STAGE_COLORS.length)]
        : ASCII_BG_COLOR;
      setAsciiStageColor(nextStageColor);
    }
    setActiveEffect(effect);
    nextEffectIndexRef.current = (nextEffectIndexRef.current + 1) % HEADLINE_EFFECT_SEQUENCE.length;
  };

  const deactivateHeadline = () => {
    isHeadlinePointerInsideRef.current = false;
    setActiveEffect(null);
  };

  return (
    <div
      className="relative w-full h-screen flex flex-col items-center justify-center transition-[background-color] duration-500 ease-out"
      style={{
        backgroundColor: stageBackground,
        color: isHeadlineActive ? "#FFFFFF" : "#1C1C1C",
      }}
    >
      <div
        data-testid="hero-headline"
        className="flex flex-col items-center"
        style={{ transform: `translateY(-${liftPercent}vh)` }}
      >
        <div
          className="relative isolate w-[min(86vw,72rem)] overflow-hidden"
          style={{
            height: "clamp(13rem, 25vw, 20rem)",
            "--headline-font-size": HEADLINE_SIZE,
            "--headline-font-family": HEADLINE_FONT_FAMILY,
            "--headline-font-weight": String(HEADLINE_FONT_WEIGHT),
          } as CSSProperties}
          onPointerEnter={activateHeadline}
          onPointerLeave={deactivateHeadline}
        >
          {activeEffect === "ascii" ? (
            <ASCIIText text={NAME} {...asciiConfig} />
          ) : activeEffect === "stroke" ? (
            <StrokeText text={NAME} {...strokeConfig} style={{ fontFamily: HEADLINE_FONT_FAMILY }} />
          ) : (
            <WarpText
              text={NAME}
              color={isHeadlineActive ? "#FFFFFF" : "#1C1C1C"}
              {...warpConfig}
              fontSize={HEADLINE_SIZE}
              fontWeight={HEADLINE_FONT_WEIGHT}
              fontFamily={HEADLINE_FONT_FAMILY}
              letterSpacing="0"
              lineHeight={1}
            />
          )}
        </div>
        <p
          ref={subheaderRef}
          className="font-script mt-4"
          style={{ fontSize: TAGLINE_SIZE, lineHeight: 1.1 }}
        >
          Designer, tinkerer, idea-booster
        </p>
      </div>
      <div
        data-testid="scroll-hint"
        className="absolute bottom-8 text-3xl transition-opacity duration-300"
        style={{ opacity: arrowOpacity }}
      >
        ↓
      </div>
    </div>
  );
}
