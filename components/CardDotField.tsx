"use client";

import { useEffect, useRef } from "react";

const SPACING = 28;
// A dot right under the pointer; they shrink to nothing at REACH.
const RADIUS = 7;
const REACH = 80;
// Share of the way to its size a dot covers each frame, so the patch trails
// the pointer a little and melts away when it leaves.
const EASE = 0.18;

// The same colour for a dot each time, without Math.random: picked by a hash
// of its place in the grid.
function hash(column: number, row: number) {
  const n = Math.sin(column * 127.1 + row * 311.7) * 43758.5453;
  return n - Math.floor(n);
}

// The page dots, scattered into a field inside a card, that only shows
// around the pointer: dots in the page colours grow out of the card as it
// comes near and shrink away behind it. Hover only, so touch leaves the card
// plain; with reduced motion the patch follows without easing.
export function CardDotField({ colors }: { colors: string[] }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const card = canvas?.parentElement;
    if (!canvas || !card || colors.length === 0 || !window.matchMedia?.("(hover: hover)").matches) return;
    const ease = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 1 : EASE;
    const context = canvas.getContext("2d");
    if (!context) return;

    let frame: number | null = null;
    let pointer: { x: number; y: number } | null = null;
    // Each dot's current size, 0 to 1, eased toward its target frame by frame.
    let size = new Float32Array(0);
    let columns = 0;
    let rows = 0;

    const resize = () => {
      const box = card.getBoundingClientRect();
      const ratio = window.devicePixelRatio || 1;
      canvas.width = Math.round(box.width * ratio);
      canvas.height = Math.round(box.height * ratio);
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
      columns = Math.ceil(box.width / SPACING);
      rows = Math.ceil(box.height / SPACING);
      size = new Float32Array(columns * rows);
    };

    const draw = () => {
      frame = null;
      const box = card.getBoundingClientRect();
      context.clearRect(0, 0, box.width, box.height);
      const offsetX = (box.width - (columns - 1) * SPACING) / 2;
      const offsetY = (box.height - (rows - 1) * SPACING) / 2;
      let settling = false;
      for (let row = 0; row < rows; row++) {
        for (let column = 0; column < columns; column++) {
          const x = offsetX + column * SPACING;
          const y = offsetY + row * SPACING;
          const index = row * columns + column;
          const near = pointer ? Math.max(0, 1 - Math.hypot(x - pointer.x, y - pointer.y) / REACH) : 0;
          const target = near * near * (3 - 2 * near);
          size[index] += (target - size[index]) * ease;
          if (Math.abs(target - size[index]) > 0.005) settling = true;
          else size[index] = target;
          if (size[index] < 0.02) continue;
          context.beginPath();
          context.arc(x, y, RADIUS * size[index], 0, Math.PI * 2);
          context.fillStyle = colors[Math.floor(hash(column, row) * colors.length)];
          context.fill();
        }
      }
      if (settling) frame = requestAnimationFrame(draw);
    };
    const request = () => {
      if (frame === null) frame = requestAnimationFrame(draw);
    };
    const local = (event: PointerEvent) => {
      const box = card.getBoundingClientRect();
      return { x: event.clientX - box.left, y: event.clientY - box.top };
    };

    const enter = (event: PointerEvent) => {
      // Sized on the way in: the card may have changed since the last visit.
      if (frame === null) resize();
      pointer = local(event);
      request();
    };
    const move = (event: PointerEvent) => {
      pointer = local(event);
      request();
    };
    const leave = () => {
      pointer = null;
      request();
    };

    card.addEventListener("pointerenter", enter);
    card.addEventListener("pointermove", move);
    card.addEventListener("pointerleave", leave);
    return () => {
      card.removeEventListener("pointerenter", enter);
      card.removeEventListener("pointermove", move);
      card.removeEventListener("pointerleave", leave);
      if (frame !== null) cancelAnimationFrame(frame);
    };
  }, [colors]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 size-full"
    />
  );
}
