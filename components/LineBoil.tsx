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
// Small icons (boil-icon) shiver less, or a 24px arrow just looks bent. Their
// noise is finer and centred (fractalNoise, where turbulence leans one way),
// so each frame bends the line rather than mostly shifting it: Safari moves
// it in whole pixels, and a near-uniform shift of under a pixel came out the
// same every frame, so there the icons sat still.
const ICON_BASE_FREQUENCY = 0.08;
const ICON_INTENSITY_PX = 2;
const FILTERS = [
  { id: "line-boil", type: "turbulence", frequency: BASE_FREQUENCY, scale: INTENSITY_PX },
  { id: "line-boil-icon", type: "fractalNoise", frequency: ICON_BASE_FREQUENCY, scale: ICON_INTENSITY_PX },
];
// Nudging the frequency per frame stops the four displacements from looking
// like the same texture simply shifted around (as a share of the base).
const FRAME_FREQUENCY_OFFSETS = [-1 / 6, 1 / 12, -1 / 12, 1 / 6];

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
        {FILTERS.flatMap(({ id, type, frequency: base, scale }) => FRAME_FREQUENCY_OFFSETS.map((frequencyOffset, index) => {
          const frame = index + 1;
          const frequency = base * (1 + frequencyOffset);

          return (
            <filter
              key={`${id}-${frame}`}
              id={`${id}-${frame}`}
              x="-30%"
              y="-30%"
              width="160%"
              height="160%"
              filterUnits="objectBoundingBox"
              primitiveUnits="userSpaceOnUse"
              colorInterpolationFilters="sRGB"
            >
              <feTurbulence
                type={type}
                baseFrequency={frequency}
                numOctaves="2"
                seed={frame}
                result={`${id}-noise-${frame}`}
              />
              <feDisplacementMap
                in="SourceGraphic"
                in2={`${id}-noise-${frame}`}
                scale={scale}
                xChannelSelector="R"
                yChannelSelector="G"
              />
            </filter>
          );
        }))}
      </defs>
    </svg>
  );
}
