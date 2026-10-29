"use client";

import { useCallback, useEffect, useState } from "react";
import { backspace, deleteWord, newTest, tick, typeChar, typeSpace, type TypingState } from "@/lib/typingTest";

export const TYPING_DURATIONS = [15, 30, 60] as const;

// Runs one typing test at a time: the clock, the per-second graph samples and
// the input. Both copies of the window (on the 3D monitor and the flat one
// laid over it once the zoom lands) render from this one state, so the swap
// between them never shows.
export function useTypingTest() {
  const [duration, setDuration] = useState<number>(TYPING_DURATIONS[0]);
  // Starts empty: the words are random, and the server render must match.
  const [state, setState] = useState<TypingState | null>(null);
  const [now, setNow] = useState(0);

  const restart = useCallback((next = duration) => {
    setDuration(next);
    setState(newTest(next));
    setNow(Date.now());
  }, [duration]);

  // While running: a graph sample every second, and a readout that updates a
  // few times a second.
  const running = state !== null && state.startedAt !== null && state.finishedAt === null;
  useEffect(() => {
    if (!running) return;
    const readout = window.setInterval(() => setNow(Date.now()), 200);
    const second = window.setInterval(() => setState((s) => (s ? tick(s, Date.now()) : s)), 1000);
    return () => {
      window.clearInterval(readout);
      window.clearInterval(second);
    };
  }, [running]);

  // Text from the hidden input: characters, spaces and deletions.
  const input = useCallback((kind: "text" | "backspace" | "deleteWord", text = "") => {
    const at = Date.now();
    setNow(at);
    setState((s) => {
      if (!s) return s;
      if (kind === "backspace") return backspace(s);
      if (kind === "deleteWord") return deleteWord(s);
      return [...text].reduce((next, char) => (char === " " ? typeSpace(next, at) : typeChar(next, char, at)), s);
    });
  }, []);

  return { state, now, duration, restart, input };
}
