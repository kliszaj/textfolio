"use client";

import { useCallback, useRef, useSyncExternalStore } from "react";

// Deliberately module scope, not sessionStorage: the flag lives as long as the
// loaded bundle does. Returning Home from a case study is a client-side
// navigation, so the hero remounts and would otherwise replay the whole story;
// a genuine hard refresh is a new page load and earns the intro again.
let introPlayed = false;

// The answer never changes after the first read, so there is nothing to
// subscribe to; the store exists only to separate the server's answer from the
// client's.
const subscribe = () => () => {};
const serverSnapshot = () => false;

export function useIntroOnce(): boolean {
  // Cached per mount, so the snapshot is stable however often React asks.
  const decided = useRef<boolean | null>(null);

  const getSnapshot = useCallback(() => {
    if (decided.current === null) {
      decided.current = !introPlayed;
      introPlayed = true;
    }
    return decided.current;
  }, []);

  // The server, and therefore the first client paint, always answers false.
  // Deciding this during an ordinary render consumed the flag at prerender
  // time: the built HTML shipped the resting hero while the client, with a
  // fresh module, hydrated into the intro -- a mismatch on every first visit.
  return useSyncExternalStore(subscribe, getSnapshot, serverSnapshot);
}

export function resetIntroForTests(): void {
  introPlayed = false;
}
