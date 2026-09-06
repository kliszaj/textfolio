"use client";

import { useEffect, useRef, useState } from "react";

const FIRST_FRAME = 1;
const LAST_FRAME = 5;
const FRAME_DURATION_MS = 55;
// Four reverse steps at 80ms match the header's 320ms expansion, so the house
// rebuilds in lockstep as scrolling upward brings the full header back.
const REBUILD_FRAME_DURATION_MS = 80;
const HOVER_FRAMES = [1, 2, 3, 4, 5, 4, 3, 2, 1];
const HOVER_FRAME_DURATION_MS = 80;

function frameSource(frame: number) {
  return `/assets/home-animation-${frame}.svg`;
}

export function HomeIconAnimation({ shrunk }: { shrunk: boolean }) {
  const targetFrame = shrunk ? LAST_FRAME : FIRST_FRAME;
  const [frame, setFrame] = useState(targetFrame);
  const [hoverRun, setHoverRun] = useState(0);
  const [isHoverAnimating, setIsHoverAnimating] = useState(false);
  // The icon is pointer-events:none while collapsed, so the moment scrolling
  // back to the top flips it to auto, a cursor that already happens to be
  // sitting over its on-screen position is treated as freshly entering it --
  // no actual movement needed. That fired the hover wiggle mid-rebuild, which
  // starts back at frame 1 and reads as the whole animation replaying forward
  // instead of the reverse rebuild finishing. Suppress hover-replay for a
  // beat around every shrunk change, comfortably past the reverse sequence's
  // own duration (four REBUILD_FRAME_DURATION_MS steps).
  const suppressHoverRef = useRef(false);
  useEffect(() => {
    suppressHoverRef.current = true;
    const timeout = window.setTimeout(() => {
      suppressHoverRef.current = false;
    }, 600);
    return () => window.clearTimeout(timeout);
  }, [shrunk]);

  useEffect(() => {
    if (isHoverAnimating || frame === targetFrame) return;

    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
      const settleImmediately = window.setTimeout(() => setFrame(targetFrame), 0);
      return () => window.clearTimeout(settleImmediately);
    }

    const direction = targetFrame > frame ? 1 : -1;
    const frameDuration = direction < 0 ? REBUILD_FRAME_DURATION_MS : FRAME_DURATION_MS;
    let animation: number | undefined;
    const playFrames = () => {
      animation = window.setInterval(() => {
        setFrame((current) => {
          const next = current + direction;
          return direction > 0
            ? Math.min(next, targetFrame)
            : Math.max(next, targetFrame);
        });
      }, frameDuration);
    };

    // Rewind immediately when scrolling up: the four reverse frames finish
    // with the header's own 320ms expansion instead of arriving late.
    playFrames();

    return () => {
      if (animation !== undefined) window.clearInterval(animation);
    };
  }, [frame, isHoverAnimating, shrunk, targetFrame]);

  useEffect(() => {
    if (hoverRun === 0 || shrunk) return;

    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
      const settleImmediately = window.setTimeout(() => setFrame(FIRST_FRAME), 0);
      return () => window.clearTimeout(settleImmediately);
    }

    let animation: number | undefined;
    const start = window.setTimeout(() => {
      setIsHoverAnimating(true);
      setFrame(FIRST_FRAME);
      let index = 1;
      animation = window.setInterval(() => {
        setFrame(HOVER_FRAMES[index]);
        index += 1;
        if (index === HOVER_FRAMES.length) {
          window.clearInterval(animation);
          setIsHoverAnimating(false);
        }
      }, HOVER_FRAME_DURATION_MS);
    }, 0);

    return () => {
      window.clearTimeout(start);
      if (animation !== undefined) window.clearInterval(animation);
    };
  }, [hoverRun, shrunk]);

  const replayOnHover = () => {
    if (shrunk || isHoverAnimating || suppressHoverRef.current) return;
    setHoverRun((run) => run + 1);
  };

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      data-testid="case-study-home-label"
      src={frameSource(frame)}
      alt=""
      className="case-study-home-icon boil-line block"
      onPointerEnter={replayOnHover}
      width={40}
      height={40}
    />
  );
}
