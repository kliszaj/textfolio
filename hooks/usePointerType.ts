import { useEffect, useState } from "react";

export type PointerType = "fine" | "coarse";

export function usePointerType(): PointerType {
  // Keep the server and first client render identical. The media query is
  // applied immediately after hydration, before any mobile interaction is
  // enabled, rather than replacing the exported desktop markup mid-hydration.
  const [pointerType, setPointerType] = useState<PointerType>("fine");

  useEffect(() => {
    const mql = window.matchMedia("(pointer: coarse)");
    const updatePointerType = (matches: boolean) => setPointerType(matches ? "coarse" : "fine");
    const handleChange = (e: MediaQueryListEvent) =>
      updatePointerType(e.matches);
    updatePointerType(mql.matches);
    mql.addEventListener("change", handleChange);
    return () => mql.removeEventListener("change", handleChange);
  }, []);

  return pointerType;
}
