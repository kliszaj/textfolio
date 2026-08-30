"use client";

import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import {
  CORRECTION_CROSS_DELAY_MS,
  CORRECTION_CROSS_LEAD_MS,
  CORRECTION_CROSS_MS,
  CORRECTION_DRAW_MS,
  CORRECTION_INK,
  letterSequenceSeconds,
  SKETCH_BOIL_SEEDS,
  getSketchSpec,
  STROKE_INK_LIFT_PX,
  correctionMarks,
  inkCentringOffset,
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
const HATCH_LINE_DRAW_SECONDS = 0.22;
const HATCH_LINE_STAGGER_SECONDS = 0.014;
const HATCH_SETTLE_SECONDS = 0.18;

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
      opacity: 0.42 + graphiteNoise(index, 6) * 0.34,
      strokeWidth: Math.max(0.55, gap * (0.09 + graphiteNoise(index, 7) * 0.11)),
    });
    x += spacing;
    index += 1;
  }
  return strokes;
}

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
  const sketchId = `stroke-text-sketch-${safeId}`;
  const sketch = getSketchSpec(sketchStyle);
  const inked = sketchColors(sketchStyle, strokeColor, fillColor);
  const hatchId = `stroke-text-hatch-${safeId}`;
  const hatchMirrorId = `stroke-text-hatch-mirror-${safeId}`;
  const hatchClipId = `stroke-text-hatch-clip-${safeId}`;
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
        setBox((previous) => (
          previous && Math.abs(previous.x - next.x) < 0.5 && Math.abs(previous.y - next.y) < 0.5 && Math.abs(previous.width - next.width) < 0.5
            ? previous
            : next
        ));
      } catch {
        // SVG measurements are unavailable in a few non-browser renderers.
      }
    };
    const measureMark = () => {
      if (cancelled || correctionIndex === undefined || !rootRef.current) return;
      const glyph = rootRef.current.querySelectorAll<SVGTSpanElement>("[data-stroke-char]")[
        correctionIndex
      ];
      if (!glyph) return;
      try {
        const bounds = glyph.getBBox();
        if (!bounds.width) return;
        setMarkBox((previous) =>
          previous && Math.abs(previous.x - bounds.x) < 0.5 && Math.abs(previous.width - bounds.width) < 0.5
            ? previous
            : { x: bounds.x, y: bounds.y, width: bounds.width, height: bounds.height }
        );
      } catch {
        // No SVG measurement outside a browser; the mark simply does not draw.
      }
    };

    measure();
    measureMark();
    document.fonts?.ready.then(() => {
      measure();
      measureMark();
    }).catch(() => {});
    return () => { cancelled = true; };
  }, [characters, fontSize, fontWeight, letterSpacing, strokeWidth, hostSize, correctionIndex]);

  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root || typeof ResizeObserver === "undefined") return;
    const read = () => {
      const rect = root.getBoundingClientRect();
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
    const hatchLines = Array.from(root.querySelectorAll<SVGLineElement>("[data-hatch-stroke]"));
    const correctionLoop = root.querySelector<SVGPathElement>("[data-correction-loop]");
    const correctionCrosses = Array.from(
      root.querySelectorAll<SVGPathElement>("[data-correction-cross]")
    );
    const correctionPaths = [correctionLoop, ...correctionCrosses].filter(
      (path): path is SVGPathElement => path !== null
    );
    const wipe = wipeRectRef.current;
    if (!strokes.length) return;
    const fillEnabled = fillMode !== "none";
    const useWipe = fillEnabled && fillMode === "wipe";
    const useHatchFill = fillEnabled && fillMode === "hatch" && sketch.fillTexture === "hatch";
    const fillDuration = Math.max(0.4, drawDuration * 0.5);
    const staggerConfig = reverse ? { each: stagger, from: "end" as const } : stagger;
    const outlineEnd = letterSequenceSeconds(drawDuration, stagger, strokes.length);
    // Pencil hatching starts on the same beat as the outlines, so the fill
    // grows with the letters instead of waiting for the first one to finish.
    // A configured delay still remains available for deliberate tuning.
    const fillStart = useHatchFill
      ? Math.max(0, fillDelay)
      : outlineEnd + fillDelay;
    const targets = [...strokes, ...fills, ...hatchLines, ...correctionPaths, wipe].filter(Boolean);

    const setStart = () => {
      gsap.killTweensOf(targets);
      gsap.set(strokes, { strokeDasharray: dash, strokeDashoffset: dash });
      gsap.set(fills, { opacity: useWipe ? 1 : 0 });
      gsap.set(hatchLines, { strokeDasharray: 1, strokeDashoffset: 1 });
      gsap.set(correctionPaths, { strokeDasharray: 1, strokeDashoffset: 1 });
      if (wipe) gsap.set(wipe, { attr: { width: 0 } });
    };
    const setEnd = () => {
      gsap.killTweensOf(targets);
      gsap.set(strokes, { strokeDasharray: dash, strokeDashoffset: 0 });
      gsap.set(fills, { opacity: fillEnabled ? 1 : 0 });
      gsap.set(hatchLines, { strokeDasharray: 1, strokeDashoffset: 0 });
      gsap.set(correctionPaths, { strokeDasharray: 1, strokeDashoffset: 0 });
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
      if (correctionLoop) {
        timeline.to(
          correctionLoop,
          {
            strokeDashoffset: 0,
            duration: CORRECTION_DRAW_MS / 1000,
            ease: "power1.out",
          },
          correctionStart
        );
      }
      correctionCrosses.forEach((cross, index) => {
        timeline.to(
          cross,
          {
            strokeDashoffset: 0,
            duration: CORRECTION_CROSS_MS / 1000,
            ease: "power1.out",
          },
          correctionStart +
            CORRECTION_CROSS_LEAD_MS / 1000 +
            (CORRECTION_CROSS_DELAY_MS / 1000) * index
        );
      });
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
    box,
    correctionIndex,
    dash,
    drawDuration,
    ease,
    fillDelay,
    fillMode,
    hatchStrokes.length,
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
          {useHatchFill && (
            <clipPath id={hatchClipId} clipPathUnits="userSpaceOnUse">
              <text x={centreX} y={centreY} textAnchor="middle" dominantBaseline="central" style={fontStyle}>
                {characters.map((character, index) => (
                  <tspan key={`hatch-clip-${index}`}>{character}</tspan>
                ))}
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
          transform={`translate(0, ${inkOffset})`}
          // Until the host is measured the viewBox is a placeholder, which
          // would render the letters at the wrong scale for a frame. Hold them
          // back rather than show that flash.
          style={{ opacity: hostSize ? 1 : 0, transition: "opacity 120ms ease-out" }}
        >
        <text ref={textRef} data-stroke-layer className={styles.stroke} x={centreX} y={centreY} textAnchor="middle" dominantBaseline="central" fill="none" stroke={inked.strokeColor} strokeWidth={strokeWidth} strokeLinejoin="round" strokeLinecap="round" style={fontStyle}>
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
            <g data-testid="stroke-text-hatch-fill" clipPath={`url(#${hatchClipId})`}>
              {hatchStrokes.map((stroke, index) => (
                <line
                  key={`hatch-stroke-${index}`}
                  data-hatch-stroke
                  x1={stroke.x1}
                  y1={stroke.y1}
                  x2={stroke.x2}
                  y2={stroke.y2}
                  pathLength={1}
                  stroke={inked.fillColor}
                  strokeWidth={stroke.strokeWidth}
                  strokeLinecap="round"
                  opacity={stroke.opacity}
                  strokeDasharray={1}
                  strokeDashoffset={1}
                />
              ))}
            </g>
          )}

          {markBox && correctionIndex !== undefined && (
            <g data-testid="stroke-text-correction">
              {/* The letter drawn back to front in its own place -- outline
                  and shading together, or the hatching would stay the right
                  way round inside a reversed outline. */}
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
                >
                  {characters[correctionIndex]}
                </text>
              </g>

              {/* Red pen, drawn on after the letters have been sketched.
                  pathLength normalises each path to 1, so the dash animation
                  draws it stroke-by-stroke without needing its real length. */}
              {marks && (
                <g
                  className="boil-line"
                  fill="none"
                  stroke={CORRECTION_INK}
                  strokeWidth={correctionPen}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path
                    data-correction-loop
                    d={marks.loop}
                    pathLength={1}
                    style={{
                      strokeDasharray: 1,
                      strokeDashoffset: 1,
                    }}
                  />
                  {[marks.crossA, marks.crossB].map((stroke, index) => (
                    <path
                      key={index}
                      data-correction-cross
                      d={stroke}
                      pathLength={1}
                      style={{
                        strokeDasharray: 1,
                        strokeDashoffset: 1,
                      }}
                    />
                  ))}
                </g>
              )}
            </g>
          )}
        </g>
      </svg>
    </span>
  );
}
