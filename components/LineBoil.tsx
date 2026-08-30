"use client";

import { useEffect, useState } from "react";

// Traditional-animation "boil": the same artwork redrawn slightly differently
// each frame, so the line never sits perfectly still. Here it is four fixed
// turbulence displacements cycled on a slow timer, which is what keeps it
// reading as hand-drawn rather than as a smooth digital wobble.
export const LINE_BOIL_FRAMES = 4;
export const LINE_BOIL_FPS = 6;

const BASE_FREQUENCY = 0.036;
const INTENSITY_PX = 4;
// Nudging the frequency per frame stops the four displacements from looking
// like the same texture simply shifted around.
const FRAME_FREQUENCY_OFFSETS = [-0.006, 0.003, -0.003, 0.006];

export function LineBoil() {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setPrefersReducedMotion(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    root.dataset.lineBoil = prefersReducedMotion ? "off" : "on";
    root.dataset.lineBoilFrame = "1";

    const clear = () => {
      delete root.dataset.lineBoil;
      delete root.dataset.lineBoilFrame;
    };

    if (prefersReducedMotion) return clear;

    let frame = 1;
    const timer = window.setInterval(() => {
      frame = frame === LINE_BOIL_FRAMES ? 1 : frame + 1;
      root.dataset.lineBoilFrame = String(frame);
    }, Math.round(1000 / LINE_BOIL_FPS));

    return () => {
      window.clearInterval(timer);
      clear();
    };
  }, [prefersReducedMotion]);

  return (
    <svg aria-hidden="true" className="pointer-events-none absolute h-0 w-0">
      <defs>
        {FRAME_FREQUENCY_OFFSETS.map((frequencyOffset, index) => {
          const frame = index + 1;
          const frequency = Math.max(0.001, BASE_FREQUENCY + frequencyOffset);

          return (
            <filter
              key={frame}
              id={`line-boil-${frame}`}
              x="-30%"
              y="-30%"
              width="160%"
              height="160%"
              filterUnits="objectBoundingBox"
              primitiveUnits="userSpaceOnUse"
              colorInterpolationFilters="sRGB"
            >
              <feTurbulence
                type="turbulence"
                baseFrequency={frequency}
                numOctaves="2"
                seed={frame}
                result={`line-boil-noise-${frame}`}
              />
              <feDisplacementMap
                in="SourceGraphic"
                in2={`line-boil-noise-${frame}`}
                scale={INTENSITY_PX}
                xChannelSelector="R"
                yChannelSelector="G"
              />
            </filter>
          );
        })}
      </defs>
    </svg>
  );
}
