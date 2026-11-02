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
// its window, and plays nothing. Whether a player is in that window is read
// from the page itself: the monitor's frame is drawn in perspective, and
// Safari's IntersectionObserver gets lost in it.
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

    if (embedded) {
      const bounds = video.getBoundingClientRect();
      if (bounds.top >= window.innerHeight || bounds.bottom <= 0) return;
      const show = window.setTimeout(() => setShouldLoad(true), 0);
      return () => window.clearTimeout(show);
    }

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
      // Safari paints no frame for a video it hasn't played unless asked for
      // a moment of it: the still, just past the start.
      src={!shouldLoad ? undefined : embedded ? `${src}#t=0.1` : src}
      preload={!shouldLoad ? "none" : embedded ? "metadata" : "auto"}
      autoPlay={playing === undefined && !embedded ? autoPlay : undefined}
    />
  );
}
