"use client";

import { useEffect, useRef, useState } from "react";

const FIRST_FRAME = 1;
const LAST_FRAME = 5;
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

export function HomeIconAnimation() {
  const [hoverFrame, setHoverFrame] = useState(FIRST_FRAME);
  const [hoverRun, setHoverRun] = useState(0);
  const [hoverPhase, setHoverPhase] = useState<HoverPhase>("idle");
  const isHoverAnimating = hoverPhase !== "idle";
  const handledHoverRunRef = useRef(0);

  useEffect(() => {
    if (hoverRun === 0 || handledHoverRunRef.current === hoverRun) return;
    handledHoverRunRef.current = hoverRun;

    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;

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
  }, [hoverRun]);

  const replayOnHover = () => {
    if (isHoverAnimating) return;
    setHoverRun((run) => run + 1);
  };

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      data-testid="case-study-home-label"
      src={
        hoverPhase === "exploding" || hoverPhase === "waiting"
          ? hoverFrameSource(hoverFrame)
          : hoverPhase === "rebuilding"
            ? frameSource(hoverFrame)
            : frameSource(FIRST_FRAME)
      }
      alt=""
      className="case-study-home-icon boil-line block"
      onPointerEnter={replayOnHover}
      width={40}
      height={40}
    />
  );
}
