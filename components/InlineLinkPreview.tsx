"use client";

import { useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { PointerEvent as ReactPointerEvent } from "react";
import type { CaseStudyOverviewLink } from "@/data/caseStudies";
import { getLinkPreview } from "@/lib/linkPreviews";
import {
  PREVIEW_CARD_HEIGHT_PX,
  PREVIEW_CARD_WIDTH_PX,
  PREVIEW_CURSOR_OFFSET_PX,
  PREVIEW_VIEWPORT_MARGIN_PX,
  clampPreviewPosition,
} from "@/lib/inlineLinkPreviewPosition";
import { usePointerType } from "@/hooks/usePointerType";
import styles from "./InlineLinkPreview.module.css";

type InlineLinkPreviewProps = {
  link: CaseStudyOverviewLink;
  // Overrides the link's own preview.color -- a case study page colors its
  // inline previews with the NEXT case study's color, not its own, so the
  // card reads as a bridge onward rather than restating the page the reader
  // is already on.
  accentColor?: string;
};

export function InlineLinkPreview({ link, accentColor }: InlineLinkPreviewProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState<{ x: number; y: number } | null>(null);
  const anchorRef = useRef<HTMLSpanElement>(null);
  const preview = getLinkPreview(link);
  const cardColor = accentColor ?? preview.color;

  // Desktop only: a touch tap has no hover to preview, and opening the card
  // on tap would just flash something in the way of the link's own real
  // destination, with no clean way to dismiss it before navigating.
  const isDesktop = usePointerType() === "fine";

  function openAt(point: { x: number; y: number }) {
    setPosition(
      clampPreviewPosition(
        point,
        { width: window.innerWidth, height: window.innerHeight },
        { width: PREVIEW_CARD_WIDTH_PX, height: PREVIEW_CARD_HEIGHT_PX },
        PREVIEW_VIEWPORT_MARGIN_PX
      )
    );
    setIsOpen(true);
  }

  // Anchored to the cursor itself, not the link's own box -- a link near
  // the right edge of a wide column used to always open the card growing
  // rightward from the link, running the card off the page. Untestable in
  // this project's jsdom suite: there is no global PointerEvent constructor
  // here, so @testing-library/dom's fireEvent falls back to a plain Event
  // and clientX/clientY never reach a handler in any test (same limitation
  // as the headline hover hit-test elsewhere in this codebase) -- correct
  // in a real browser, verified by hand rather than by an automated test.
  function handlePointerEnter(event: ReactPointerEvent<HTMLSpanElement>) {
    if (!isDesktop) return;
    openAt({
      x: event.clientX + PREVIEW_CURSOR_OFFSET_PX,
      y: event.clientY + PREVIEW_CURSOR_OFFSET_PX,
    });
  }

  // Keyboard focus has no cursor position to anchor to -- falls back to the
  // link's own box, just under it.
  function handleFocus() {
    if (!isDesktop) return;
    const rect = anchorRef.current?.getBoundingClientRect();
    if (!rect) return;
    openAt({ x: rect.left, y: rect.bottom + 8 });
  }

  function close() {
    setIsOpen(false);
  }

  return (
    <span
      ref={anchorRef}
      className={styles.anchor}
      onPointerEnter={handlePointerEnter}
      onPointerLeave={close}
      onFocus={handleFocus}
      onBlur={close}
    >
      <a
        href={link.href}
        target="_blank"
        rel="noreferrer"
        className="underline underline-offset-2 transition-opacity hover:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ink"
      >
        {link.label}
      </a>
      {isOpen &&
        isDesktop &&
        position &&
        createPortal(
          // Portaled straight to <body>, not rendered inline where the
          // anchor sits: this card's position: fixed only means "relative
          // to the viewport" so long as no ancestor has its own transform,
          // filter, perspective, or will-change: transform -- CSS quietly
          // makes that ancestor the containing block instead, and the card
          // reads as positioned nowhere near the cursor. This page has more
          // than one such ancestor (the case-study-body mount animation, at
          // least). A portal removes the card from that ancestry entirely
          // rather than chasing down every current and future offender.
          <span
            data-testid="inline-link-preview"
            aria-hidden="true"
            className={styles.card}
            style={
              {
                "--preview-color": cardColor,
                position: "fixed",
                left: `${position.x}px`,
                top: `${position.y}px`,
              } as React.CSSProperties
            }
          >
            <span className={styles.source}>{preview.source}</span>
            <span className={styles.body}>
              <span className={styles.title}>{preview.title}</span>
              <span className={styles.description}>{preview.description}</span>
            </span>
            {preview.image && (
              // A remote destination photo, not one of this site's own
              // optimizable assets -- same reasoning as the case-study gallery.
              // eslint-disable-next-line @next/next/no-img-element
              <img className={styles.image} src={preview.image} alt="" />
            )}
          </span>,
          document.body
        )}
    </span>
  );
}
