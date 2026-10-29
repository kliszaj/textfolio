"use client";

import { useEffect, useState } from "react";

// Nothing on the desk says it can be scrolled or dragged, so a first visit
// gets a quiet line saying so. It fades once either is tried, or after a
// while untouched, and stays away for good once it has been used.
const SEEN_KEY = "desk-hint-seen";
const LINGER_MS = 12000;

function readSeen(): boolean {
  try {
    return window.localStorage.getItem(SEEN_KEY) === "1";
  } catch {
    // Storage can be unavailable (private browsing); show it then.
    return false;
  }
}

export function useDeskHint() {
  // Starts hidden: the server render can't know, and the hint only appears
  // once the desk has loaded anyway.
  const [seen, setSeen] = useState(true);
  const [used, setUsed] = useState(false);
  useEffect(() => {
    const stored = readSeen();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reading browser storage after hydration
    setSeen(stored);
  }, []);
  const markUsed = () => {
    if (used) return;
    setUsed(true);
    try {
      window.localStorage.setItem(SEEN_KEY, "1");
    } catch {}
  };
  return { show: !seen && !used, markUsed };
}

export function DeskHint({ show, touch, revealed }: { show: boolean; touch: boolean; revealed: boolean }) {
  const [lingered, setLingered] = useState(false);
  useEffect(() => {
    if (!show || !revealed) return;
    const timer = window.setTimeout(() => setLingered(true), LINGER_MS);
    return () => window.clearTimeout(timer);
  }, [show, revealed]);
  const visible = show && revealed && !lingered;

  return (
    <p
      aria-hidden={!visible}
      className="pointer-events-none absolute top-6 left-6 max-w-[16rem] font-body text-sm leading-snug transition-[opacity,filter] duration-700 md:top-10 md:left-10"
      style={{ opacity: visible ? 0.75 : 0, filter: visible ? "blur(0)" : "blur(6px)" }}
    >
      {touch ? "Tap the arrows to change the time." : "Scroll to change the time of day."}
      <br />
      Drag to look around the desk.
      <br />
      {touch ? "Tap" : "Click"} the keyboard for a typing test.
    </p>
  );
}
