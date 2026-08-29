"use client";

import { useEffect, useRef, useState } from "react";
import type { RefObject } from "react";
import { NAME, letterTreatments } from "@/data/letterTreatments";
import { useActiveLetterIndex } from "@/hooks/useActiveLetterIndex";
import { LetterTreatmentOverlay } from "./LetterTreatmentOverlay";

const DEFAULT_BG_COLOR = "#F2EBE1";

type HeroProps = {
  fanProgress: number;
  subheaderRef?: RefObject<HTMLParagraphElement | null>;
};

export function Hero({ fanProgress, subheaderRef }: HeroProps) {
  const heroRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const node = heroRef.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      ([entry]) => setIsVisible(entry.isIntersecting),
      { threshold: 0.1 }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const { activeIndex, onEnter, onLeave } = useActiveLetterIndex(NAME.length, isVisible);
  const activeTreatment = letterTreatments.find((t) => t.position === activeIndex);
  const backgroundColor = activeTreatment ? activeTreatment.bgColor : DEFAULT_BG_COLOR;
  const arrowOpacity = 1 - Math.min(1, fanProgress * 2);

  return (
    <div
      ref={heroRef}
      className="relative w-full h-screen flex flex-col items-center justify-center transition-colors duration-300"
      style={{ backgroundColor }}
    >
      <div className="relative inline-block">
        <div className="flex font-display text-8xl select-none">
          {NAME.split("").map((letter, index) => (
            <span
              key={index}
              data-testid={`letter-${index}`}
              onMouseEnter={() => onEnter(index)}
              onMouseLeave={onLeave}
              className="px-2 py-4 cursor-default"
            >
              {letter}
            </span>
          ))}
        </div>
        <LetterTreatmentOverlay treatments={letterTreatments} activeIndex={activeIndex} />
      </div>
      <p ref={subheaderRef} className="font-script text-2xl mt-4">
        Designer, tinkerer, idea-booster
      </p>
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
