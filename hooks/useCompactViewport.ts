import { useEffect, useState } from "react";
import { SHORT_VIEWPORT_MAX_HEIGHT_PX } from "./useShortViewport";

// The built-in display of a 14-inch MacBook Pro sits at 982 CSS pixels tall.
// External monitors (1080p+) clear this threshold, so the compact boost only
// fires on the laptop's own screen.
export const COMPACT_VIEWPORT_MAX_HEIGHT_PX = 1050;

export function useCompactViewport(): boolean {
  const [compact, setCompact] = useState(false);

  useEffect(() => {
    const mql = window.matchMedia(
      `(min-height: ${SHORT_VIEWPORT_MAX_HEIGHT_PX + 1}px) and (max-height: ${COMPACT_VIEWPORT_MAX_HEIGHT_PX}px)`
    );
    const update = (matches: boolean) => setCompact(matches);
    const handleChange = (e: MediaQueryListEvent) => update(e.matches);
    update(mql.matches);
    mql.addEventListener("change", handleChange);
    return () => mql.removeEventListener("change", handleChange);
  }, []);

  return compact;
}
