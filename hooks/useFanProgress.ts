import { useCallback, useEffect, useRef, useState } from "react";
import { usePointerType } from "./usePointerType";
import {
  FAN_POINTER_TAKEOVER_PX,
  FAN_SMOOTHING_MS,
  FAN_SPLIT,
  FAN_THRESHOLD_PX,
  computeCursorTravel,
  computeScrollTravel,
  splitTravel,
  // travelAfterWheel,
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
  // Where the pointer was when the wheel last took the gesture, so the cursor
  // has to genuinely move before it takes it back.
  const wheelAnchorRef = useRef<{ x: number; y: number } | null>(null);
  const pointerRef = useRef<{ x: number; y: number } | null>(null);
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
      wheelAnchorRef.current = null;
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
        pointerRef.current = { x: e.clientX, y: e.clientY };

        const anchor = wheelAnchorRef.current;
        if (anchor) {
          const moved = Math.hypot(e.clientX - anchor.x, e.clientY - anchor.y);
          // Still within a jog of where the scroll left off: the cursor has not
          // meant anything by it yet, so leave the scrolled position alone.
          if (moved <= FAN_POINTER_TAKEOVER_PX) return;
          wheelAnchorRef.current = null;
        }

        aim(computeCursorTravel(e.clientY, window.innerHeight, thresholdPx));
      };

      // Wheel input is parked for now. Uncomment this handler, its listener
      // and its teardown below, plus the travelAfterWheel import, to bring the
      // scroll gesture back. The pointer-takeover guard it relies on is still
      // in handleMouseMove and is inert while no wheel event ever fires.
      // const handleWheel = (e: WheelEvent) => {
      //   wheelAnchorRef.current = pointerRef.current ?? { x: 0, y: 0 };
      //   aim(travelAfterWheel(targetRef.current, e.deltaY));
      // };

      const handleMouseLeave = () => {
        wheelAnchorRef.current = null;
        aim(0);
      };

      window.addEventListener("mousemove", handleMouseMove);
      // window.addEventListener("wheel", handleWheel, { passive: true });
      document.documentElement.addEventListener("mouseleave", handleMouseLeave);
      return () => {
        window.removeEventListener("mousemove", handleMouseMove);
        // window.removeEventListener("wheel", handleWheel);
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
  }, [enabled, pointerType, thresholdPx, startAnimating]);

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
