"use client";

import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import type { CaseStudyMediaSteps } from "@/data/caseStudies";

// How long each band holds before the next slides in.
export const STEP_DWELL_MS = 5000;

type SteppedImageProps = {
  src: string;
  alt: string;
  steps: CaseStudyMediaSteps;
  // While playing it moves through the bands, looping; stopped, it settles
  // back on the first.
  playing: boolean;
  playbackRow?: string;
  // Work that hasn't launched: the whole image blurred, and no chips naming
  // what's in it -- it just moves through the bands.
  locked?: boolean;
};

// A tall image shown one band at a time in a landscape frame. Each band is
// centred at the frame's width and clipped so its neighbours never peek in;
// moving on, the image slides and the clip follows. Chips in the corner name
// the bands, fill a line as a timer, and jump to a band when pressed.
export function SteppedImage({ src, alt, steps, playing, playbackRow, locked = false }: SteppedImageProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);
  const [restartedAt, setRestartedAt] = useState(0);
  const [wasPlaying, setWasPlaying] = useState(playing);
  const { width, height, bands } = steps;

  // Stopping returns it to the first band.
  if (playing !== wasPlaying) {
    setWasPlaying(playing);
    if (!playing) setIndex(0);
  }

  // Advance after each dwell while playing.
  useEffect(() => {
    if (!playing) return;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    const timer = window.setTimeout(() => setIndex((current) => (current + 1) % bands.length), STEP_DWELL_MS);
    return () => window.clearTimeout(timer);
  }, [playing, index, restartedAt, bands.length]);

  // The tile's hover ring takes the current band's colour (globals.css).
  useEffect(() => {
    ref.current?.closest<HTMLElement>(".case-study-tile")?.style.setProperty("--tile-ring", bands[index].color);
  }, [index, bands]);

  const band = bands[index];
  // In container units, the frame being 16:9 at the image's width.
  const offset = -band.top / width * 100 + (56.25 - band.height / width * 100) / 2;
  const imageStyle = {
    transform: `translateY(${offset}cqw)`,
    clipPath: `inset(${band.top / height * 100}% 0 ${(height - band.top - band.height) / height * 100}% 0)`,
  } as CSSProperties;

  return (
    <div
      ref={ref}
      className="case-study-steps"
      data-locked={locked || undefined}
      data-playback-row={playbackRow}
      data-step={index}
      style={{ "--step-dwell": `${STEP_DWELL_MS}ms` } as CSSProperties}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt={alt} className="case-study-steps-image" style={imageStyle} loading="lazy" decoding="async" />
      {!locked && <div className="case-study-steps-chips">
        {bands.map((item, bandIndex) => (
          <button
            key={item.label}
            type="button"
            aria-pressed={bandIndex === index}
            data-done={(playing && bandIndex < index) || undefined}
            className="case-study-steps-chip"
            style={{ "--step-color": item.color } as CSSProperties}
            onClick={() => {
              setIndex(bandIndex);
              setRestartedAt(Date.now());
            }}
          >
            {/* Remounted on each step so its timer line starts over. */}
            {playing && bandIndex === index && <span key={`${index}-${restartedAt}`} className="case-study-steps-timer" aria-hidden />}
            <span className="relative">{item.label}</span>
          </button>
        ))}
      </div>}
    </div>
  );
}
