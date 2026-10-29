"use client";

import { useEffect, useRef } from "react";
import type { DependencyList } from "react";
import { useFrame, useThree } from "@react-three/fiber";

// The desk canvas renders on demand (frameloop "demand"): a desk at rest draws
// no frames at all. Anything that eases towards a target asks for frames
// itself, through these hooks.

// A frame's delta is the time since the last frame drawn, which can be minutes
// after a quiet spell. Exponential eases would jump straight to their target,
// so cap it to an ordinary frame or two.
export const MAX_FRAME_DELTA = 1 / 20;

// Keeps frames coming for `seconds` after mount and after any of `deps`
// changes, long enough for an ease to settle. With `shadows`, those frames
// also redraw the shadow map, which otherwise stays as it was: it only
// changes when the light or the furniture moves, never with the camera.
export function useRenderAfterChange(seconds: number, deps: DependencyList, { shadows = false } = {}) {
  const invalidate = useThree((state) => state.invalidate);
  const until = useRef(0);
  useEffect(() => {
    until.current = performance.now() + seconds * 1000;
    invalidate();
    // The caller's deps are the point: re-arm whenever they change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  useFrame(({ gl }) => {
    if (performance.now() > until.current) return;
    if (shadows) gl.shadowMap.needsUpdate = true;
    invalidate();
  });
}

// Renders every frame while `active`, for something that never settles.
export function useRenderWhile(active: boolean) {
  const invalidate = useThree((state) => state.invalidate);
  useEffect(() => {
    if (active) invalidate();
  }, [active, invalidate]);
  useFrame(() => {
    if (active) invalidate();
  });
}
