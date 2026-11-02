"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import type { ComponentPropsWithoutRef } from "react";

type LazyVideoProps = Omit<ComponentPropsWithoutRef<"video">, "preload" | "src"> & {
  src: string;
  rootMargin?: string;
  playing?: boolean;
};

const noSubscription = () => () => {};
const isEmbedded = () => document.documentElement.dataset.embedded === "1";
const isEmbeddedOnServer = () => false;

// Browsers do not natively lazy-load video. Keep its source out of the DOM
// until the player is close to view, so long case-study pages do not begin
// downloading a showreel while the reader is still in the opening copy.
//
// The copy on the desk's monitor (an iframe; see app/layout.tsx) is only a
// picture of the page: it fetches what it needs for a still of the players in
// its window, and plays nothing.
export function LazyVideo({
  src,
  rootMargin = "600px 0px",
  playing,
  autoPlay,
  ...props
}: LazyVideoProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [shouldLoad, setShouldLoad] = useState(false);
  const embedded = useSyncExternalStore(noSubscription, isEmbedded, isEmbeddedOnServer);

  useEffect(() => {
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
      { rootMargin: embedded ? "0px" : rootMargin }
    );

    observer.observe(video);
    return () => observer.disconnect();
  }, [embedded, rootMargin]);

  useEffect(() => {
    if (playing === undefined) return;

    const video = videoRef.current;
    if (!video) return;

    const syncPlayback = () => {
      if (playing && shouldLoad && !embedded && document.visibilityState !== "hidden") {
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
  }, [embedded, shouldLoad, playing]);

  return (
    <video
      ref={videoRef}
      {...props}
      src={shouldLoad ? src : undefined}
      preload={!shouldLoad ? "none" : embedded ? "metadata" : "auto"}
      autoPlay={playing === undefined && !embedded ? autoPlay : undefined}
    />
  );
}
