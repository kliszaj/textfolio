"use client";

import { useEffect, useRef } from "react";

const SPACING = 28;
// A dot right under the pointer; they shrink to nothing at REACH.
const RADIUS = 7;
const REACH = 80;
// Share of the way to its size a dot covers each frame, so the patch trails
// the pointer a little and melts away when it leaves.
const EASE = 0.18;
// Over the card's button (marked data-dot-target) the dots pour into it: each
// is pulled this share of the rest of the way per frame, slowly at first and
// then faster (the pull is squared), shrinking as it goes.
const PULL = 0.07;

// The same colour for a dot each time, without Math.random: picked by a hash
// of its place in the grid.
function hash(column: number, row: number) {
  const n = Math.sin(column * 127.1 + row * 311.7) * 43758.5453;
  return n - Math.floor(n);
}

// The page dots, scattered into a field inside a card, that only shows
// around the pointer: dots in the page colours grow out of the card as it
// comes near and shrink away behind it. Over the card's button they pour into
// it instead, and the card is marked data-absorbing (with one of the dots'
// colours as --pour-color) for the button to fill.
// Hover only, so touch leaves the card plain; with reduced motion the patch
// follows without easing.
export function CardDotField({ colors }: { colors: string[] }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const card = canvas?.parentElement;
    if (!canvas || !card || colors.length === 0 || !window.matchMedia?.("(hover: hover)").matches) return;
    const ease = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 1 : EASE;
    const context = canvas.getContext("2d");
    if (!context) return;

    const target = card.querySelector<HTMLElement>("[data-dot-target]");
    let frame: number | null = null;
    let pointer: { x: number; y: number } | null = null;
    // Where the dots pour to while the pointer is on the button, else null.
    let sink: { x: number; y: number } | null = null;
    // The colour the button last filled with.
    let pouredColor: string | null = null;
    // Each dot's current size, 0 to 1, eased toward its target frame by frame;
    // how far it has been pulled into the button, 0 to 1; and whether it has
    // gone in, so it stays gone until the pointer leaves the button.
    let size = new Float32Array(0);
    let pull = new Float32Array(0);
    let poured = new Uint8Array(0);
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
      pull = new Float32Array(columns * rows);
      poured = new Uint8Array(columns * rows);
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
          const goal = poured[index] ? 0 : near * near * (3 - 2 * near);
          size[index] += (goal - size[index]) * ease;
          if (Math.abs(goal - size[index]) > 0.005) settling = true;
          else size[index] = goal;
          // Pulled in while over the button; let go, a dot eases home.
          const pullGoal = sink ? 1 : 0;
          pull[index] += (pullGoal - pull[index]) * (sink ? PULL : ease);
          if (Math.abs(pullGoal - pull[index]) > 0.005) settling = true;
          else pull[index] = pullGoal;
          const travel = pull[index] * pull[index];
          if (sink && travel > 0.95) poured[index] = 1;
          const radius = RADIUS * size[index] * (1 - travel);
          if (radius < 0.15) continue;
          const to = sink ?? { x, y };
          context.beginPath();
          context.arc(x + (to.x - x) * travel, y + (to.y - y) * travel, radius, 0, Math.PI * 2);
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

    // Whether the pointer is on the button: then the dots pour into its
    // centre, and once it's off again the ones that went in may come back.
    const aim = () => {
      let next: typeof sink = null;
      if (pointer && target) {
        const box = card.getBoundingClientRect();
        const button = target.getBoundingClientRect();
        const centre = { x: button.left - box.left + button.width / 2, y: button.top - box.top + button.height / 2 };
        if (Math.hypot(pointer.x - centre.x, pointer.y - centre.y) <= button.width / 2) next = centre;
      }
      if (!next && sink) poured.fill(0);
      // A fresh colour each time the dots start pouring in, picked from the
      // field's own and never the last one; kept while the fill drains away.
      if (next && !sink) {
        const choices = colors.length > 1 ? colors.filter((color) => color !== pouredColor) : colors;
        pouredColor = choices[Math.floor(Math.random() * choices.length)];
        card.style.setProperty("--pour-color", pouredColor);
      }
      sink = next;
      card.dataset.absorbing = String(sink !== null);
    };
    const enter = (event: PointerEvent) => {
      // Sized on the way in: the card may have changed since the last visit.
      if (frame === null) resize();
      pointer = local(event);
      aim();
      request();
    };
    const move = (event: PointerEvent) => {
      pointer = local(event);
      aim();
      request();
    };
    const leave = () => {
      pointer = null;
      aim();
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
      delete card.dataset.absorbing;
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
