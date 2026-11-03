"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import type { ComponentPropsWithoutRef } from "react";

type LazyVideoProps = Omit<ComponentPropsWithoutRef<"video">, "preload" | "src"> & {
  src: string;
  rootMargin?: string;
  playing?: boolean;
  // A thin line along the foot of the parent (which must be positioned),
  // showing how far through the video is, while it plays. With a mouse, a click
  // along the foot jumps to that point (globals.css, .video-progress-hit).
  showProgress?: boolean;
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
  showProgress = false,
  autoPlay,
  ...props
}: LazyVideoProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const progressRef = useRef<HTMLSpanElement>(null);
  const progressHitRef = useRef<HTMLSpanElement>(null);
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

  // Written straight to the line each frame, so a playing video doesn't
  // re-render the page around it.
  useEffect(() => {
    const video = videoRef.current;
    const line = progressRef.current;
    const hit = progressHitRef.current;
    if (!video || !line || !hit) return;
    if (!playing || !shouldLoad || embedded) {
      line.dataset.playing = hit.dataset.playing = "false";
      return;
    }
    let frame = 0;
    const update = () => {
      line.dataset.playing = hit.dataset.playing = String(!video.paused);
      if (video.duration > 0) line.style.transform = `scaleX(${video.currentTime / video.duration})`;
      frame = window.requestAnimationFrame(update);
    };
    frame = window.requestAnimationFrame(update);
    return () => window.cancelAnimationFrame(frame);
  }, [embedded, shouldLoad, playing]);

  const seek = (event: React.MouseEvent<HTMLSpanElement>) => {
    const video = videoRef.current;
    if (!video || !Number.isFinite(video.duration)) return;
    const { left, width } = event.currentTarget.getBoundingClientRect();
    video.currentTime = Math.min(1, Math.max(0, (event.clientX - left) / width)) * video.duration;
  };

  return (
    <>
      <video
        ref={videoRef}
        {...props}
        // Safari paints no frame for a video it hasn't played unless asked for
        // a moment of it: the still, just past the start.
        src={!shouldLoad ? undefined : embedded ? `${src}#t=0.1` : src}
        preload={!shouldLoad ? "none" : embedded ? "metadata" : "auto"}
        autoPlay={playing === undefined && !embedded ? autoPlay : undefined}
      />
      {showProgress && (
        <span ref={progressHitRef} aria-hidden="true" data-testid="video-progress-hit" data-playing="false" className="video-progress-hit" onClick={seek}>
          <span ref={progressRef} aria-hidden="true" data-testid="video-progress" data-playing="false" className="video-progress" />
        </span>
      )}
    </>
  );
}
