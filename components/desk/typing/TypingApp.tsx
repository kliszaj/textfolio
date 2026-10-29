"use client";

import { memo, useEffect, useLayoutEffect, useRef } from "react";
import type { CSSProperties } from "react";
import { accuracy, results, secondsLeft, wpm, type TypingState } from "@/lib/typingTest";
import { TYPING_DURATIONS } from "./useTypingTest";
import styles from "./TypingApp.module.css";

// Words rendered ahead of the caret; the rest of the test's words wait.
const WORDS_AHEAD = 60;
// The hidden input always holds this, so a deletion is visible as a shorter
// value even when there is nothing typed.
const SENTINEL = "_";

export type TypingInput = (kind: "text" | "backspace" | "deleteWord", text?: string) => void;

type Props = {
  state: TypingState | null;
  now: number;
  duration: number;
  // Where the window sits, in the monitor's pixels (or the overlay's).
  style: CSSProperties;
  // The flat copy over the zoomed monitor takes input; the 3D copy only shows.
  interactive: boolean;
  // While the flat copy is showing, the hidden 3D copy needn't keep up.
  frozen?: boolean;
  onInput: TypingInput;
  onRestart: (duration?: number) => void;
  onClose: () => void;
};

export const TypingApp = memo(
  function TypingApp({ state, now, duration, style, interactive, onInput, onRestart, onClose }: Props) {
    const wordsRef = useRef<HTMLDivElement>(null);
    const windowRef = useRef<HTMLDivElement>(null);
    const caretRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const chartRef = useRef<HTMLCanvasElement>(null);

    const wi = state ? state.typed.length - 1 : 0;
    const done = state?.finishedAt != null;

    // The caret, and the words scrolled so the current line is the second.
    useLayoutEffect(() => {
      const words = wordsRef.current;
      const caret = caretRef.current;
      const windowEl = windowRef.current;
      if (!words || !caret || !windowEl || !state) return;
      const word = words.querySelector<HTMLElement>(`[data-w="${wi}"]`);
      const letters = word ? Array.from(word.children) as HTMLElement[] : [];
      if (!word || letters.length === 0) return;
      const typed = state.typed[wi].length;
      const ref = letters[Math.min(typed, letters.length - 1)];
      // Letters are position: relative, so offsets are already from .words.
      const x = typed < letters.length ? ref.offsetLeft : ref.offsetLeft + ref.offsetWidth;
      const lineHeight = parseFloat(getComputedStyle(windowEl).lineHeight) || ref.offsetHeight;
      const line = Math.round(ref.offsetTop / lineHeight);
      const shift = Math.max(0, line - 1) * lineHeight;
      words.style.transform = `translateY(${-shift}px)`;
      caret.style.transform = `translate(${x}px, ${ref.offsetTop - shift + (lineHeight - caret.offsetHeight) / 2}px)`;
    });

    // Typing goes to the hidden input; keep it focused while this copy is live.
    useEffect(() => {
      if (interactive) inputRef.current?.focus({ preventScroll: true });
    }, [interactive, state?.words]);

    // The graph of words per minute through the test.
    useEffect(() => {
      const canvas = chartRef.current;
      if (!canvas || !done || !state) return;
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      if (!w || !h) return;
      const dpr = window.devicePixelRatio || 1;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      const c = canvas.getContext("2d");
      if (!c) return;
      c.scale(dpr, dpr);
      const data = state.samples.length > 1 ? state.samples : [0, ...state.samples, results(state).wpm];
      const max = Math.max(20, ...data) * 1.15;
      const pad = 6;
      c.strokeStyle = "rgba(245,237,230,.08)";
      c.lineWidth = 1;
      for (let g = 1; g < 4; g++) {
        const y = pad + ((h - pad * 2) * g) / 4;
        c.beginPath();
        c.moveTo(0, y);
        c.lineTo(w, y);
        c.stroke();
      }
      const points = data.map((v, i) => [pad + ((w - pad * 2) * i) / (data.length - 1), h - pad - ((h - pad * 2) * v) / max]);
      const fill = c.createLinearGradient(0, 0, 0, h);
      fill.addColorStop(0, "rgba(255,165,46,.35)");
      fill.addColorStop(1, "rgba(255,165,46,0)");
      c.beginPath();
      c.moveTo(points[0][0], h - pad);
      points.forEach(([x, y]) => c.lineTo(x, y));
      c.lineTo(points[points.length - 1][0], h - pad);
      c.fillStyle = fill;
      c.fill();
      c.beginPath();
      points.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y)));
      c.strokeStyle = "#ffa52e";
      c.lineWidth = 2.5;
      c.lineJoin = "round";
      c.stroke();
    }, [done, state]);

    const final = state && done ? results(state) : null;

    return (
      <div className={styles.window} style={style} onPointerDown={() => interactive && window.setTimeout(() => inputRef.current?.focus({ preventScroll: true }))}>
        <div className={styles.chrome}>
          <button type="button" className={`${styles.light} ${styles.close}`} onClick={onClose} aria-label="Close the typing test" tabIndex={interactive ? 0 : -1} />
          <i className={styles.light} style={{ background: "#eac66c" }} />
          <i className={styles.light} style={{ background: "#8aca9d" }} />
          <span className={styles.title}>type — adrianklisz.com</span>
        </div>
        <div className={`${styles.pane} ${done ? styles.done : ""}`}>
          <div className={styles.playing}>
            <div className={styles.bar}>
              <div className={styles.stats} aria-live="off">
                <span>{state ? secondsLeft(state, now) : duration} <span className={styles.unit}>s</span></span>
                <span>{state ? wpm(state, now) : 0} <span className={styles.unit}>wpm</span></span>
                <span>{state ? accuracy(state) : 100} <span className={styles.unit}>% acc</span></span>
              </div>
              <div className={styles.modes} aria-label="Test length">
                {TYPING_DURATIONS.map((seconds) => (
                  <button
                    key={seconds}
                    type="button"
                    className={styles.mode}
                    aria-pressed={seconds === duration}
                    tabIndex={interactive ? 0 : -1}
                    onClick={() => onRestart(seconds)}
                  >
                    {seconds}s
                  </button>
                ))}
              </div>
            </div>
            <div ref={windowRef} className={styles.wordsWindow}>
              <div ref={wordsRef} className={styles.words} aria-hidden="true">
                {state?.words.slice(0, wi + WORDS_AHEAD).map((target, i) => {
                  const typed = state.typed[i] ?? "";
                  const mistyped = i < wi && typed !== target;
                  return (
                    <span key={i} data-w={i} className={`${styles.word} ${mistyped ? styles.error : ""}`}>
                      {[...target].map((char, k) => (
                        <span
                          key={k}
                          className={`${styles.letter} ${k < typed.length ? (typed[k] === char ? styles.correct : styles.incorrect) : ""}`}
                        >
                          {char}
                        </span>
                      ))}
                      {[...typed.slice(target.length)].map((char, k) => (
                        <span key={`x${k}`} className={`${styles.letter} ${styles.extra}`}>{char}</span>
                      ))}
                    </span>
                  );
                })}
              </div>
              <div ref={caretRef} className={`${styles.caret} ${state?.startedAt == null ? styles.idle : ""}`} />
            </div>
            <div className={styles.hint}>
              <kbd>tab</kbd> restart · <kbd>esc</kbd> back to the desk
            </div>
          </div>
          <div className={styles.results} aria-live="polite">
            {final && (
              <>
                <div><div className={styles.label}>wpm</div><div className={styles.big}>{final.wpm}</div></div>
                <canvas ref={chartRef} className={styles.chart} aria-hidden="true" />
                <div><div className={styles.label}>accuracy</div><div className={styles.small}>{final.accuracy}%</div></div>
                <div><div className={styles.label}>raw</div><div className={styles.small}>{final.raw}</div></div>
                <div><div className={styles.label}>characters</div><div className={styles.small}>{final.correct}/{final.total}</div></div>
                <div className={`${styles.hint} ${styles.again}`}>
                  <kbd>tab</kbd> next test · <kbd>esc</kbd> back to the desk
                </div>
              </>
            )}
          </div>
          {interactive && (
            <input
              ref={inputRef}
              className={styles.input}
              value={SENTINEL}
              aria-label="Type the words shown"
              autoCapitalize="off"
              autoComplete="off"
              autoCorrect="off"
              spellCheck={false}
              onChange={(event) => {
                const value = event.target.value;
                const kind = (event.nativeEvent as InputEvent).inputType;
                if (kind === "deleteWordBackward" || kind === "deleteSoftLineBackward") onInput("deleteWord");
                else if (value.length < SENTINEL.length) onInput("backspace");
                else onInput("text", value.startsWith(SENTINEL) ? value.slice(SENTINEL.length) : value.replace(SENTINEL, ""));
              }}
              onKeyDown={(event) => {
                if (event.key === "Tab") {
                  event.preventDefault();
                  onRestart();
                } else if (event.key === "Escape") {
                  event.preventDefault();
                  onClose();
                }
              }}
            />
          )}
        </div>
      </div>
    );
  },
  // The hidden 3D copy holds its last frame while the flat one is in use.
  (previous, next) => Boolean(previous.frozen && next.frozen),
);
