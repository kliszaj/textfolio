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
// A genuine document load should ship the same intro/loading state that the
// first hydrated client render will use. Returning Home is a client-side mount
// and reads getSnapshot directly, so it still sees the module flag and skips
// the story after the first visit.
const serverSnapshot = () => true;

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

  // serverSnapshot does not consume the module flag. The hydrated first read
  // agrees with it, then claims the one allowed intro through getSnapshot.
  return useSyncExternalStore(subscribe, getSnapshot, serverSnapshot);
}

export function resetIntroForTests(): void {
  introPlayed = false;
}
