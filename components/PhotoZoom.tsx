"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

// Wraps a photo so clicking it opens the picture whole, on a page of its own
// colour. `className` places the trigger in its tile.
export function PhotoZoom({
  src,
  alt,
  className = "",
  children,
}: {
  src: string;
  alt: string;
  className?: string;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  // The dialog has just closed, so the page behind it can take focus again.
  const close = useCallback(() => {
    setOpen(false);
    triggerRef.current?.focus({ preventScroll: true });
  }, []);
  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="dialog"
        aria-label={`Enlarge image: ${alt}`}
        className={`photo-zoom-trigger ${className}`}
        onClick={() => setOpen(true)}
      >
        {children}
      </button>
      {open && createPortal(<PhotoModal src={src} alt={alt} onClose={close} />, document.body)}
    </>
  );
}

type ZoomOrigin = { x: number; y: number; followsMouse: boolean; box: DOMRect };

// A native dialog, for its focus trap and for sitting above everything.
// Fitted to the screen first. Where the file has more pixels than that shows,
// a click or tap goes to its full size: a mouse then pans by moving, a finger
// by dragging.
function PhotoModal({ src, alt, onClose }: { src: string; alt: string; onClose: () => void }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const originRef = useRef<ZoomOrigin | null>(null);
  const [zoomed, setZoomed] = useState(false);
  const [canZoom, setCanZoom] = useState(false);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    dialog.showModal();
    return () => dialog.close();
  }, []);

  const dismiss = useCallback(() => {
    dialogRef.current?.close();
    onClose();
  }, [onClose]);

  const measure = useCallback(() => {
    const image = imageRef.current;
    if (!image || zoomed) return;
    setCanZoom(image.naturalWidth > image.getBoundingClientRect().width * 1.1);
  }, [zoomed]);

  useEffect(() => {
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [measure]);

  // Opens on the part that was clicked.
  useLayoutEffect(() => {
    const scroller = scrollerRef.current;
    const image = imageRef.current;
    const origin = originRef.current;
    if (!zoomed || !scroller || !image || !origin) return;
    if (origin.followsMouse) {
      panTo(scroller, origin.x, origin.y);
    } else {
      const { left, top, width, height } = origin.box;
      scroller.scrollLeft = ((origin.x - left) / width) * image.offsetWidth - scroller.clientWidth / 2;
      scroller.scrollTop = ((origin.y - top) / height) * image.offsetHeight - scroller.clientHeight / 2;
    }
  }, [zoomed]);

  function handleScrollerClick(event: React.MouseEvent<HTMLDivElement>) {
    const image = imageRef.current;
    if (event.target !== image) {
      dismiss();
      return;
    }
    if (zoomed) {
      setZoomed(false);
    } else if (canZoom && image) {
      const pointerType = (event.nativeEvent as PointerEvent).pointerType;
      originRef.current = {
        x: event.clientX,
        y: event.clientY,
        followsMouse: pointerType === "mouse",
        box: image.getBoundingClientRect(),
      };
      setZoomed(true);
    }
  }

  return (
    <dialog
      ref={dialogRef}
      aria-label={alt}
      className="photo-modal"
      onCancel={(event) => {
        event.preventDefault();
        dismiss();
      }}
      // Esc would also reach the case study's own listener, which goes home.
      onKeyDown={(event) => {
        if (event.key !== "Escape") return;
        event.preventDefault();
        dismiss();
      }}
    >
      <div
        ref={scrollerRef}
        data-testid="photo-modal-scroller"
        className="photo-modal-scroller"
        data-zoomed={zoomed || undefined}
        onClick={handleScrollerClick}
        onPointerMove={(event) => {
          if (zoomed && event.pointerType === "mouse" && scrollerRef.current) {
            panTo(scrollerRef.current, event.clientX, event.clientY);
          }
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          ref={imageRef}
          src={src}
          alt={alt}
          className="photo-modal-image"
          data-can-zoom={canZoom || undefined}
          draggable={false}
          onLoad={measure}
        />
      </div>
      <button type="button" aria-label="Close" className="photo-modal-close" onClick={dismiss}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" aria-hidden="true">
          <path d="M6 6l12 12M18 6L6 18" />
        </svg>
      </button>
    </dialog>
  );
}

// The pointer's place on screen is the place on the picture.
function panTo(scroller: HTMLElement, x: number, y: number) {
  scroller.scrollLeft = (x / scroller.clientWidth) * (scroller.scrollWidth - scroller.clientWidth);
  scroller.scrollTop = (y / scroller.clientHeight) * (scroller.scrollHeight - scroller.clientHeight);
}
