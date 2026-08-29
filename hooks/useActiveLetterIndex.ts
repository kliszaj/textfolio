import { useEffect, useRef, useState } from "react";
import { usePointerType } from "./usePointerType";

const AUTO_CYCLE_INTERVAL_MS = 3000;

export function useActiveLetterIndex(letterCount: number, isVisible: boolean) {
  const pointerType = usePointerType();
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [cycleIndex, setCycleIndex] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (pointerType !== "coarse" || !isVisible) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }
    intervalRef.current = setInterval(() => {
      setCycleIndex((prev) => (prev + 1) % letterCount);
    }, AUTO_CYCLE_INTERVAL_MS);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [pointerType, isVisible, letterCount]);

  if (pointerType === "coarse") {
    return { activeIndex: cycleIndex, onEnter: () => {}, onLeave: () => {} };
  }

  return {
    activeIndex: hoveredIndex,
    onEnter: (index: number) => setHoveredIndex(index),
    onLeave: () => setHoveredIndex(null),
  };
}
