"use client";

import { useEffect, useRef, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";

export type CursorPosition = { x: number; y: number } | null;

type Windows95CursorProps = {
  active: boolean;
  initialPosition?: CursorPosition;
};

const subscribeToClient = () => () => {};
const getClientSnapshot = () => true;
const getServerSnapshot = () => false;

// A DOM cursor is more dependable than CSS custom-cursor decoding across
// browsers. The native pointer is hidden by Hero only while this is mounted,
// so the visitor never sees two arrows at once.
export function Windows95Cursor({ active, initialPosition = null }: Windows95CursorProps) {
  const cursorRef = useRef<HTMLImageElement>(null);
  const mounted = useSyncExternalStore(
    subscribeToClient,
    getClientSnapshot,
    getServerSnapshot
  );

  useEffect(() => {
    if (!active || !mounted) return;

    // Portals sit outside Hero's subtree, and browsers choose a cursor from
    // the exact element under the pointer. Mark the whole document so no
    // descendant can reinstate its native cursor while this overlay is live.
    document.documentElement.dataset.win95Cursor = "active";

    const placeCursor = (x: number, y: number) => {
      const cursor = cursorRef.current;
      if (!cursor) return;
      cursor.style.transform = `translate3d(${x}px, ${y}px, 0)`;
      cursor.style.opacity = "1";
    };
    const followPointer = (event: PointerEvent) => placeCursor(event.clientX, event.clientY);
    const hideCursor = () => {
      if (cursorRef.current) cursorRef.current.style.opacity = "0";
    };

    if (initialPosition) placeCursor(initialPosition.x, initialPosition.y);
    document.addEventListener("pointermove", followPointer, true);
    document.documentElement.addEventListener("mouseleave", hideCursor);
    window.addEventListener("blur", hideCursor);
    return () => {
      delete document.documentElement.dataset.win95Cursor;
      document.removeEventListener("pointermove", followPointer, true);
      document.documentElement.removeEventListener("mouseleave", hideCursor);
      window.removeEventListener("blur", hideCursor);
    };
  }, [active, initialPosition, mounted]);

  if (!mounted || !active) return null;

  return createPortal(
    /* eslint-disable-next-line @next/next/no-img-element */
    <img
      ref={cursorRef}
      data-testid="win95-cursor"
      src="/cursors/win95-arrow.png"
      alt=""
      aria-hidden="true"
      className="pointer-events-none fixed left-0 top-0 z-[2147483647] size-16 select-none opacity-0"
      style={{ imageRendering: "pixelated", transform: "translate3d(-100px, -100px, 0)" }}
    />,
    document.body
  );
}
