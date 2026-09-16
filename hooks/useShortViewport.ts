import { useEffect, useState } from "react";

// Below this, a resting stack band sized as a percentage of the viewport
// stops being enough real pixels to hold a case study's title and blurb
// without the two overlapping -- a short desktop window falls into this just
// as easily as a phone in landscape, so this is keyed on actual height
// rather than standing in for "mobile."
export const SHORT_VIEWPORT_MAX_HEIGHT_PX = 700;

export function useShortViewport(): boolean {
  // Keep the server and first client render identical, matching
  // usePointerType's reasoning: the media query applies right after
  // hydration rather than replacing the exported markup mid-hydration.
  const [short, setShort] = useState(false);

  useEffect(() => {
    const mql = window.matchMedia(`(max-height: ${SHORT_VIEWPORT_MAX_HEIGHT_PX}px)`);
    const update = (matches: boolean) => setShort(matches);
    const handleChange = (e: MediaQueryListEvent) => update(e.matches);
    update(mql.matches);
    mql.addEventListener("change", handleChange);
    return () => mql.removeEventListener("change", handleChange);
  }, []);

  return short;
}
