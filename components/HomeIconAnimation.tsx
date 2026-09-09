"use client";

import { useEffect, useRef, useState } from "react";

const FIRST_FRAME = 1;
const LAST_FRAME = 5;
const FRAME_DURATION_MS = 55;
// Four reverse steps at 80ms match the header's 320ms expansion, so the house
// rebuilds in lockstep as scrolling upward brings the full header back.
const REBUILD_FRAME_DURATION_MS = 80;
const HOVER_FRAMES = [1, 2, 3, 4, 5, 6];
const HOVER_FRAME_DURATION_MS = 100;
const HOVER_REBUILD_DELAY_MS = 500;

type HoverPhase = "idle" | "exploding" | "waiting" | "rebuilding";

function frameSource(frame: number) {
  return `/assets/home-animation-${frame}.svg`;
}

function hoverFrameSource(frame: number) {
  return `/assets/home-explosion-${frame}.svg`;
}

export function HomeIconAnimation({ shrunk }: { shrunk: boolean }) {
  const targetFrame = shrunk ? LAST_FRAME : FIRST_FRAME;
  const [frame, setFrame] = useState(targetFrame);
  const [hoverFrame, setHoverFrame] = useState(FIRST_FRAME);
  const [hoverRun, setHoverRun] = useState(0);
  const [hoverPhase, setHoverPhase] = useState<HoverPhase>("idle");
  const isHoverAnimating = hoverPhase !== "idle";
  const handledHoverRunRef = useRef(0);
  const [previousShrunk, setPreviousShrunk] = useState(shrunk);

  // A scroll-state change owns the icon immediately. If it interrupts a hover
  // explosion, clear that separate animation before this render commits so it
  // cannot reappear when the header opens again.
  if (shrunk !== previousShrunk) {
    setPreviousShrunk(shrunk);
    setHoverPhase("idle");
    setHoverFrame(FIRST_FRAME);
  }
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
    if (hoverRun === 0 || shrunk || handledHoverRunRef.current === hoverRun) return;
    handledHoverRunRef.current = hoverRun;

    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
      const settleImmediately = window.setTimeout(() => setFrame(FIRST_FRAME), 0);
      return () => window.clearTimeout(settleImmediately);
    }

    let explosionAnimation: number | undefined;
    let rebuildDelay: number | undefined;
    let rebuildAnimation: number | undefined;
    const start = window.setTimeout(() => {
      setHoverPhase("exploding");
      setHoverFrame(FIRST_FRAME);
      let index = 1;
      explosionAnimation = window.setInterval(() => {
        setHoverFrame(HOVER_FRAMES[index]);
        index += 1;
        if (index === HOVER_FRAMES.length) {
          window.clearInterval(explosionAnimation);
          setHoverPhase("waiting");
          rebuildDelay = window.setTimeout(() => {
            setHoverPhase("rebuilding");
            setHoverFrame(LAST_FRAME);
            let rebuildFrame = LAST_FRAME;
            rebuildAnimation = window.setInterval(() => {
              rebuildFrame -= 1;
              setHoverFrame(rebuildFrame);
              if (rebuildFrame === FIRST_FRAME) {
                window.clearInterval(rebuildAnimation);
                setHoverPhase("idle");
              }
            }, REBUILD_FRAME_DURATION_MS);
          }, HOVER_REBUILD_DELAY_MS);
        }
      }, HOVER_FRAME_DURATION_MS);
    }, 0);

    return () => {
      window.clearTimeout(start);
      if (explosionAnimation !== undefined) window.clearInterval(explosionAnimation);
      if (rebuildDelay !== undefined) window.clearTimeout(rebuildDelay);
      if (rebuildAnimation !== undefined) window.clearInterval(rebuildAnimation);
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
      src={
        !shrunk && (hoverPhase === "exploding" || hoverPhase === "waiting")
          ? hoverFrameSource(hoverFrame)
          : !shrunk && hoverPhase === "rebuilding"
            ? frameSource(hoverFrame)
            : frameSource(frame)
      }
      alt=""
      className="case-study-home-icon boil-line block"
      onPointerEnter={replayOnHover}
      width={40}
      height={40}
    />
  );
}
