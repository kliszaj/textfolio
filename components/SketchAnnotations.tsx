"use client";

import { useEffect, useId, useRef, useState } from "react";
import {
  CORRECTION_INK,
  CORRECTION_PEN_SCALE,
  DEFAULT_STROKE_TEXT_CONFIG,
  SKETCH_BOIL_SEEDS,
  getSketchSpec,
} from "@/lib/strokeText";
import type { StrokeTextSketchStyle } from "@/lib/strokeText";
import { useLineBoilFrame } from "@/hooks/useLineBoilFrame";
import styles from "./SketchAnnotations.module.css";

export const SKETCH_ANNOTATIONS_STORAGE_KEY = "textfolio:sketch-annotations:v1";

type Point = { x: number; y: number };
type Stroke = { points: Point[] };

function readStrokes(): Stroke[] {
  try {
    const value = window.localStorage.getItem(SKETCH_ANNOTATIONS_STORAGE_KEY);
    if (!value) return [];
    const parsed: unknown = JSON.parse(value);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (stroke): stroke is Stroke =>
        typeof stroke === "object" &&
        stroke !== null &&
        Array.isArray((stroke as Stroke).points) &&
        (stroke as Stroke).points.every(
          (point) =>
            typeof point?.x === "number" &&
            typeof point?.y === "number" &&
            point.x >= 0 &&
            point.x <= 1 &&
            point.y >= 0 &&
            point.y <= 1
        )
    );
  } catch {
    return [];
  }
}

function pathFor(points: Point[], width: number, height: number): string {
  if (!points.length) return "";
  const scaled = points.map((point) => ({ x: point.x * width, y: point.y * height }));
  if (scaled.length === 1) {
    const point = scaled[0];
    return `M ${point.x} ${point.y} l 0.01 0`;
  }
  return scaled.reduce(
    (path, point, index) => `${path}${index === 0 ? "M" : " L"} ${point.x} ${point.y}`,
    ""
  );
}

export function SketchAnnotations({
  active,
  onDrawingChange,
  canStartDrawing = () => true,
  strokeColor = CORRECTION_INK,
  strokeWidth = DEFAULT_STROKE_TEXT_CONFIG.strokeWidth * CORRECTION_PEN_SCALE,
  sketchStyle = DEFAULT_STROKE_TEXT_CONFIG.sketchStyle,
}: {
  active: boolean;
  onDrawingChange?: (drawing: boolean, point: { x: number; y: number }) => void;
  canStartDrawing?: (point: { x: number; y: number }) => boolean;
  strokeColor?: string;
  strokeWidth?: number;
  sketchStyle?: StrokeTextSketchStyle;
}) {
  const rootRef = useRef<SVGSVGElement>(null);
  const pointerIdRef = useRef<number | null>(null);
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const strokesRef = useRef<Stroke[]>([]);
  const [size, setSize] = useState({ width: 1, height: 1 });
  const rawId = useId();
  const filterId = `annotation-sketch-${rawId.replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const sketch = getSketchSpec(sketchStyle);
  const sketchFrame = useLineBoilFrame(SKETCH_BOIL_SEEDS.length);
  const sketchFilter = sketch.wobbleScale > 0 ? `url(#${filterId}-${sketchFrame})` : undefined;

  useEffect(() => {
    // Read after hydration so persisted client-only ink cannot disagree with
    // the server-rendered empty SVG on the first frame.
    const timer = setTimeout(() => {
      const saved = readStrokes();
      strokesRef.current = saved;
      setStrokes(saved);
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const root = rootRef.current;
    if (!root || typeof ResizeObserver === "undefined") return;
    const measure = () => setSize({ width: root.clientWidth || 1, height: root.clientHeight || 1 });
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(root);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const root = rootRef.current;
    if (!active || !root) return;
    const pagePoint = (event: globalThis.PointerEvent): Point => {
      const bounds = root.getBoundingClientRect();
      return {
        x: Math.min(1, Math.max(0, (event.clientX - bounds.left) / Math.max(bounds.width, 1))),
        y: Math.min(1, Math.max(0, (event.clientY - bounds.top) / Math.max(bounds.height, 1))),
      };
    };
    const updateStrokes = (next: Stroke[]) => {
      strokesRef.current = next;
      setStrokes(next);
    };
    const onPointerDown = (event: globalThis.PointerEvent) => {
      const clientPoint = { x: event.clientX, y: event.clientY };
      if (event.button > 0 || !canStartDrawing(clientPoint)) return;
      event.preventDefault();
      pointerIdRef.current = event.pointerId;
      onDrawingChange?.(true, clientPoint);
      updateStrokes([...strokesRef.current, { points: [pagePoint(event)] }]);
    };
    const onPointerMove = (event: globalThis.PointerEvent) => {
      if (pointerIdRef.current !== event.pointerId) return;
      event.preventDefault();
      const point = pagePoint(event);
      const current = strokesRef.current;
      if (!current.length) return;
      const next = current.slice();
      const last = next[next.length - 1];
      const previous = last.points[last.points.length - 1];
      if (previous && Math.hypot(point.x - previous.x, point.y - previous.y) < 0.002) return;
      next[next.length - 1] = { points: [...last.points, point] };
      updateStrokes(next);
    };
    const finishStroke = (event: globalThis.PointerEvent) => {
      if (pointerIdRef.current !== event.pointerId) return;
      pointerIdRef.current = null;
      try {
        window.localStorage.setItem(
          SKETCH_ANNOTATIONS_STORAGE_KEY,
          JSON.stringify(strokesRef.current)
        );
      } catch {
        // Drawing still works when storage is unavailable or full.
      }
      onDrawingChange?.(false, { x: event.clientX, y: event.clientY });
    };
    window.addEventListener("pointerdown", onPointerDown, true);
    window.addEventListener("pointermove", onPointerMove, { capture: true, passive: false });
    window.addEventListener("pointerup", finishStroke, true);
    window.addEventListener("pointercancel", finishStroke, true);
    return () => {
      window.removeEventListener("pointerdown", onPointerDown, true);
      window.removeEventListener("pointermove", onPointerMove, true);
      window.removeEventListener("pointerup", finishStroke, true);
      window.removeEventListener("pointercancel", finishStroke, true);
    };
  }, [active, canStartDrawing, onDrawingChange]);

  return (
    <svg
      ref={rootRef}
      className={styles.root}
      data-testid="sketch-annotations"
      data-active={active}
      aria-label="Draw a red annotation over the sketch"
      role="img"
      viewBox={`0 0 ${size.width} ${size.height}`}
      preserveAspectRatio="none"
    >
      <defs>
        {sketchFilter &&
          SKETCH_BOIL_SEEDS.map((seed, index) => (
            <filter
              key={seed}
              id={`${filterId}-${index + 1}`}
              x="-12%"
              y="-12%"
              width="124%"
              height="124%"
              filterUnits="objectBoundingBox"
              primitiveUnits="userSpaceOnUse"
              colorInterpolationFilters="sRGB"
            >
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
              {sketch.grainFrequency > 0 && (
                <>
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
              )}
            </filter>
          ))}
      </defs>
      <g data-testid="sketch-annotation-ink" filter={sketchFilter}>
        {strokes.map((stroke, index) => (
          <path
            key={index}
            d={pathFor(stroke.points, size.width, size.height)}
            className={`${styles.stroke} boil-line`}
            stroke={strokeColor}
            strokeWidth={strokeWidth}
          />
        ))}
      </g>
    </svg>
  );
}
