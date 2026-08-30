"use client";

import { useEffect, useState } from "react";

// Deliberately module scope, not sessionStorage: the flag lives as long as the
// loaded bundle does. Returning Home from a case study is a client-side
// navigation, so the hero remounts and would otherwise replay the whole story;
// a genuine hard refresh is a new page load and earns the intro again.
let introPlayed = false;

export function useIntroOnce(): boolean {
  // Claimed in the state initialiser rather than in an effect, because the
  // answer has to be known at first paint. Every render of a given mount
  // reuses the same value.
  const [shouldPlay] = useState(() => {
    if (introPlayed) return false;
    introPlayed = true;
    return true;
  });

  // Belt and braces: if a mount was torn down before it painted, the flag is
  // already set, which is the behaviour we want -- the intro is a one-shot.
  useEffect(() => {
    introPlayed = true;
  }, []);

  return shouldPlay;
}

export function resetIntroForTests(): void {
  introPlayed = false;
}
