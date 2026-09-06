"use client";

import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import {
  CORRECTION_CROSS_DELAY_MS,
  CORRECTION_CROSS_MS,
  CORRECTION_DRAW_MS,
  CORRECTION_INK,
  CORRECTION_LETTER_DELAY_MS,
  letterSequenceSeconds,
  SKETCH_BOIL_SEEDS,
  getSketchSpec,
  STROKE_INK_LIFT_PX,
  correctionMarks,
  boxMoved,
  inkCentringOffset,
  inkCentringOffsetX,
  mirrorAboutBox,
  sketchColors,
} from "@/lib/strokeText";
import { useLineBoilFrame } from "@/hooks/useLineBoilFrame";
import type {
  StrokeTextFillMode,
  StrokeTextSketchStyle,
  StrokeTextTrigger,
} from "@/lib/strokeText";
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
  sketchStyle?: StrokeTextSketchStyle;
  // Index of the character to show back to front and mark up in red pen, as a
  // correction caught mid-sketch. Omit for a clean headline.
  correctionIndex?: number;
  // False renders the finished sketch outright -- drawn, filled, corrected --
  // instead of replaying the draw. The story animates it once on load; a hover
  // afterwards should not start over.
  animate?: boolean;
  fontSize?: number | string;
  fontWeight?: number;
  letterSpacing?: number;
  reverse?: boolean;
  className?: string;
  style?: CSSProperties;
};

type MeasuredBox = { x: number; y: number; width: number; height: number };

type HatchStroke = {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  opacity: number;
  strokeWidth: number;
};

// These stay shared between the GSAP fill timeline and the correction-mark
// delay below. The red pen must never get ahead of the graphite shading.
const HATCH_LINE_DRAW_SECONDS = 0.16;
const HATCH_LINE_STAGGER_SECONDS = 0.006;
const HATCH_SETTLE_SECONDS = 0.14;

// A stand-in dash length for the moment before mount, when nothing has been
// measured yet: long enough against a hatch line or a correction mark's real
// length (tens of units) that it reads as fully undrawn.
const UNMEASURED_DASH_LENGTH = 1000;

// GSAP writes strokeDasharray/strokeDashoffset as an inline style, and that is
// exactly the case Firefox does not rescale against a path's pathLength
// attribute -- the dash renders in the path's real units instead of the
// author-normalised ones. Against pathLength={1}, a dasharray/dashoffset of 1
// is imperceptible next to a path dozens of units long, so the mark read as
// already drawn the instant its opacity turned on, instead of drawing in.
// getTotalLength() sidesteps the ambiguity entirely -- it's one of the
// oldest, most consistently implemented pieces of SVG geometry there is.
function realPathLength(el: SVGGeometryElement | null | undefined): number {
  if (!el || typeof el.getTotalLength !== "function") return UNMEASURED_DASH_LENGTH;
  try {
    const length = el.getTotalLength();
    return Number.isFinite(length) && length > 0 ? length : UNMEASURED_DASH_LENGTH;
  } catch {
    // No SVG geometry outside a browser.
    return UNMEASURED_DASH_LENGTH;
  }
}

function hatchSequenceSeconds(lineCount: number): number {
  if (lineCount <= 0) return 0;
  // The hatch starts in the middle of the word, then travels outward. The
  // final two lines are therefore only half a sequence away, not at its end.
  return HATCH_LINE_DRAW_SECONDS + HATCH_LINE_STAGGER_SECONDS * Math.floor(lineCount / 2);
}

// A tiny, deterministic value in [0, 1). It gives each pencil stroke its own
// character without making the treatment flicker differently on every render.
function graphiteNoise(index: number, salt: number): number {
  const value = Math.sin(index * 12.9898 + salt * 78.233) * 43758.5453;
  return value - Math.floor(value);
}

function hatchStrokesForBox(box: MeasuredBox | null, gap: number): HatchStroke[] {
  if (!box) return [];
  const overscan = gap * 1.5;
  const start = box.x - box.height - overscan;
  const end = box.x + box.width + box.height + overscan;
  const rise = box.height + overscan * 2;
  const strokes: HatchStroke[] = [];
  let x = start;
  let index = 0;
  while (x <= end) {
    const spacing = gap * (1.08 + graphiteNoise(index, 1) * 0.42);
    const startJitter = (graphiteNoise(index, 2) - 0.5) * gap * 0.68;
    const endJitter = (graphiteNoise(index, 3) - 0.5) * gap * 0.92;
    const lowerLift = graphiteNoise(index, 4) * gap * 1.15;
    const upperDrop = graphiteNoise(index, 5) * gap * 1.25;
    strokes.push({
      // The lengths, angle and spacing all drift a little, like separate
      // pencil passes rather than a repeated vector hatch pattern.
      x1: x + startJitter,
      y1: box.y + box.height + overscan - lowerLift,
      x2: x + rise + endJitter,
      y2: box.y - overscan + upperDrop,
      opacity: 0.68 + graphiteNoise(index, 6) * 0.27,
      strokeWidth: Math.max(0.55, gap * (0.09 + graphiteNoise(index, 7) * 0.11)),
    });
    x += spacing;
    index += 1;
  }
  return strokes;
}

// About half a second of frames: long enough for a late web font to land, and
// free because boxMoved discards every measurement that has not changed.
const MEASURE_SETTLE_FRAMES = 36;

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
  sketchStyle = "pencil",
  correctionIndex,
  animate = true,
  fontSize = "var(--headline-font-size, 128px)",
  fontWeight = 800,
  letterSpacing = -4,
  reverse = false,
  className = "",
  style,
}: StrokeTextProps) {
  const rootRef = useRef<HTMLSpanElement>(null);
  const textRef = useRef<SVGTextElement>(null);
  const wipeRectRef = useRef<SVGRectElement>(null);
  // A second, independent reveal for the outline: stroke-dasharray/-dashoffset
  // set through an inline style is not consistently animated on SVG text
  // across engines (Firefox does not draw it in at all -- the letters simply
  // show, fully stroked, from the first frame). A clip-path sweep can only
  // ever crop rendered output, so it reveals the word left to right
  // regardless of whether the dash animation underneath it is doing
  // anything -- a correct, universal fallback rather than a text-specific one.
  const outlineWipeRectRef = useRef<SVGRectElement>(null);
  // The clip-path fallback above is only a fallback: on every engine where the
  // per-character dash animation already draws correctly, running both at
  // once fights the per-letter stagger -- the clip's own left-to-right sweep
  // reveals each letter in one movement regardless of how far its own stroke
  // has drawn, so letters (the last one especially) stopped looking staggered
  // and read as arriving together instead. Firefox is the only engine known
  // not to animate stroke-dasharray/-dashoffset on text at all, so the clip
  // is scoped to it specifically rather than left running everywhere "just in
  // case". Read after mount, not during render, so server and client agree on
  // the first paint (the same reason `prefers-reduced-motion` is read in an
  // effect rather than synchronously).
  const [isFirefox, setIsFirefox] = useState(false);
  useEffect(() => {
    setIsFirefox(typeof navigator !== "undefined" && /firefox/i.test(navigator.userAgent));
  }, []);
  const [box, setBox] = useState<MeasuredBox | null>(null);
  // The svg's user units are kept equal to css pixels, so the text renders at
  // exactly the size the headline font would. Letting preserveAspectRatio
  // scale an ink-hugging viewBox instead made the size a function of the
  // container's aspect, which is why this treatment never matched the others.
  const [hostSize, setHostSize] = useState<{ width: number; height: number } | null>(null);
  const [markBox, setMarkBox] = useState<MeasuredBox | null>(null);
  const rawId = useId();
  const safeId = rawId.replace(/[^a-zA-Z0-9_-]/g, "");
  const wipeId = `stroke-text-wipe-${safeId}`;
  const outlineWipeId = `stroke-text-outline-wipe-${safeId}`;
  const sketchId = `stroke-text-sketch-${safeId}`;
  const sketch = getSketchSpec(sketchStyle);
  const inked = sketchColors(sketchStyle, strokeColor, fillColor);
  const hatchId = `stroke-text-hatch-${safeId}`;
  const hatchMirrorId = `stroke-text-hatch-mirror-${safeId}`;
  const hatchClipId = `stroke-text-hatch-clip-${safeId}`;
  const hatchMaskId = `stroke-text-hatch-mask-${safeId}`;
  const correctionHatchClipId = `stroke-text-correction-hatch-clip-${safeId}`;
  // Re-seeded turbulence on the shared boil beat, so the drawn line is redrawn
  // a few times a second instead of holding perfectly still.
  const boilFrame = useLineBoilFrame(SKETCH_BOIL_SEEDS.length);
  const sketchFilter =
    sketch.wobbleScale > 0 ? `url(#${sketchId}-${boilFrame})` : undefined;
  const hatchGap = Math.max(3, (box?.height ?? 200) * sketch.hatchSpacing);
  const fillPaint =
    sketch.fillTexture === "hatch" ? `url(#${hatchId})` : inked.fillColor;
  // Mirroring a glyph mirrors its hatching with it, which left the reversed
  // letter shaded the opposite way to every other. This one is angled against
  // the flip so it comes out running the same way as the rest.
  const mirroredFillPaint =
    sketch.fillTexture === "hatch" ? `url(#${hatchMirrorId})` : inked.fillColor;
  const characters = useMemo(() => Array.from(text), [text]);
  const hatchStrokes = useMemo(() => hatchStrokesForBox(box, hatchGap), [box, hatchGap]);
  const dash = box ? Math.max(box.width, box.height) * 4 : 4000;
  const fontStyle = useMemo<CSSProperties>(
    () => ({
      fontSize: typeof fontSize === "number" ? `${fontSize}px` : fontSize,
      fontWeight,
      letterSpacing: `${letterSpacing}px`,
    }),
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
        const padding = Math.max(strokeWidth, bounds.height * 0.12);
        const next = {
          x: bounds.x - padding,
          y: bounds.y - padding,
          width: bounds.width + padding * 2,
          height: bounds.height + padding * 2,
        };
        setBox((previous) => (boxMoved(previous, next) ? next : previous));
      } catch {
        // SVG measurements are unavailable in a few non-browser renderers.
      }
    };
    const measureMark = () => {
      if (cancelled || correctionIndex === undefined || !rootRef.current) return;

      // getExtentOfChar measures one character's real rendered extent
      // directly off the text run, so it can't fall back to a sibling's or
      // the whole word's box the way a bare tspan.getBBox() can on engines
      // that don't give an unpositioned tspan its own bounding box (observed
      // on WebKit/iOS: the correction ends up sized and centred on the whole
      // word instead of the one glyph it's meant to replace).
      const textEl = textRef.current;
      if (textEl && typeof textEl.getExtentOfChar === "function") {
        try {
          const extent = textEl.getExtentOfChar(correctionIndex);
          if (extent && extent.width) {
            const next = {
              x: extent.x,
              y: extent.y,
              width: extent.width,
              height: extent.height,
            };
            setMarkBox((previous) => (boxMoved(previous, next) ? next : previous));
            return;
          }
        } catch {
          // Falls through to the tspan measurement below.
        }
      }

      // Fallback for engines without getExtentOfChar (and for jsdom, which
      // has neither). Scoped to the main stroke layer specifically: once the
      // correction itself has rendered once, its own mirrored glyph also
      // carries data-stroke-char, and an unscoped query would count it too.
      const glyph = rootRef.current.querySelectorAll<SVGTSpanElement>(
        "[data-stroke-layer] [data-stroke-char]"
      )[correctionIndex];
      if (!glyph) return;
      try {
        const bounds = glyph.getBBox();
        if (!bounds.width) return;
        const next = {
          x: bounds.x,
          y: bounds.y,
          width: bounds.width,
          height: bounds.height,
        };
        setMarkBox((previous) => (boxMoved(previous, next) ? next : previous));
      } catch {
        // No SVG measurement outside a browser; the mark simply does not draw.
      }
    };

    const settle = () => {
      measure();
      measureMark();
    };

    settle();
    document.fonts?.ready.then(settle).catch(() => {});
    // fonts.ready only covers requests already made when it was read, so the
    // headline face can land after it has resolved -- reliably so on a phone.
    // A stale box puts the hatching and the correction mark where the letters
    // used to be, which is exactly what it looked like. Re-measuring over the
    // opening moments costs nothing: boxMoved discards anything unchanged.
    document.fonts?.addEventListener?.("loadingdone", settle);
    let settled = 0;
    let frame = requestAnimationFrame(function step() {
      settle();
      settled += 1;
      if (settled < MEASURE_SETTLE_FRAMES) frame = requestAnimationFrame(step);
    });

    return () => {
      cancelled = true;
      cancelAnimationFrame(frame);
      document.fonts?.removeEventListener?.("loadingdone", settle);
    };
  }, [characters, fontSize, fontWeight, letterSpacing, strokeWidth, hostSize, correctionIndex]);

  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root || typeof ResizeObserver === "undefined") return;
    const read = () => {
      // offsetWidth/Height, not getBoundingClientRect: the hero sheet this
      // sits in rotates during a return visit's stack-collapse animation,
      // and getBoundingClientRect would return that rotated on-screen box
      // instead of the root's real, unrotated layout size.
      const rect = { width: root.offsetWidth, height: root.offsetHeight };
      if (!rect.width || !rect.height) return;
      setHostSize((previous) =>
        previous &&
        Math.abs(previous.width - rect.width) < 0.5 &&
        Math.abs(previous.height - rect.height) < 0.5
          ? previous
          : { width: rect.width, height: rect.height }
      );
    };
    read();
    const observer = new ResizeObserver(read);
    observer.observe(root);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const root = rootRef.current;
    if (!root || !box) return;
    const normalStrokes = Array.from(
      root.querySelectorAll<SVGTSpanElement>("[data-stroke-layer] [data-stroke-char]")
    );
    const normalFills = Array.from(
      root.querySelectorAll<SVGTSpanElement>("[data-fill-layer] [data-fill-char]")
    );
    const correctionStroke = root.querySelector<SVGTextElement>("[data-correction-stroke]");
    const correctionFill = root.querySelector<SVGTextElement>("[data-correction-fill]");
    const strokes = normalStrokes
      .map((stroke, index) =>
        index === correctionIndex && correctionStroke ? correctionStroke : stroke
      )
      .filter((stroke) => stroke.getAttribute("stroke") !== "none");
    const fills = normalFills
      .map((fill, index) => (index === correctionIndex && correctionFill ? correctionFill : fill))
      .filter((fill) => fill.getAttribute("fill") !== "none");
    const hatchLines = Array.from(
      root.querySelectorAll<SVGLineElement>("[data-hatch-stroke], [data-correction-hatch-stroke]")
    );
    const correctionCrosses = Array.from(
      root.querySelectorAll<SVGPathElement>("[data-correction-cross]")
    );
    const correctionLetter = root.querySelector<SVGPathElement>("[data-correction-letter]");
    const correctionPaths = [...correctionCrosses, correctionLetter].filter(
      (path): path is SVGPathElement => path !== null
    );
    const wipe = wipeRectRef.current;
    const outlineWipe = outlineWipeRectRef.current;
    if (!strokes.length) return;
    const fillEnabled = fillMode !== "none";
    const useWipe = fillEnabled && fillMode === "wipe";
    const useHatchFill = fillEnabled && fillMode === "hatch" && sketch.fillTexture === "hatch";
    const fillDuration = Math.max(0.4, drawDuration * 0.5);
    const staggerConfig = reverse ? { each: stagger, from: "end" as const } : stagger;
    const outlineEnd = letterSequenceSeconds(drawDuration, stagger, strokes.length);
    // Pencil hatching gets a short head start from the outlines instead of
    // arriving as a separate, late phase. The delay remains configurable.
    const fillStart = useHatchFill
      ? Math.max(0, fillDelay)
      : outlineEnd + fillDelay;
    const targets = [...strokes, ...fills, ...hatchLines, ...correctionPaths, wipe, outlineWipe].filter(
      Boolean
    );

    const setStart = () => {
      gsap.killTweensOf(targets);
      gsap.set(strokes, { strokeDasharray: dash, strokeDashoffset: dash });
      gsap.set(fills, { opacity: useWipe ? 1 : 0 });
      gsap.set(hatchLines, {
        strokeDasharray: (_i, target: SVGLineElement) => realPathLength(target),
        strokeDashoffset: (_i, target: SVGLineElement) => realPathLength(target),
      });
      gsap.set(correctionPaths, {
        strokeDasharray: (_i, target: SVGPathElement) => realPathLength(target),
        strokeDashoffset: (_i, target: SVGPathElement) => realPathLength(target),
        opacity: 0,
      });
      if (wipe) gsap.set(wipe, { attr: { width: 0 } });
      if (outlineWipe) gsap.set(outlineWipe, { attr: { width: 0 } });
    };
    const setEnd = () => {
      gsap.killTweensOf(targets);
      gsap.set(strokes, { strokeDasharray: dash, strokeDashoffset: 0 });
      gsap.set(fills, { opacity: fillEnabled ? 1 : 0 });
      gsap.set(hatchLines, {
        strokeDasharray: (_i, target: SVGLineElement) => realPathLength(target),
        strokeDashoffset: 0,
      });
      gsap.set(correctionPaths, {
        strokeDasharray: (_i, target: SVGPathElement) => realPathLength(target),
        strokeDashoffset: 0,
        opacity: 1,
      });
      if (wipe) gsap.set(wipe, { attr: { width: fillEnabled ? box.width : 0 } });
      if (outlineWipe) gsap.set(outlineWipe, { attr: { width: box.width } });
    };
    if (!animate || window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
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
      if (outlineWipe) {
        timeline.to(outlineWipe, { attr: { width: box.width }, duration: outlineEnd, ease }, 0);
      }
      if (useHatchFill && hatchLines.length) {
        // A pencil shade is not a mask appearing all at once. Each loose
        // graphite stroke travels across the letter after its outline lands.
        timeline.to(
          hatchLines,
          {
            strokeDashoffset: 0,
            duration: HATCH_LINE_DRAW_SECONDS,
            ease: "power1.inOut",
            // Start with central, visible lines. Left-to-right sequencing
            // spent its first beat drawing clipped strokes beyond the glyphs,
            // which looked like a long delay before the fill began.
            stagger: { each: HATCH_LINE_STAGGER_SECONDS, from: "center" },
          },
          fillStart
        );
      } else if (useWipe && wipe) {
        timeline.to(wipe, { attr: { width: box.width }, duration: fillDuration, ease: "power2.inOut" }, fillStart);
      } else if (fillEnabled) {
        timeline.to(fills, { opacity: 1, duration: fillDuration, ease: "power2.out", stagger: staggerConfig }, fillStart);
      }
      // Correction ink belongs to this same timeline, rather than an
      // independent CSS animation. Measuring the SVG can add hatch lines in
      // a later render, and a separate clock could then start before the
      // final pencil line had landed.
      const fillEnd = useHatchFill
        ? fillStart + hatchSequenceSeconds(hatchLines.length)
        : fillEnabled
          ? fillStart + fillDuration
          : outlineEnd;
      // The correction mark must wait for both animations: when hatching now
      // starts at t=0 it can finish before the last outline has landed.
      const correctionStart =
        Math.max(outlineEnd, fillEnd) + (fillEnabled ? HATCH_SETTLE_SECONDS : 0);
      // The X strikes the glyph out first, then the replacement letter is
      // written in above it -- the order a hand corrects a word in.
      correctionCrosses.forEach((cross, index) => {
        timeline.set(
          cross,
          { opacity: 1 },
          correctionStart + (CORRECTION_CROSS_DELAY_MS / 1000) * index
        );
        timeline.to(
          cross,
          {
            strokeDashoffset: 0,
            duration: CORRECTION_CROSS_MS / 1000,
            ease: "power1.out",
          },
          correctionStart + (CORRECTION_CROSS_DELAY_MS / 1000) * index
        );
      });
      if (correctionLetter) {
        const letterStart =
          correctionStart +
          (CORRECTION_CROSS_DELAY_MS / 1000) * (correctionCrosses.length - 1) +
          CORRECTION_CROSS_MS / 1000 +
          CORRECTION_LETTER_DELAY_MS / 1000;
        // Hidden until its own moment: the round pen tip was showing as a red
        // dot on the page for the whole of the sketch before it.
        timeline.set(correctionLetter, { opacity: 1 }, letterStart);
        timeline.to(
          correctionLetter,
          {
            strokeDashoffset: 0,
            duration: CORRECTION_DRAW_MS / 1000,
            ease: "power1.out",
          },
          letterStart
        );
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
  }, [
    animate,
    box,
    correctionIndex,
    dash,
    drawDuration,
    ease,
    fillDelay,
    fillMode,
    hatchStrokes.length,
    isFirefox,
    markBox,
    reverse,
    sketch.fillTexture,
    stagger,
    trigger,
  ]);

  const viewBox = hostSize ? `0 0 ${hostSize.width} ${hostSize.height}` : "0 0 600 200";
  const centreX = hostSize ? hostSize.width / 2 : 300;
  const centreY = hostSize ? hostSize.height / 2 : 100;
  // Measured off the untransformed <text>, and applied to the group around it,
  // so correcting the position can never feed back into the measurement.
  const inkOffset = inkCentringOffset(box, centreY, STROKE_INK_LIFT_PX);
  // text-anchor="middle" centres the <text> on its advance width, not its
  // ink -- the same mismatch as the vertical case, just uncorrected until
  // now because it took warp's own fix (centeredRunLayout) to notice the
  // "default" treatment it's meant to match wasn't ink-centred either.
  const inkOffsetX = inkCentringOffsetX(box, centreX);
  // Bounded by the host, so a mark is pulled inside the frame rather than
  // running off the edge and reading as clipped.
  const correctionPen = strokeWidth * 1.6;
  // Nothing clips the frame any more, so a mark may sit a little outside it.
  const marks = markBox
    ? correctionMarks(
        markBox,
        hostSize ?? undefined,
        correctionPen / 2,
        markBox.width * 0.55
      )
    : null;
  const useHatchFill = fillMode === "hatch" && sketch.fillTexture === "hatch";
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
        <defs>
          {fillMode === "wipe" && box && (
            <clipPath id={wipeId} clipPathUnits="userSpaceOnUse">
              <rect ref={wipeRectRef} x={box.x} y={box.y} width="0" height={box.height} />
            </clipPath>
          )}
          {/* Firefox-only fallback -- see isFirefox above for why this isn't
              applied everywhere. */}
          {box && isFirefox && (
            <clipPath id={outlineWipeId} clipPathUnits="userSpaceOnUse">
              <rect
                ref={outlineWipeRectRef}
                data-testid="stroke-text-outline-wipe"
                x={box.x}
                y={box.y}
                width="0"
                height={box.height}
              />
            </clipPath>
          )}
          {useHatchFill && (
            <clipPath id={hatchClipId} data-testid="stroke-text-hatch-clip" clipPathUnits="userSpaceOnUse">
              <text x={centreX} y={centreY} textAnchor="middle" dominantBaseline="central" style={fontStyle}>
                {characters.map((character, index) => (
                  <tspan key={`hatch-clip-${index}`}>
                    {character}
                  </tspan>
                ))}
              </text>
            </clipPath>
          )}
          {useHatchFill && box && markBox && correctionIndex !== undefined && (
            // SVG text inside a clipPath does not consistently honour a
            // display:none tspan in Chrome. Mask the corrected glyph out of
            // the full-word hatch instead, so it can only receive the one
            // correction pencil layer below.
            <mask
              id={hatchMaskId}
              data-testid="stroke-text-hatch-mask"
              maskUnits="userSpaceOnUse"
              maskContentUnits="userSpaceOnUse"
              x={box.x - strokeWidth}
              y={box.y - strokeWidth}
              width={box.width + strokeWidth * 2}
              height={box.height + strokeWidth * 2}
            >
              <rect
                x={box.x - strokeWidth}
                y={box.y - strokeWidth}
                width={box.width + strokeWidth * 2}
                height={box.height + strokeWidth * 2}
                fill="white"
              />
              <rect
                x={markBox.x - strokeWidth}
                y={markBox.y - strokeWidth}
                width={markBox.width + strokeWidth * 2}
                height={markBox.height + strokeWidth * 2}
                fill="black"
              />
            </mask>
          )}
          {useHatchFill && markBox && correctionIndex !== undefined && (
            <clipPath
              id={correctionHatchClipId}
              data-testid="stroke-text-correction-hatch-clip"
              clipPathUnits="userSpaceOnUse"
            >
              {/* The clipping glyph is backwards with the outline, while the
                  hatch strokes themselves stay in the page's normal direction. */}
              <text
                x={markBox.x}
                y={centreY}
                dominantBaseline="central"
                style={fontStyle}
                transform={mirrorAboutBox(markBox)}
              >
                {characters[correctionIndex]}
              </text>
            </clipPath>
          )}
          {sketchFilter &&
            SKETCH_BOIL_SEEDS.map((seed, index) => (
              <filter
                key={seed}
                id={`${sketchId}-${index + 1}`}
                x="-12%"
                y="-12%"
                width="124%"
                height="124%"
                filterUnits="objectBoundingBox"
                primitiveUnits="userSpaceOnUse"
                colorInterpolationFilters="sRGB"
              >
                {/* The outline wanders off true, the way a drawn line does. */}
                <feTurbulence
                  type="fractalNoise"
                  baseFrequency={sketch.wobbleFrequency}
                  numOctaves={sketch.wobbleOctaves}
                  seed={seed}
                  result="wander"
                />
                <feDisplacementMap
                  in="SourceGraphic"
                  in2="wander"
                  scale={sketch.wobbleScale}
                  xChannelSelector="R"
                  yChannelSelector="G"
                  result="drawn"
                />
                {sketch.grainFrequency > 0 ? (
                  <>
                    {/* Much finer noise, cut into the alpha so the ink breaks
                        up across the paper instead of sitting flat. */}
                    <feTurbulence
                      type="fractalNoise"
                      baseFrequency={sketch.grainFrequency}
                      numOctaves="2"
                      seed={seed}
                      result="tooth"
                    />
                    <feColorMatrix
                      in="tooth"
                      type="matrix"
                      values={`0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 ${sketch.grainStrength} ${
                        1 - sketch.grainStrength
                      }`}
                      result="graphite"
                    />
                    <feComposite in="drawn" in2="graphite" operator="in" />
                  </>
                ) : null}
              </filter>
            ))}
          {sketch.fillTexture === "hatch" &&
            [
              { id: hatchId, angle: 48 },
              { id: hatchMirrorId, angle: -48 },
            ].map(({ id, angle }) => (
              // Shaded in by hand rather than flooded: the fill is drawn
              // strokes, which the grain above then breaks up like graphite.
              <pattern
                key={id}
                id={id}
                patternUnits="userSpaceOnUse"
                width={hatchGap}
                height={hatchGap}
                patternTransform={`rotate(${angle})`}
              >
                <line
                  x1="0"
                  y1="0"
                  x2="0"
                  y2={hatchGap}
                  stroke={inked.fillColor}
                  strokeWidth={Math.max(0.8, hatchGap * 0.28)}
                  strokeLinecap="round"
                />
              </pattern>
            ))}
        </defs>
        <g
          filter={sketchFilter}
          transform={`translate(${inkOffsetX}, ${inkOffset})`}
          // Until the host is measured the viewBox is a placeholder, which
          // would render the letters at the wrong scale for a frame. Hold them
          // back rather than show that flash.
          style={{ opacity: hostSize ? 1 : 0, transition: "opacity 120ms ease-out" }}
        >
        <text ref={textRef} data-stroke-layer className={styles.stroke} x={centreX} y={centreY} textAnchor="middle" dominantBaseline="central" fill="none" stroke={inked.strokeColor} strokeWidth={strokeWidth} strokeLinejoin="round" strokeLinecap="round" style={fontStyle} clipPath={box && isFirefox ? `url(#${outlineWipeId})` : undefined}>
          {characters.map((character, index) => (
            <tspan
              data-stroke-char
              key={`stroke-${index}`}
              stroke={index === correctionIndex ? "none" : undefined}
            >
              {character}
            </tspan>
          ))}
        </text>
        <text data-fill-layer className={styles.fill} x={centreX} y={centreY} textAnchor="middle" dominantBaseline="central" fill={useHatchFill ? "none" : fillPaint} stroke="none" style={fontStyle} clipPath={fillMode === "wipe" && box ? `url(#${wipeId})` : undefined}>
          {characters.map((character, index) => (
            <tspan
              data-fill-char
              key={`fill-${index}`}
              fill={index === correctionIndex ? "none" : undefined}
            >
              {character}
            </tspan>
          ))}
        </text>

          {useHatchFill && (
            <g
              data-testid="stroke-text-hatch-fill"
              clipPath={`url(#${hatchClipId})`}
              mask={markBox && correctionIndex !== undefined ? `url(#${hatchMaskId})` : undefined}
            >
              {hatchStrokes.map((stroke, index) => (
                <line
                  key={`hatch-stroke-${index}`}
                  data-hatch-stroke
                  x1={stroke.x1}
                  y1={stroke.y1}
                  x2={stroke.x2}
                  y2={stroke.y2}
                  stroke={inked.fillColor}
                  strokeWidth={stroke.strokeWidth}
                  strokeLinecap="round"
                  opacity={stroke.opacity}
                  strokeDasharray={UNMEASURED_DASH_LENGTH}
                  strokeDashoffset={UNMEASURED_DASH_LENGTH}
                />
              ))}
            </g>
          )}

          {markBox && correctionIndex !== undefined && (
            <g data-testid="stroke-text-correction">
              {/* The letter drawn back to front in its own place. */}
              <g transform={mirrorAboutBox(markBox)}>
                <text
                  data-correction-fill
                  data-fill-char
                  x={markBox.x}
                  y={centreY}
                  dominantBaseline="central"
                  fill={useHatchFill ? "none" : mirroredFillPaint}
                  stroke="none"
                  style={fontStyle}
                  clipPath={fillMode === "wipe" && box ? `url(#${wipeId})` : undefined}
                >
                  {characters[correctionIndex]}
                </text>
                <text
                  data-correction-stroke
                  data-stroke-char
                  x={markBox.x}
                  y={centreY}
                  dominantBaseline="central"
                  fill="none"
                  stroke={inked.strokeColor}
                  strokeWidth={strokeWidth}
                  strokeLinejoin="round"
                  strokeLinecap="round"
                  style={fontStyle}
                  clipPath={box && isFirefox ? `url(#${outlineWipeId})` : undefined}
                >
                  {characters[correctionIndex]}
                </text>
              </g>

              {useHatchFill && (
                // Keep the strokes at the same page-wide slope as every
                // other letter. Only the clip is mirrored to fit the
                // backwards N.
                <g
                  data-testid="stroke-text-correction-hatch-fill"
                  clipPath={`url(#${correctionHatchClipId})`}
                >
                  {hatchStrokes.map((stroke, index) => (
                    <line
                      key={`correction-hatch-stroke-${index}`}
                      data-correction-hatch-stroke
                      x1={stroke.x1}
                      y1={stroke.y1}
                      x2={stroke.x2}
                      y2={stroke.y2}
                      stroke={inked.fillColor}
                      strokeWidth={stroke.strokeWidth}
                      strokeLinecap="round"
                      opacity={stroke.opacity}
                      strokeDasharray={UNMEASURED_DASH_LENGTH}
                      strokeDashoffset={UNMEASURED_DASH_LENGTH}
                    />
                  ))}
                </g>
              )}

              {/* Red pen, drawn on after the letters have been sketched.
                  Dasharray/dashoffset here are only the pre-mount fallback --
                  the mount effect replaces them with each path's own measured
                  length once it can call getTotalLength(). */}
              {marks && (
                <g
                  className="boil-line"
                  fill="none"
                  stroke={CORRECTION_INK}
                  strokeWidth={correctionPen}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  {[marks.crossA, marks.crossB].map((stroke, index) => (
                    <path
                      key={index}
                      data-correction-cross
                      d={stroke}
                      style={{
                        strokeDasharray: UNMEASURED_DASH_LENGTH,
                        strokeDashoffset: UNMEASURED_DASH_LENGTH,
                        opacity: animate ? 0 : 1,
                      }}
                    />
                  ))}
                  {/* The replacement letter, written in above the crossing-out.
                      It carries its own pen width because it is drawn under a
                      scaling transform. */}
                  <path
                    data-correction-letter
                    d={marks.letter.d}
                    transform={marks.letter.transform}
                    strokeWidth={marks.letter.strokeWidth}
                    style={{
                      strokeDasharray: UNMEASURED_DASH_LENGTH,
                      strokeDashoffset: UNMEASURED_DASH_LENGTH,
                      opacity: animate ? 0 : 1,
                    }}
                  />
                </g>
              )}
            </g>
          )}
        </g>
      </svg>
    </span>
  );
}
