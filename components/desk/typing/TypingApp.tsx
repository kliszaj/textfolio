"use client";

import { memo, useEffect, useLayoutEffect, useRef } from "react";
import type { CSSProperties } from "react";
import { accuracy, results, secondsLeft, wpm, type TypingState } from "@/lib/typingTest";
import { LEADERBOARD_SIZE } from "@/lib/leaderboard";
import { TYPING_DURATIONS, type Browse, type Leaderboard } from "./useTypingTest";
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
  leaderboard: Leaderboard;
  onName: (name: string) => void;
  onSubmit: () => void;
  onRetryBoard: () => void;
  // The leaderboard opened from the test, and its current tab.
  view: "test" | "board";
  browse: Browse;
  onShowBoard: (duration: number) => void;
  onHideBoard: () => void;
};

export const TypingApp = memo(
  function TypingApp({ state, now, duration, style, interactive, onInput, onRestart, onClose, leaderboard, onName, onSubmit, onRetryBoard, view, browse, onShowBoard, onHideBoard }: Props) {
    const wordsRef = useRef<HTMLDivElement>(null);
    const windowRef = useRef<HTMLDivElement>(null);
    const caretRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const chartRef = useRef<HTMLCanvasElement>(null);
    const nameRef = useRef<HTMLInputElement>(null);

    const wi = state ? state.typed.length - 1 : 0;
    const done = state?.finishedAt != null;
    const running = state?.startedAt != null && !done;
    const browsing = view === "board";

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
    // At the end, a run that can be saved asks for a name straight away; once
    // saved (the form goes) or if it can't be, focus goes back to the hidden
    // input, where Tab and Esc are handled.
    useEffect(() => {
      if (!interactive || !done) return;
      (leaderboard.eligible ? nameRef : inputRef).current?.focus({ preventScroll: true });
    }, [interactive, done, leaderboard.eligible]);

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
      <div className={styles.window} style={style} onPointerDown={() => interactive && !done && window.setTimeout(() => inputRef.current?.focus({ preventScroll: true }))}>
        <BrowserBar
          path={browsing ? "/type/leaderboard" : "/type"}
          title={browsing ? "Leaderboard" : "Typing test"}
          interactive={interactive}
          onClose={onClose}
        />
        <div className={`${styles.pane} ${done ? styles.done : ""} ${browsing ? styles.browsing : ""}`}>
          <div className={styles.playing}>
            <div className={styles.bar}>
              <div className={styles.stats} aria-live="off">
                <span>{state ? secondsLeft(state, now) : duration} <span className={styles.unit}>s</span></span>
                <span>{state ? wpm(state, now) : 0} <span className={styles.unit}>wpm</span></span>
                <span>{state ? accuracy(state) : 100} <span className={styles.unit}>% acc</span></span>
              </div>
              <div className={styles.modes} aria-label="Test length">
                {/* Not mid-run: it would leave the clock running behind it. */}
                {!running && (
                  <button
                    type="button"
                    className={`${styles.mode} ${styles.boardButton}`}
                    aria-label="Leaderboard"
                    tabIndex={interactive ? 0 : -1}
                    onClick={() => onShowBoard(duration)}
                  >
                    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 4h8v5a4 4 0 0 1-8 0zM8 6H5v1a3 3 0 0 0 3 3M16 6h3v1a3 3 0 0 1-3 3M12 13v4M9 20h6M10 17h4" /></svg>
                    <span className={styles.boardLabel}>leaderboard</span>
                  </button>
                )}
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
                <Board
                  leaderboard={leaderboard}
                  duration={state?.duration ?? duration}
                  interactive={interactive}
                  nameRef={nameRef}
                  onName={onName}
                  onSubmit={onSubmit}
                  onRetry={onRetryBoard}
                  onRestart={onRestart}
                  onClose={onClose}
                />
                <div className={`${styles.hint} ${styles.again}`}>
                  <kbd>tab</kbd> next test · <kbd>esc</kbd> back to the desk
                </div>
              </>
            )}
          </div>
          <BoardView browse={browse} interactive={interactive} onShow={onShowBoard} onHide={onHideBoard} />
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
                // Keys typed while the leaderboard is open don't count.
                if (browsing) return;
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
                  // The desk listens for Esc too; this one is handled here.
                  event.stopPropagation();
                  if (browsing) onHideBoard();
                  else onClose();
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

function Icon({ d, muted = false }: { d: string; muted?: boolean }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={`${styles.icon} ${muted ? styles.muted : ""}`}>
      <path d={d} />
    </svg>
  );
}

// Browser chrome in dark mode, matching the case study's browser window on
// the monitor (BrowserChrome): a tab strip, then back, forward, reload and the
// address field. The red light closes the test; the rest is decoration.
function BrowserBar({ path, title, interactive, onClose }: { path: string; title: string; interactive: boolean; onClose: () => void }) {
  return (
    <div className={styles.chrome}>
      <div className={styles.tabStrip}>
        <span className={styles.lights}>
          <button type="button" className={`${styles.light} ${styles.close}`} onClick={onClose} aria-label="Close the typing test" tabIndex={interactive ? 0 : -1} />
          <i className={styles.light} style={{ background: "#febc2e" }} />
          <i className={styles.light} style={{ background: "#28c840" }} />
        </span>
        <span className={styles.tab} aria-hidden="true">
          <span className={styles.favicon}>a</span>
          <span className={styles.tabTitle}>{title} · Adrian Klisz</span>
          <span className={styles.tabClose}>×</span>
        </span>
        <span className={styles.newTab} aria-hidden="true">+</span>
      </div>
      <div className={styles.toolbar} aria-hidden="true">
        <span className={styles.nav}>
          <Icon d="m14 6-6 6 6 6M8 12h12" muted />
          <Icon d="m10 6 6 6-6 6M16 12H4" muted />
        </span>
        <Icon d="M19 8a8 8 0 1 0 1 8M19 3v5h-5" />
        <div className={styles.omnibox}>
          <Icon d="M8 11V8a4 4 0 0 1 8 0v3M6 11h12v9H6z" />
          <span className={styles.url}>
            adrianklisz.com<span className={styles.path}>{path}</span>
          </span>
          <span className={styles.star}>
            <Icon d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-3-5.6 3 1.1-6.2L3 9.6l6.2-.9z" />
          </span>
        </div>
        <span className={styles.menu}>⋮</span>
      </div>
    </div>
  );
}

// The leaderboard opened from the test: any length, with its own tabs.
function BoardView({ browse, interactive, onShow, onHide }: { browse: Browse; interactive: boolean; onShow: (duration: number) => void; onHide: () => void }) {
  return (
    <div className={styles.boardView} aria-live="polite">
      <div className={styles.boardHead}>
        <span className={styles.boardTitle}>leaderboard</span>
        <div className={styles.modes} aria-label="Test length">
          {TYPING_DURATIONS.map((seconds) => (
            <button
              key={seconds}
              type="button"
              className={styles.mode}
              aria-pressed={seconds === browse.duration}
              tabIndex={interactive ? 0 : -1}
              onClick={() => onShow(seconds)}
            >
              {seconds}s
            </button>
          ))}
        </div>
      </div>
      {browse.status === "offline" ? (
        <p className={styles.note}>
          The leaderboard isn&apos;t available right now.{" "}
          <button type="button" className={styles.retry} onClick={() => onShow(browse.duration)} tabIndex={interactive ? 0 : -1}>
            Try again
          </button>
        </p>
      ) : browse.status === "loading" ? (
        <p className={styles.note}>Loading…</p>
      ) : browse.board.length === 0 ? (
        <p className={styles.note}>No {browse.duration}-second scores yet. Be the first.</p>
      ) : (
        <ol className={`${styles.entries} ${styles.wideEntries}`}>
          {browse.board.map((entry, i) => (
            <li key={entry.name + entry.createdAt}>
              <span className={styles.rank}>{i + 1}</span>
              <span className={styles.who}>{entry.name}</span>
              <span className={styles.score}>{entry.wpm}</span>
              <span className={styles.acc}>{entry.accuracy}%</span>
            </li>
          ))}
        </ol>
      )}
      <div className={styles.hint}>
        <button type="button" className={styles.back} onClick={onHide} tabIndex={interactive ? 0 : -1}>
          ← back to the test
        </button>{" "}
        · <kbd>esc</kbd>
      </div>
    </div>
  );
}

// This length's top runs, and the name field for a run that can go on it.
function Board({
  leaderboard,
  duration,
  interactive,
  nameRef,
  onName,
  onSubmit,
  onRetry,
  onRestart,
  onClose,
}: {
  leaderboard: Leaderboard;
  duration: number;
  interactive: boolean;
  nameRef: React.RefObject<HTMLInputElement | null>;
  onName: (name: string) => void;
  onSubmit: () => void;
  onRetry: () => void;
  onRestart: () => void;
  onClose: () => void;
}) {
  const { status, board, eligible, saving, message, rank, name, savedName } = leaderboard;
  const mine = (entry: string) => savedName !== null && entry.toLowerCase() === savedName.toLowerCase();
  return (
    <div className={styles.board}>
      <div className={styles.label}>leaderboard · {duration}s</div>
      {status === "offline" ? (
        <p className={styles.note}>
          The leaderboard isn&apos;t available right now.{" "}
          <button type="button" className={styles.retry} onClick={onRetry} tabIndex={interactive ? 0 : -1}>
            Try again
          </button>
        </p>
      ) : status === "loading" ? (
        <p className={styles.note}>Loading…</p>
      ) : board.length === 0 ? (
        <p className={styles.note}>No scores yet{eligible ? ": be the first." : "."}</p>
      ) : (
        <ol className={styles.entries}>
          {board.map((entry, i) => (
            <li key={entry.name + entry.createdAt} className={mine(entry.name) ? styles.mine : undefined}>
              <span className={styles.rank}>{i + 1}</span>
              <span className={styles.who}>{entry.name}</span>
              <span className={styles.score}>{entry.wpm}</span>
              <span className={styles.acc}>{entry.accuracy}%</span>
            </li>
          ))}
        </ol>
      )}
      {eligible && (
        <form
          className={styles.save}
          onSubmit={(event) => {
            event.preventDefault();
            if (saving !== "saving") onSubmit();
          }}
        >
          <input
            ref={nameRef}
            className={styles.name}
            value={name}
            onChange={(event) => onName(event.target.value)}
            // The last name used comes prefilled: Enter keeps it, typing replaces it.
            onFocus={(event) => event.target.select()}
            onKeyDown={(event) => {
              if (event.key === "Escape") {
                event.preventDefault();
                onClose();
              } else if (event.key === "Tab") {
                event.preventDefault();
                onRestart();
              }
            }}
            placeholder="your name"
            aria-label="Your name for the leaderboard"
            maxLength={16}
            autoComplete="nickname"
            spellCheck={false}
            tabIndex={interactive ? 0 : -1}
          />
          <button type="submit" className={styles.saveButton} disabled={saving === "saving" || name.trim().length < 2} tabIndex={interactive ? 0 : -1}>
            {saving === "saving" ? "saving…" : "save"}
          </button>
        </form>
      )}
      {saving === "error" && message && <p className={`${styles.note} ${styles.error}`}>{message}</p>}
      {saving === "saved" && rank !== null && rank > LEADERBOARD_SIZE && <p className={styles.note}>Saved: you&apos;re #{rank}.</p>}
    </div>
  );
}
