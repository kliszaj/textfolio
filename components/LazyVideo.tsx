"use client";

import { useEffect, useRef, useState } from "react";
import type { ComponentPropsWithoutRef } from "react";

type LazyVideoProps = Omit<ComponentPropsWithoutRef<"video">, "preload" | "src"> & {
  src: string;
  rootMargin?: string;
};

// Browsers do not natively lazy-load video. Keep its source out of the DOM
// until the player is close to view, so long case-study pages do not begin
// downloading a showreel while the reader is still in the opening copy.
export function LazyVideo({ src, rootMargin = "320px 0px", ...props }: LazyVideoProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [shouldLoad, setShouldLoad] = useState(false);

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
      { rootMargin }
    );

    observer.observe(video);
    return () => observer.disconnect();
  }, [rootMargin]);

  return <video ref={videoRef} {...props} src={shouldLoad ? src : undefined} preload="none" />;
}
