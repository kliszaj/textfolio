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

export function useFanProgress(
  thresholdPx: number = FAN_THRESHOLD_PX,
  fanSplit: number = FAN_SPLIT,
  smoothingMs: number = FAN_SMOOTHING_MS
): FanPhases {
  const pointerType = usePointerType();
  // Pointer and scroll events fire faster than the screen refreshes. They only
  // record where the cursor is; the animation loop below decides how often the
  // stack actually re-renders.
  const targetRef = useRef(0);
  const frameRef = useRef(0);
  const lastFrameRef = useRef(0);
  const smoothingRef = useRef(smoothingMs);
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
    const aim = (next: number) => {
      targetRef.current = next;
      startAnimating();
    };

    if (pointerType === "fine") {
      const handleMouseMove = (e: MouseEvent) => {
        aim(computeCursorTravel(e.clientY, window.innerHeight, thresholdPx));
      };
      const handleMouseLeave = () => aim(0);
      window.addEventListener("mousemove", handleMouseMove);
      document.documentElement.addEventListener("mouseleave", handleMouseLeave);
      return () => {
        window.removeEventListener("mousemove", handleMouseMove);
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
  }, [pointerType, thresholdPx, startAnimating]);

  useEffect(() => {
    const frame = frameRef;
    return () => {
      if (frame.current) cancelAnimationFrame(frame.current);
      frame.current = 0;
    };
  }, []);

  return splitTravel(travel, fanSplit);
}
