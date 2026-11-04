"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
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

// A native dialog, for its focus trap and for sitting above everything. A click
// anywhere in it closes it, on the photo or beside it.
function PhotoModal({ src, alt, onClose }: { src: string; alt: string; onClose: () => void }) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    const root = document.documentElement;
    root.style.setProperty("--photo-modal-scrollbar", `${window.innerWidth - root.clientWidth}px`);
    dialog.showModal();
    return () => dialog.close();
  }, []);

  const dismiss = () => {
    dialogRef.current?.close();
    onClose();
  };

  return (
    <dialog
      ref={dialogRef}
      aria-label={alt}
      className="photo-modal"
      onClick={dismiss}
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
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt={alt} className="photo-modal-image" draggable={false} />
      {/* Closes through the dialog's click; it's here to be seen and to take focus. */}
      <button type="button" aria-label="Close" className="photo-modal-close">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" aria-hidden="true">
          <path d="M6 6l12 12M18 6L6 18" />
        </svg>
      </button>
    </dialog>
  );
}
