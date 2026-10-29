import {
  accuracy,
  backspace,
  counts,
  deleteWord,
  MAX_EXTRA,
  newTest,
  results,
  secondsLeft,
  tick,
  typeChar,
  typeSpace,
  wpm,
  type TypingState,
} from "./typingTest";

// A test with known words rather than random ones.
const fixed = (words: string[], duration = 15): TypingState => ({ ...newTest(duration), words });

const type = (s: TypingState, text: string, now = 0) =>
  [...text].reduce((state, char) => (char === " " ? typeSpace(state, now) : typeChar(state, char, now)), s);

test("a new test has plenty of words and nothing typed", () => {
  const s = newTest(30);
  expect(s.words.length).toBeGreaterThan(100);
  expect(s.typed).toEqual([""]);
  expect(s.startedAt).toBeNull();
});

test("the clock starts on the first key", () => {
  const s = typeChar(fixed(["one"]), "o", 5000);
  expect(s.startedAt).toBe(5000);
  expect(typeChar(s, "n", 6000).startedAt).toBe(5000);
});

test("counts right words with their spaces, plus the right part of the current word", () => {
  const s = type(fixed(["one", "two", "three"]), "one twx thr");
  // "one " right (4); "twx " wrong (0); "thr" a right prefix (3).
  expect(counts(s)).toEqual({ correct: 7, total: 11 });
});

test("accuracy is matched keystrokes over all keystrokes, corrections included", () => {
  let s = type(fixed(["cat"]), "cx");
  s = backspace(s);
  s = type(s, "at");
  // c ✓, x ✗, a ✓, t ✓ -- the backspace itself isn't a keystroke.
  expect(accuracy(s)).toBe(75);
});

test("space on an empty word does nothing", () => {
  const s = typeSpace(fixed(["one", "two"]), 0);
  expect(s.typed).toEqual([""]);
  expect(s.keys).toBe(0);
});

test("backspace steps back into a mistyped word, but not a correct one", () => {
  const wrong = backspace(type(fixed(["one", "two"]), "onx "));
  expect(wrong.typed).toEqual(["onx"]);
  const right = backspace(type(fixed(["one", "two"]), "one "));
  expect(right.typed).toEqual(["one", ""]);
});

test("ctrl+backspace clears the current word", () => {
  expect(deleteWord(type(fixed(["three"]), "thr")).typed).toEqual([""]);
});

test("extra letters past a word stop at a limit", () => {
  const s = type(fixed(["a"]), "a" + "z".repeat(MAX_EXTRA + 5));
  expect(s.typed[0].length).toBe(1 + MAX_EXTRA);
});

test("wpm is correct characters over five, per minute of the test so far", () => {
  // 50 correct characters ("hello " x ~8) in 12 seconds.
  const words = Array(20).fill("hello");
  const s = type(fixed(words), "hello ".repeat(8).trimEnd() + " ", 0);
  // 8 words x 6 characters = 48 correct.
  expect(wpm(s, 12000)).toBe(Math.round(48 / 5 / (12 / 60)));
});

test("the test ends when its time is up, and then ignores keys", () => {
  let s = type(fixed(["one", "two", "three"], 15), "one ", 0);
  s = tick(s, 1000);
  expect(s.finishedAt).toBeNull();
  expect(s.samples).toHaveLength(1);
  s = tick(s, 15000);
  expect(s.finishedAt).toBe(15000);
  expect(secondsLeft(s, 20000)).toBe(0);
  expect(typeChar(s, "t", 16000)).toBe(s);
});

test("results score over the whole duration", () => {
  const s = type(fixed(Array(20).fill("go"), 15), "go ".repeat(10), 0);
  const r = results({ ...s, finishedAt: 15000 });
  // 10 x "go " = 30 correct characters in a quarter of a minute.
  expect(r.wpm).toBe(Math.round(30 / 5 / 0.25));
  expect(r.accuracy).toBe(100);
});
