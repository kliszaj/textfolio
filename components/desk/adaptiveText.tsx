"use client";

import { useCallback, useEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";

// Text over the desk is ink or cream, picked against the background. The 3D
// model can pass behind it, though (the chair, orbited), and the background
// pick knows nothing about that. So, like iOS over a wallpaper, each letter
// looks at the canvas pixels behind it and flips to the other colour only
// where the model behind it would swallow it -- letter by letter, and only
// then.

type Target = HTMLElement | SVGElement;
const targets = new Set<Target>();
let notify: (() => void) | null = null;

// A ref callback, stable across renders so letters register once. React 19
// runs the returned cleanup when the element goes.
export function adaptiveRef(element: Target | null) {
  if (!element) return;
  targets.add(element);
  notify?.();
  return () => {
    targets.delete(element);
  };
}

// One span per letter, so each can turn on its own; spaces stay plain text.
export function AdaptiveText({ text }: { text: string }) {
  return (
    <>
      {Array.from(text).map((char, i) =>
        char === " " ? (
          " "
        ) : (
          <span key={i} ref={adaptiveRef} className="transition-colors duration-300">
            {char}
          </span>
        ),
      )}
    </>
  );
}

const INK = "#1c1c1c";
const CREAM = "#F5EDE6";
const linear = (c: number) => (c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
const luminanceOf = (r: number, g: number, b: number) => 0.2126 * linear(r) + 0.7152 * linear(g) + 0.0722 * linear(b);
const INK_LUMINANCE = luminanceOf(0x1c / 255, 0x1c / 255, 0x1c / 255);
const CREAM_LUMINANCE = luminanceOf(0xf5 / 255, 0xed / 255, 0xe6 / 255);
const contrast = (a: number, b: number) => (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);

// At most this often while frames are being drawn; once more after the last.
const SAMPLE_EVERY_MS = 100;
// Sample points per letter, across its middle (glyphs rarely fill the box).
const GRID = { x: 3, y: 4, inset: 0.22 };
// Share of a letter's points that must want the other colour to flip it,
// and to flip it back: apart, so a letter on an edge doesn't flicker.
const FLIP_AT = 0.5;
const UNFLIP_AT = 0.3;
// Canvas pixels more transparent than this show the backdrop, which the base
// colour was already picked for.
const MODEL_ALPHA = 0.5;

// Lives inside the Canvas, which needs preserveDrawingBuffer so the last
// frame can still be read after it has been shown.
export function AdaptiveTextSampler({ base }: { base: string }) {
  const gl = useThree((state) => state.gl);
  const timer = useRef<number | null>(null);
  const buffer = useRef(new Uint8Array(0));

  const sample = useCallback(() => {
    timer.current = null;
    const canvas = gl.domElement;
    const rect = canvas.getBoundingClientRect();
    if (!rect.width || !rect.height || targets.size === 0) return;
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const opposite = base === INK ? CREAM : INK;

    // One read covering every letter, in device pixels.
    const boxes = new Map<Target, DOMRect>();
    let left = Infinity, top = Infinity, right = -Infinity, bottom = -Infinity;
    for (const target of targets) {
      const box = target.getBoundingClientRect();
      if (!box.width || !box.height) continue;
      boxes.set(target, box);
      left = Math.min(left, box.left);
      top = Math.min(top, box.top);
      right = Math.max(right, box.right);
      bottom = Math.max(bottom, box.bottom);
    }
    if (boxes.size === 0) return;
    const x0 = Math.max(0, Math.floor((left - rect.left) * scaleX));
    const y0 = Math.max(0, Math.floor((top - rect.top) * scaleY));
    const x1 = Math.min(canvas.width, Math.ceil((right - rect.left) * scaleX));
    const y1 = Math.min(canvas.height, Math.ceil((bottom - rect.top) * scaleY));
    const width = x1 - x0;
    const height = y1 - y0;
    if (width <= 0 || height <= 0) return;
    if (buffer.current.length < width * height * 4) buffer.current = new Uint8Array(width * height * 4);
    const pixels = buffer.current;
    const context = gl.getContext();
    // WebGL's rows run bottom up.
    context.readPixels(x0, canvas.height - y1, width, height, context.RGBA, context.UNSIGNED_BYTE, pixels);

    for (const [target, box] of boxes) {
      let want = 0;
      let total = 0;
      for (let gy = 0; gy < GRID.y; gy++) for (let gx = 0; gx < GRID.x; gx++) {
        const u = GRID.inset + (1 - 2 * GRID.inset) * (GRID.x === 1 ? 0.5 : gx / (GRID.x - 1));
        const v = GRID.inset + (1 - 2 * GRID.inset) * (GRID.y === 1 ? 0.5 : gy / (GRID.y - 1));
        const px = Math.floor((box.left + box.width * u - rect.left) * scaleX) - x0;
        const py = Math.floor((box.top + box.height * v - rect.top) * scaleY) - y0;
        if (px < 0 || py < 0 || px >= width || py >= height) continue;
        total++;
        const i = ((height - 1 - py) * width + px) * 4;
        const alpha = pixels[i + 3] / 255;
        if (alpha < MODEL_ALPHA) continue;
        // The canvas is premultiplied: undo it for the model's own colour.
        const lum = luminanceOf(pixels[i] / 255 / alpha, pixels[i + 1] / 255 / alpha, pixels[i + 2] / 255 / alpha);
        const better = contrast(lum, CREAM_LUMINANCE) > contrast(lum, INK_LUMINANCE) ? CREAM : INK;
        if (better === opposite) want++;
      }
      if (total === 0) continue;
      const share = want / total;
      const flipped = target.dataset.flipped === "1";
      const flip = flipped ? share > UNFLIP_AT : share > FLIP_AT;
      target.dataset.flipped = flip ? "1" : "0";
      target.style.color = flip ? opposite : "";
    }
  }, [gl, base]);

  const schedule = useCallback(() => {
    if (timer.current === null) timer.current = window.setTimeout(sample, SAMPLE_EVERY_MS);
  }, [sample]);

  // New letters (the minute ticking over), a new base colour, a resize.
  useEffect(() => {
    notify = schedule;
    schedule();
    window.addEventListener("resize", schedule);
    return () => {
      if (notify === schedule) notify = null;
      window.removeEventListener("resize", schedule);
      if (timer.current !== null) window.clearTimeout(timer.current);
      timer.current = null;
    };
  }, [schedule]);

  // Every drawn frame may have moved something behind the text. The canvas
  // renders on demand, so this costs nothing while the desk is still.
  useFrame(schedule);

  return null;
}
