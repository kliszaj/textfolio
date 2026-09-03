import { useCallback, useEffect, useRef, useState } from "react";
import { usePointerType } from "./usePointerType";
import {
  FAN_SMOOTHING_MS,
  FAN_SPLIT,
  FAN_THRESHOLD_PX,
  computeCursorTravel,
  computeScrollTravel,
  splitTravel,
} from "@/lib/fanProgress";
import { smoothTowards } from "@/lib/smoothing";
import type { FanPhases } from "@/lib/fanProgress";

const FAN_AT_REST: FanPhases = { fanProgress: 0, sweepProgress: 0 };

export function useFanProgress(
  thresholdPx: number = FAN_THRESHOLD_PX,
  fanSplit: number = FAN_SPLIT,
  smoothingMs: number = FAN_SMOOTHING_MS,
  enabled: boolean = true
): FanPhases {
  const pointerType = usePointerType();
  // Pointer and scroll events fire faster than the screen refreshes. They only
  // record where the cursor is; the animation loop below decides how often the
  // stack actually re-renders.
  const targetRef = useRef(0);
  const frameRef = useRef(0);
  const lastFrameRef = useRef(0);
  const smoothingRef = useRef(smoothingMs);
  // A wheel notch gives the cursor a floor to stand on rather than a value
  // that competes with it: cursor position still drives everything (moving
  // down opens further, moving up closes -- unchanged), but the very next
  // mousemove after a wheel kick is almost always incidental, not the visitor
  // actually reaching for the mouse, and would otherwise read the cursor's
  // real (unrelated) position and snap the reveal straight back to 0. The
  // floor absorbs exactly that, and only that: a genuine upward move -- the
  // whole point of "cursor up closes it" -- clears it immediately, and a
  // genuine downward move past it clears it too, once the cursor has simply
  // caught up to where the wheel already put things.
  const wheelFloorRef = useRef<number | null>(null);
  const lastMouseYRef = useRef<number | null>(null);
  const [travel, setTravel] = useState(0);

  useEffect(() => {
    smoothingRef.current = smoothingMs;
  }, [smoothingMs]);

  // Runs only while the stack is catching up, and stops itself once it lands.
  const startAnimating = useCallback(() => {
    if (frameRef.current) return;
    lastFrameRef.current = performance.now();

    const step = (now: number) => {
      const dt = now - lastFrameRef.current;
      lastFrameRef.current = now;
      let settled = false;
      setTravel((current) => {
        const next = smoothTowards(current, targetRef.current, dt, smoothingRef.current);
        settled = next === targetRef.current;
        return next;
      });
      frameRef.current = settled ? 0 : requestAnimationFrame(step);
    };

    frameRef.current = requestAnimationFrame(step);
  }, []);

  useEffect(() => {
    if (!enabled) {
      // Only tear the loop down here. Writing state synchronously in an effect
      // body triggers a cascading render, and it is unnecessary: the rest
      // position is derived below instead of stored.
      targetRef.current = 0;
      wheelFloorRef.current = null;
      lastMouseYRef.current = null;
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
      frameRef.current = 0;
      return;
    }

    const aim = (next: number) => {
      targetRef.current = next;
      startAnimating();
    };

    if (pointerType === "fine") {
      const handleMouseMove = (e: MouseEvent) => {
        const rawTravel = computeCursorTravel(e.clientY, window.innerHeight, thresholdPx);
        const floor = wheelFloorRef.current;
        if (floor === null) {
          aim(rawTravel);
        } else {
          const lastY = lastMouseYRef.current;
          const movingUp = lastY !== null && e.clientY < lastY;
          if (movingUp) {
            wheelFloorRef.current = null;
            aim(rawTravel);
          } else {
            if (rawTravel >= floor) wheelFloorRef.current = null;
            aim(Math.max(floor, rawTravel));
          }
        }
        lastMouseYRef.current = e.clientY;
      };

      const handleWheel = (event: WheelEvent) => {
        // Only a deliberate scroll down kicks the stack; scrolling up is left
        // alone entirely, and there's nothing to kick once the cursor has
        // already opened past where the first card lands.
        if (!Number.isFinite(event.deltaY) || event.deltaY <= 0) return;
        if (targetRef.current >= fanSplit) return;
        event.preventDefault();
        wheelFloorRef.current = fanSplit;
        aim(fanSplit);
      };

      const handleMouseLeave = () => {
        wheelFloorRef.current = null;
        aim(0);
      };

      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("wheel", handleWheel, { passive: false });
      document.documentElement.addEventListener("mouseleave", handleMouseLeave);
      return () => {
        window.removeEventListener("mousemove", handleMouseMove);
        window.removeEventListener("wheel", handleWheel);
        document.documentElement.removeEventListener("mouseleave", handleMouseLeave);
      };
    }

    const handleScroll = () => {
      const scrollableHeight = document.documentElement.scrollHeight - window.innerHeight;
      aim(computeScrollTravel(window.scrollY, scrollableHeight));
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, [enabled, pointerType, thresholdPx, fanSplit, startAnimating]);

  useEffect(() => {
    const frame = frameRef;
    return () => {
      if (frame.current) cancelAnimationFrame(frame.current);
      frame.current = 0;
    };
  }, []);

  // Disabled means at rest, whatever the last travel happened to be.
  return enabled ? splitTravel(travel, fanSplit) : FAN_AT_REST;
}
