// The typing test's leaderboard, shared by the browser and the Worker
// (worker/): the shape of a submitted run, the replay that scores it, and the
// checks a run must pass. No "@/" imports here: the Worker's bundler doesn't
// know the Next alias.
import { backspace, deleteWord, newTest, results, seededRandom, typeChar, typeSpace, type TypingState } from "./typingTest";

export const LEADERBOARD_DURATIONS = [15, 30, 60] as const;
export const LEADERBOARD_SIZE = 10;

// A run is sent as its keystrokes, not its score: [ms since the first key,
// key]. The server replays them through the same engine, so a score can't
// simply be claimed.
export const BACKSPACE = "\b";
export const DELETE_WORD = "\u0017";
export type RunEvent = [number, string];

// Beyond this is not a human typing on a site's homepage.
export const MAX_WPM = 250;
export const MIN_ACCURACY = 50;
// Forty keys a second, sustained, is a script.
const MIN_AVERAGE_GAP_MS = 25;
const MAX_EVENTS = 2000;

export type Run = { name: string; testId: string; events: RunEvent[] };
export type Entry = { name: string; wpm: number; accuracy: number; createdAt: number };

export function wordsFor(seed: number, duration: number) {
  return newTest(duration, seededRandom(seed)).words;
}

// Plays the keystrokes into a fresh test with the given words.
export function replay(words: string[], duration: number, events: RunEvent[]): TypingState {
  let state: TypingState = { ...newTest(duration), words };
  for (const [t, key] of events) {
    if (key === BACKSPACE) state = backspace(state, t);
    else if (key === DELETE_WORD) state = deleteWord(state, t);
    else if (key === " ") state = typeSpace(state, t);
    else state = typeChar(state, key, t);
  }
  return state;
}

export type Verdict = { ok: true; wpm: number; accuracy: number; raw: number } | { ok: false; reason: string };

// Scores a run and decides whether it can go on the board.
export function judge(words: string[], duration: number, events: unknown): Verdict {
  if (!Array.isArray(events) || events.length < 5 || events.length > MAX_EVENTS) return { ok: false, reason: "not enough typing" };
  let last = -1;
  for (const event of events) {
    if (!Array.isArray(event) || event.length !== 2) return { ok: false, reason: "malformed run" };
    const [t, key] = event;
    if (typeof t !== "number" || !Number.isFinite(t) || typeof key !== "string" || key.length !== 1) return { ok: false, reason: "malformed run" };
    if (t < last || t < 0) return { ok: false, reason: "malformed run" };
    last = t;
  }
  const typed = events as RunEvent[];
  if (typed[0][0] !== 0) return { ok: false, reason: "malformed run" };
  const inTime = typed.filter(([t]) => t < duration * 1000);
  const span = inTime[inTime.length - 1][0];
  if (inTime.length > 1 && span / (inTime.length - 1) < MIN_AVERAGE_GAP_MS) return { ok: false, reason: "too fast to be real" };
  const state = replay(words, duration, typed);
  const score = results({ ...state, finishedAt: (state.startedAt ?? 0) + duration * 1000 });
  if (score.wpm < 1) return { ok: false, reason: "no words typed" };
  if (score.wpm > MAX_WPM) return { ok: false, reason: "too fast to be real" };
  if (score.accuracy < MIN_ACCURACY) return { ok: false, reason: "too many mistakes" };
  return { ok: true, wpm: score.wpm, accuracy: score.accuracy, raw: score.raw };
}

// A few words that don't belong on a public board. Not exhaustive; entries
// can always be removed by hand (see handoff.md).
const BLOCKED = ["fuck", "shit", "cunt", "nazi", "porn", "rape", "dick", "cock", "pussy", "whore", "slut"];

export function cleanName(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const name = raw.normalize("NFC").replace(/\s+/g, " ").trim();
  if (name.length < 2 || name.length > 16) return null;
  if (!/^[\p{L}\p{N} ._'-]+$/u.test(name)) return null;
  const squashed = name.toLowerCase().replace(/[^a-z]/g, "");
  if (BLOCKED.some((word) => squashed.includes(word))) return null;
  return name;
}

export function isDuration(value: unknown): value is (typeof LEADERBOARD_DURATIONS)[number] {
  return LEADERBOARD_DURATIONS.includes(value as (typeof LEADERBOARD_DURATIONS)[number]);
}
