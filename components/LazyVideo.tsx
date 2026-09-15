"use client";

import { useEffect, useRef, useState } from "react";
import type { ComponentPropsWithoutRef } from "react";

type LazyVideoProps = Omit<ComponentPropsWithoutRef<"video">, "preload" | "src"> & {
  src: string;
  rootMargin?: string;
  loadImmediately?: boolean;
  playing?: boolean;
};

// Browsers do not natively lazy-load video. Keep its source out of the DOM
// until the player is close to view, so long case-study pages do not begin
// downloading a showreel while the reader is still in the opening copy.
export function LazyVideo({
  src,
  rootMargin = "320px 0px",
  loadImmediately = false,
  playing,
  autoPlay,
  ...props
}: LazyVideoProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [shouldLoad, setShouldLoad] = useState(false);
  const isLoaded = loadImmediately || shouldLoad;

  useEffect(() => {
    if (loadImmediately) return;

    const video = videoRef.current;
    if (!video) return;

    if (typeof IntersectionObserver === "undefined") {
      const fallback = window.setTimeout(() => setShouldLoad(true), 0);
      return () => window.clearTimeout(fallback);
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        setShouldLoad(true);
        observer.disconnect();
      },
      { rootMargin }
    );

    observer.observe(video);
    return () => observer.disconnect();
  }, [loadImmediately, rootMargin]);

  useEffect(() => {
    if (playing === undefined) return;

    const video = videoRef.current;
    if (!video) return;

    const syncPlayback = () => {
      if (playing && isLoaded && document.visibilityState !== "hidden") {
        const playAttempt = video.play();
        playAttempt?.catch(() => {
          // Muted inline playback is normally permitted. If a browser blocks
          // it, the next row or visibility change gets another try.
        });
      } else {
        video.pause();
      }
    };

    syncPlayback();
    document.addEventListener("visibilitychange", syncPlayback);
    return () => {
      document.removeEventListener("visibilitychange", syncPlayback);
      video.pause();
    };
  }, [isLoaded, playing]);

  return (
    <video
      ref={videoRef}
      {...props}
      src={isLoaded ? src : undefined}
      preload={loadImmediately ? "auto" : "none"}
      autoPlay={playing === undefined ? autoPlay : undefined}
    />
  );
}
