"use client";

import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import type { StrokeTextFillMode, StrokeTextTrigger } from "@/lib/strokeText";
import styles from "./StrokeText.module.css";

if (typeof window !== "undefined") gsap.registerPlugin(ScrollTrigger);

type StrokeTextProps = {
  text: string;
  strokeColor?: string;
  fillColor?: string;
  strokeWidth?: number;
  drawDuration?: number;
  fillDelay?: number;
  stagger?: number;
  ease?: string;
  trigger?: StrokeTextTrigger;
  fillMode?: StrokeTextFillMode;
  fontSize?: number;
  fontWeight?: number;
  letterSpacing?: number;
  reverse?: boolean;
  className?: string;
  style?: CSSProperties;
};

type MeasuredBox = { x: number; y: number; width: number; height: number };

export function StrokeText({
  text,
  strokeColor = "#A78BFA",
  fillColor = "#F8FAFC",
  strokeWidth = 1.4,
  drawDuration = 1.6,
  fillDelay = 0.2,
  stagger = 0.05,
  ease = "power2.out",
  trigger = "mount",
  fillMode = "wipe",
  fontSize = 128,
  fontWeight = 800,
  letterSpacing = -4,
  reverse = false,
  className = "",
  style,
}: StrokeTextProps) {
  const rootRef = useRef<HTMLSpanElement>(null);
  const textRef = useRef<SVGTextElement>(null);
  const wipeRectRef = useRef<SVGRectElement>(null);
  const [box, setBox] = useState<MeasuredBox | null>(null);
  const rawId = useId();
  const wipeId = `stroke-text-wipe-${rawId.replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const characters = useMemo(() => Array.from(text), [text]);
  const dash = Math.max(fontSize * 7, 200);
  const fontStyle = useMemo<CSSProperties>(
    () => ({ fontSize: `${fontSize}px`, fontWeight, letterSpacing: `${letterSpacing}px` }),
    [fontSize, fontWeight, letterSpacing]
  );

  useLayoutEffect(() => {
    const node = textRef.current;
    if (!node) return;
    let cancelled = false;
    const measure = () => {
      if (cancelled || !textRef.current) return;
      try {
        const bounds = textRef.current.getBBox();
        if (!bounds.width) return;
        const padding = Math.max(strokeWidth, fontSize * 0.1);
        const next = {
          x: bounds.x - padding,
          y: bounds.y - padding,
          width: bounds.width + padding * 2,
          height: bounds.height + padding * 2,
        };
        setBox((previous) => (
          previous && Math.abs(previous.x - next.x) < 0.5 && Math.abs(previous.y - next.y) < 0.5 && Math.abs(previous.width - next.width) < 0.5
            ? previous
            : next
        ));
      } catch {
        // SVG measurements are unavailable in a few non-browser renderers.
      }
    };
    measure();
    document.fonts?.ready.then(measure).catch(() => {});
    return () => { cancelled = true; };
  }, [characters, fontSize, fontWeight, letterSpacing, strokeWidth]);

  useEffect(() => {
    const root = rootRef.current;
    if (!root || !box) return;
    const strokes = Array.from(root.querySelectorAll<SVGTSpanElement>("[data-stroke-char]"));
    const fills = Array.from(root.querySelectorAll<SVGTSpanElement>("[data-fill-char]"));
    const wipe = wipeRectRef.current;
    if (!strokes.length) return;
    const fillEnabled = fillMode !== "none";
    const useWipe = fillEnabled && fillMode === "wipe";
    const fillDuration = Math.max(0.4, drawDuration * 0.5);
    const staggerConfig = reverse ? { each: stagger, from: "end" as const } : stagger;
    const targets = [...strokes, ...fills, wipe].filter(Boolean);

    const setStart = () => {
      gsap.killTweensOf(targets);
      gsap.set(strokes, { strokeDasharray: dash, strokeDashoffset: dash });
      gsap.set(fills, { opacity: useWipe ? 1 : 0 });
      if (wipe) gsap.set(wipe, { attr: { width: 0 } });
    };
    const setEnd = () => {
      gsap.killTweensOf(targets);
      gsap.set(strokes, { strokeDasharray: dash, strokeDashoffset: 0 });
      gsap.set(fills, { opacity: fillEnabled ? 1 : 0 });
      if (wipe) gsap.set(wipe, { attr: { width: fillEnabled ? box.width : 0 } });
    };
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
      setEnd();
      return () => gsap.killTweensOf(targets);
    }

    const buildTimeline = () => {
      setStart();
      const timeline = gsap.timeline({
        paused: true,
        repeat: trigger === "loop" ? -1 : 0,
        repeatDelay: trigger === "loop" ? 0.9 : 0,
        defaults: { overwrite: "auto" },
      });
      timeline.to(strokes, { strokeDashoffset: 0, duration: drawDuration, ease, stagger: staggerConfig }, 0);
      if (useWipe && wipe) {
        timeline.to(wipe, { attr: { width: box.width }, duration: fillDuration, ease: "power2.inOut" }, drawDuration + fillDelay);
      } else if (fillEnabled) {
        timeline.to(fills, { opacity: 1, duration: fillDuration, ease: "power2.out", stagger: staggerConfig }, drawDuration + fillDelay);
      }
      return timeline;
    };

    let timeline: gsap.core.Timeline | undefined;
    let scrollTrigger: ScrollTrigger | undefined;
    const play = () => {
      timeline?.kill();
      timeline = buildTimeline();
      timeline.play(0);
    };
    if (trigger === "hover") {
      setEnd();
      root.addEventListener("pointerenter", play);
    } else {
      timeline = buildTimeline();
      if (trigger === "scroll") {
        scrollTrigger = ScrollTrigger.create({ trigger: root, start: "top 82%", once: true, onEnter: () => timeline?.play(0) });
      } else {
        timeline.play(0);
      }
    }
    return () => {
      root.removeEventListener("pointerenter", play);
      scrollTrigger?.kill();
      timeline?.kill();
      gsap.killTweensOf(targets);
    };
  }, [box, dash, drawDuration, ease, fillDelay, fillMode, reverse, stagger, trigger]);

  const viewBox = box ? `${box.x} ${box.y} ${box.width} ${box.height}` : `0 ${-fontSize} 600 ${fontSize * 1.3}`;
  return (
    <span
      ref={rootRef}
      className={`${styles.root} ${className}`.trim()}
      style={style}
      role="img"
      aria-label={text}
      data-testid="stroke-text"
    >
      <svg className={styles.svg} viewBox={viewBox} preserveAspectRatio="xMidYMid meet" aria-hidden="true">
        {fillMode === "wipe" && box && (
          <defs><clipPath id={wipeId} clipPathUnits="userSpaceOnUse"><rect ref={wipeRectRef} x={box.x} y={box.y} width="0" height={box.height} /></clipPath></defs>
        )}
        <text ref={textRef} className={styles.stroke} x="0" y="0" fill="none" stroke={strokeColor} strokeWidth={strokeWidth} strokeLinejoin="round" strokeLinecap="round" style={fontStyle}>
          {characters.map((character, index) => <tspan data-stroke-char key={`stroke-${index}`}>{character}</tspan>)}
        </text>
        <text className={styles.fill} x="0" y="0" fill={fillColor} stroke="none" style={fontStyle} clipPath={fillMode === "wipe" && box ? `url(#${wipeId})` : undefined}>
          {characters.map((character, index) => <tspan data-fill-char key={`fill-${index}`}>{character}</tspan>)}
        </text>
      </svg>
    </span>
  );
}
