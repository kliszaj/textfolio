import { useEffect, useState } from "react";
import { usePointerType } from "./usePointerType";
import { computeCursorFanProgress, computeScrollFanProgress } from "@/lib/fanProgress";

export function useFanProgress(): number {
  const pointerType = usePointerType();
  const [fanProgress, setFanProgress] = useState(0);

  useEffect(() => {
    if (pointerType === "fine") {
      const handleMouseMove = (e: MouseEvent) => {
        setFanProgress(computeCursorFanProgress(e.clientY, window.innerHeight));
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
  }, [pointerType]);

  return fanProgress;
}
