"use client";

import { useEffect } from "react";

// Keeps the browser's "Save image/video as" menu and drag-to-desktop off the
// site's media, everywhere, from one listener rather than a prop on each tile.
// A deterrent only: anything shown on a page has already reached the visitor.
export function MediaGuard() {
  useEffect(() => {
    const guard = (event: Event) => {
      if (event.target instanceof Element && event.target.closest("img, video")) event.preventDefault();
    };
    document.addEventListener("contextmenu", guard);
    document.addEventListener("dragstart", guard);
    return () => {
      document.removeEventListener("contextmenu", guard);
      document.removeEventListener("dragstart", guard);
    };
  }, []);
  return null;
}
