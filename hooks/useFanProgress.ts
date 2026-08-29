import { useEffect, useState } from "react";
import { usePointerType } from "./usePointerType";
import { FAN_THRESHOLD_PX, computeCursorFanProgress, computeScrollFanProgress } from "@/lib/fanProgress";

export function useFanProgress(thresholdPx: number = FAN_THRESHOLD_PX): number {
  const pointerType = usePointerType();
  const [fanProgress, setFanProgress] = useState(0);

  useEffect(() => {
    if (pointerType === "fine") {
      const handleMouseMove = (e: MouseEvent) => {
        setFanProgress(computeCursorFanProgress(e.clientY, window.innerHeight, thresholdPx));
      };
      const handleMouseLeave = () => setFanProgress(0);
      window.addEventListener("mousemove", handleMouseMove);
      document.documentElement.addEventListener("mouseleave", handleMouseLeave);
      return () => {
        window.removeEventListener("mousemove", handleMouseMove);
        document.documentElement.removeEventListener("mouseleave", handleMouseLeave);
      };
    }

    const handleScroll = () => {
      const scrollableHeight = document.documentElement.scrollHeight - window.innerHeight;
      setFanProgress(computeScrollFanProgress(window.scrollY, scrollableHeight));
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, [pointerType, thresholdPx]);

  return fanProgress;
}
