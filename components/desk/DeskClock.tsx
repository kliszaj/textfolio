"use client";

import { useEffect, useRef, useState } from "react";
import { deskDaylight, deskLook, nextDeskStage, stockholmPreviewDate, sunsetOn, type DeskStageKind } from "@/lib/deskDaylight";
import { localPreviewTime } from "@/lib/localTools";
import { AdaptiveText, adaptiveRef } from "./adaptiveText";

const timeFormat = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Europe/Stockholm", hour: "2-digit", minute: "2-digit", hourCycle: "h23",
});

const STEP_MIN_MS = 700;
const STEP_MAX_MS = 2000;
const STEP_MS_PER_MINUTE = 1.5;

function previewOffset() {
  const at = localPreviewTime();
  if (!at) return 0;
  const base = new Date();
  return (stockholmPreviewDate(base, at.hour).getTime() + at.minute * 60000 - base.getTime()) / 60000;
}

export function useDeskTime() {
  const [now, setNow] = useState<Date | null>(null);
  // Starts on the live clock, or on a set time for screenshots (localhost,
  // ?at=HH:MM). The desk only renders in the browser, so the address is there.
  const [startOffset] = useState(previewOffset);
  const [offsetMinutes, setOffsetMinutes] = useState(startOffset);
  const [targetMinutes, setTargetMinutes] = useState(startOffset);
  const displayedOffset = useRef(startOffset);
  const targetOffset = useRef(startOffset);
  // A requestAnimationFrame id: the readout steps in time with the frames the
  // desk draws, rather than on its own timer between them.
  const animation = useRef<number | null>(null);
  useEffect(() => {
    const update = () => setNow(new Date());
    update();
    const timer = window.setInterval(update, 15000);
    return () => {
      window.clearInterval(timer);
      if (animation.current !== null) cancelAnimationFrame(animation.current);
    };
  }, []);
  const date = now ? new Date(now.getTime() + offsetMinutes * 60000) : null;
  const time = date ? timeFormat.format(date) : "--:--";
  const hour = date ? Number(time.split(":")[0]) : 14;
  const solar = date ? deskDaylight(date) : null;
  // Furniture transitions directly to the destination. The clock and sun can
  // travel through intervening hours without cycling the chair's poses.
  const destinationDate = now ? new Date(now.getTime() + targetMinutes * 60000) : null;
  const destinationSolar = destinationDate ? deskDaylight(destinationDate) : null;
  const sceneHour = destinationSolar && destinationSolar.darkness >= 0.95
    ? 2
    : destinationDate ? Number(timeFormat.format(destinationDate).split(":")[0]) : 14;
  // `jump` lands straight on the time: counting back through a whole day's
  // worth of hours (back to now, or across to sunset) is disorienting.
  const animateTo = (next: number, jump = false) => {
    if (animation.current !== null) cancelAnimationFrame(animation.current);
    animation.current = null;
    targetOffset.current = next;
    setTargetMinutes(next);
    const from = displayedOffset.current;
    const started = Date.now();
    const commit = (value: number) => {
      displayedOffset.current = value;
      setOffsetMinutes(value);
    };
    if (jump || window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
      commit(next);
      return;
    }
    // Longer jumps take longer, so a step through a whole night doesn't
    // snap: 0.7s for a few hours, up to 2s.
    const duration = Math.min(STEP_MAX_MS, STEP_MIN_MS + Math.abs(next - from) * STEP_MS_PER_MINUTE);
    const tick = () => {
      const progress = Math.min(1, (Date.now() - started) / duration);
      const eased = progress * progress * (3 - 2 * progress);
      commit(from + (next - from) * eased);
      animation.current = progress === 1 ? null : requestAnimationFrame(tick);
    };
    animation.current = requestAnimationFrame(tick);
  };
  return {
    hour, sceneHour, solar, night: solar ? solar.darkness > 0.5 : false,
    // Where a step is headed, so the stop rail moves as soon as it's asked.
    look: destinationDate ? deskLook(destinationDate) : null,
    // A set start time (?at=, for screenshots) reads as the present: no way
    // "back" until it's stepped away from.
    time, previewing: offsetMinutes !== 0 && offsetMinutes !== startOffset,
    step: (direction: -1 | 1) => {
      const base = now ?? new Date();
      const current = new Date(base.getTime() + targetOffset.current * 60000);
      const next = nextDeskStage(current, direction);
      animateTo((next.getTime() - base.getTime()) / 60000);
    },
    reset: () => animateTo(0, true),
    showSunset: () => {
      const base = now ?? new Date();
      animateTo((sunsetOn(base).getTime() - base.getTime()) / 60000, true);
    },
  };
}

// The four stops a step moves between, in the order the day reaches them.
const STOPS: DeskStageKind[] = ["morning", "afternoon", "twilight", "night"];

// The time is changed by scrolling (or the arrow keys, or on touch a swipe),
// so the clock is just the reading, plus a way back to now while previewing
// another time.
export function DeskClock({ clock, touch = false, hint = false }: { clock: ReturnType<typeof useDeskTime>; touch?: boolean; hint?: boolean }) {
  // Inherits the stage's text colour: ink on a light background, cream on a
  // dark one. Letter by letter it can flip where the 3D desk passes behind
  // (AdaptiveText).
  return (
    <>
    {touch && (
      <>
        {/* Top centre, where the wall is clear at every hour: the four
            stops, the one showing drawn long, and until the first swipe how
            to move between them. A row rather than a column, so it isn't
            read as more of the page dots. */}
        <div aria-hidden="true" style={{ pointerEvents: "none" }} className="absolute left-1/2 top-6 flex -translate-x-1/2 flex-col items-center gap-3">
          <div className="flex items-center gap-2">
            {STOPS.map((stop) => (
              <span
                key={stop}
                className="h-1 rounded-full bg-current transition-[width,opacity] duration-300"
                style={{ width: clock.look === stop ? 18 : 4, opacity: clock.look === stop ? 1 : 0.35 }}
              />
            ))}
          </div>
          <p
            className="flex items-center gap-1.5 whitespace-nowrap rounded-full bg-current/8 px-3 py-1.5 font-body text-xs font-medium transition-opacity duration-500"
            style={{ opacity: hint ? 1 : 0 }}
          >
            <svg viewBox="0 0 24 24" className="size-3.5" aria-hidden="true">
              <path d="M12 19V5M6 11l6-6 6 6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Swipe up to move the day on
          </p>
        </div>
      </>
    )}
    <div
      className="absolute bottom-6 flex flex-col items-end text-right md:bottom-10"
      style={{ right: "clamp(1.5rem, 3.5vw, 4rem)" }}
    >
      {/* Not a heading: the page's own h1 (app/page.tsx) carries the name. */}
      <p aria-hidden="true" className="font-display text-4xl leading-none sm:text-5xl lg:text-6xl"><AdaptiveText text="adrian klisz" /></p>
      <div
        className="mt-3 flex items-center justify-end gap-3 text-xl sm:text-2xl lg:text-3xl"
        style={{ fontFamily: "var(--font-pp-frama-extralight)", fontWeight: 200 }}
      >
        <button
          type="button"
          onClick={clock.reset}
          disabled={!clock.previewing}
          aria-label="Back to the current time"
          className="grid size-[1.2em] cursor-pointer place-items-center rounded-full transition-[opacity,transform] duration-200 hover:scale-110 active:scale-90 focus-visible:outline-2 focus-visible:outline-offset-4"
          style={{ opacity: clock.previewing ? 1 : 0, pointerEvents: clock.previewing ? undefined : "none" }}
        >
          <svg ref={adaptiveRef} viewBox="0 0 24 24" className="size-[0.85em] transition-colors duration-300" aria-hidden="true">
            <path d="M12 7a6 6 0 1 1-6 6" fill="none" stroke="currentColor" strokeWidth="2.6" />
            <path d="M12.5 2.5 7 7l5.5 4.5z" fill="currentColor" />
          </svg>
        </button>
        <span className="tabular-nums" aria-label={`${clock.time}, Stockholm`}><span aria-hidden="true"><AdaptiveText text={`${clock.time} · Stockholm`} /></span></span>
      </div>
    </div>
    </>
  );
}
