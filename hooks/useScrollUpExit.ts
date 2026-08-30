"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { pullAfterWheel, shouldExit } from "@/lib/scrollExit";
import { smoothTowards } from "@/lib/smoothing";

// How long the gesture may idle before the page springs back to rest.
const RELEASE_AFTER_MS = 110;
const SPRING_MS = 140;

// Returns how far the exit gesture has been pulled, in gesture pixels, and
// calls onExit once it is committed. The caller decides what that looks like.
export function useScrollUpExit(onExit: () => void, enabled: boolean = true): number {
  const [pull, setPull] = useState(0);
  const pullRef = useRef(0);
  const lastInputRef = useRef(0);
  const frameRef = useRef(0);
  const exitedRef = useRef(false);
  const onExitRef = useRef(onExit);

  useEffect(() => {
    onExitRef.current = onExit;
  }, [onExit]);

  const apply = useCallback((next: number) => {
    pullRef.current = next;
    setPull(next);
  }, []);

  // Springs the page back when the reader stops short, so an abandoned gesture
  // returns to rest instead of hanging half-open.
  const startSpring = useCallback(() => {
    if (frameRef.current) return;
    let last = performance.now();

    const step = (now: number) => {
      const dt = now - last;
      last = now;
      frameRef.current = 0;

      if (exitedRef.current) return;
      if (now - lastInputRef.current < RELEASE_AFTER_MS) {
        frameRef.current = requestAnimationFrame(step);
        return;
      }

      const next = smoothTowards(pullRef.current, 0, dt, SPRING_MS);
      apply(next);
      if (next !== 0) frameRef.current = requestAnimationFrame(step);
    };

    frameRef.current = requestAnimationFrame(step);
  }, [apply]);

  useEffect(() => {
    if (!enabled) return;

    const handleWheel = (event: WheelEvent) => {
      if (exitedRef.current) return;
      const atTop = window.scrollY <= 0;
      const next = pullAfterWheel(pullRef.current, event.deltaY, atTop);

      // Only swallow the event once the gesture is genuinely under way, so
      // ordinary scrolling and the browser's own overscroll are untouched.
      if (atTop && next > 0 && event.cancelable) event.preventDefault();

      lastInputRef.current = performance.now();
      apply(next);

      if (shouldExit(next)) {
        exitedRef.current = true;
        onExitRef.current();
        return;
      }
      startSpring();
    };

    window.addEventListener("wheel", handleWheel, { passive: false });
    return () => window.removeEventListener("wheel", handleWheel);
  }, [enabled, apply, startSpring]);

  useEffect(() => {
    const frame = frameRef;
    return () => {
      if (frame.current) cancelAnimationFrame(frame.current);
      frame.current = 0;
    };
  }, []);

  return enabled ? pull : 0;
}
