// The desk's typing test (click the keyboard): a small, Monkeytype-style
// timed test. Pure state and scoring here; the timer and the view live in
// components/desk/typing.

export type TypingState = {
  words: string[];
  // What was typed for each word so far; the last entry is the current word.
  typed: string[];
  duration: number;
  startedAt: number | null;
  finishedAt: number | null;
  // Every keystroke, and the ones that matched what they should have.
  keys: number;
  correctKeys: number;
  // Words per minute at the end of each second, for the results graph.
  samples: number[];
};

const WORD_COUNT = 160;
// Extra letters past the end of a word are shown, up to this many.
export const MAX_EXTRA = 8;

const WORDS = (
  "the be of and a to in he have it that for they with as not on she at by this we you do but from or which one would all will there say who make when can more if no man out other so what time up go about than into could state only new year some take come these know see use get like then first any work now may such give over think most even find day also after way many must look before great back through long where much should well people down own just because good each those feel seem how high too place little world very still nation hand old life tell write become here show house both between need mean call develop under last right move thing general school never same another begin while number part turn real leave might want point form off child few small since against ask late home interest large person end open public follow during present without again hold around possible head consider word program problem however lead system set order eye plan run keep face fact group play stand increase early course change help line " +
  "desk coffee notebook keyboard monitor chair morning studio design sketch type paper colour light window evening stockholm focus"
).trim().split(/\s+/);

// Deterministic words from a seed (mulberry32), so the leaderboard server
// can hand out a test and later rebuild exactly the words it gave.
export function seededRandom(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function newTest(duration: number, random: () => number = Math.random): TypingState {
  const words = Array.from({ length: WORD_COUNT }, () => WORDS[Math.floor(random() * WORDS.length)]);
  return { words, typed: [""], duration, startedAt: null, finishedAt: null, keys: 0, correctKeys: 0, samples: [] };
}

const current = (s: TypingState) => s.typed.length - 1;
const started = (s: TypingState, now: number) => s.startedAt ?? now;
// Over, by the clock rather than by the last tick: keys after the end count
// for nothing, exactly as the leaderboard's replay of the run treats them.
const over = (s: TypingState, now: number) =>
  s.finishedAt !== null || (s.startedAt !== null && now - s.startedAt >= s.duration * 1000);

export function typeChar(s: TypingState, char: string, now: number): TypingState {
  if (over(s, now)) return s;
  const wi = current(s);
  const word = s.typed[wi];
  if (word.length >= s.words[wi].length + MAX_EXTRA) return s;
  const typed = [...s.typed];
  typed[wi] = word + char;
  return {
    ...s,
    typed,
    startedAt: started(s, now),
    keys: s.keys + 1,
    correctKeys: s.correctKeys + (char === s.words[wi][word.length] ? 1 : 0),
  };
}

// Space moves on to the next word; on an empty word it does nothing.
export function typeSpace(s: TypingState, now: number): TypingState {
  if (over(s, now)) return s;
  const wi = current(s);
  if (s.typed[wi].length === 0 || wi >= s.words.length - 1) return s;
  return {
    ...s,
    typed: [...s.typed, ""],
    startedAt: started(s, now),
    keys: s.keys + 1,
    correctKeys: s.correctKeys + (s.typed[wi] === s.words[wi] ? 1 : 0),
  };
}

// Backspace removes a letter, or steps back into the previous word -- but only
// if that word was mistyped, as Monkeytype allows.
export function backspace(s: TypingState, now: number): TypingState {
  if (over(s, now)) return s;
  const wi = current(s);
  if (s.typed[wi].length > 0) {
    const typed = [...s.typed];
    typed[wi] = typed[wi].slice(0, -1);
    return { ...s, typed };
  }
  if (wi > 0 && s.typed[wi - 1] !== s.words[wi - 1]) return { ...s, typed: s.typed.slice(0, -1) };
  return s;
}

// Ctrl/Alt+Backspace: clear the current word.
export function deleteWord(s: TypingState, now: number): TypingState {
  if (over(s, now)) return s;
  const wi = current(s);
  if (s.typed[wi].length === 0) return backspace(s, now);
  const typed = [...s.typed];
  typed[wi] = "";
  return { ...s, typed };
}

// Monkeytype's counting: characters of words typed exactly right (each with
// its space), plus the right-so-far prefix of the current word.
export function counts(s: TypingState) {
  let correct = 0;
  let total = 0;
  const wi = current(s);
  s.typed.forEach((typed, i) => {
    const target = s.words[i];
    if (i < wi) {
      total += typed.length + 1;
      if (typed === target) correct += target.length + 1;
    } else {
      total += typed.length;
      let k = 0;
      while (k < typed.length && typed[k] === target[k]) k++;
      correct += k;
    }
  });
  return { correct, total };
}

// Seconds of the test used, from the first key to now or the end.
export function elapsed(s: TypingState, now: number) {
  if (s.startedAt === null) return 0;
  return Math.min(s.duration, ((s.finishedAt ?? now) - s.startedAt) / 1000);
}

export function secondsLeft(s: TypingState, now: number) {
  return Math.max(0, Math.ceil(s.duration - elapsed(s, now)));
}

export function wpm(s: TypingState, now: number) {
  const seconds = Math.max(1, elapsed(s, now));
  return Math.round(counts(s).correct / 5 / (seconds / 60));
}

export function accuracy(s: TypingState) {
  return s.keys === 0 ? 100 : Math.round((s.correctKeys / s.keys) * 100);
}

export function results(s: TypingState) {
  const { correct, total } = counts(s);
  const minutes = s.duration / 60;
  return {
    wpm: Math.round(correct / 5 / minutes),
    raw: Math.round(total / 5 / minutes),
    accuracy: accuracy(s),
    correct,
    total,
  };
}

// Called every second while running: records a graph point, and ends the test
// once its time is up.
export function tick(s: TypingState, now: number): TypingState {
  if (s.startedAt === null || s.finishedAt !== null) return s;
  const done = now - s.startedAt >= s.duration * 1000;
  return {
    ...s,
    samples: [...s.samples, wpm(s, now)],
    finishedAt: done ? s.startedAt + s.duration * 1000 : null,
  };
}
