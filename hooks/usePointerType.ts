import { useEffect, useState } from "react";

export type PointerType = "fine" | "coarse";

export function usePointerType(): PointerType {
  const [pointerType, setPointerType] = useState<PointerType>(() =>
    typeof window !== "undefined" && window.matchMedia("(pointer: coarse)").matches
      ? "coarse"
      : "fine"
  );

  useEffect(() => {
    const mql = window.matchMedia("(pointer: coarse)");
    const handleChange = (e: MediaQueryListEvent) =>
      setPointerType(e.matches ? "coarse" : "fine");
    mql.addEventListener("change", handleChange);
    return () => mql.removeEventListener("change", handleChange);
  }, []);

  return pointerType;
}
