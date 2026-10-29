import { BACKSPACE, cleanName, judge, MAX_WPM, replay, wordsFor, type RunEvent } from "./leaderboard";

// Types `text` at a steady `gapMs` per key, starting at 0.
const typing = (text: string, gapMs = 150): RunEvent[] => [...text].map((key, i) => [i * gapMs, key]);

test("a seed always rebuilds the same words", () => {
  expect(wordsFor(7, 30)).toEqual(wordsFor(7, 30));
});

test("replaying a run scores it with the shared engine", () => {
  const words = ["one", "two", "three"];
  const state = replay(words, 15, typing("one twx" + BACKSPACE + "o "));
  expect(state.typed).toEqual(["one", "two", ""]);
});

test("an honest run is scored by the server, not by the browser", () => {
  const words = wordsFor(1, 15);
  const text = words.slice(0, 12).join(" ") + " ";
  const verdict = judge(words, 15, typing(text, 160));
  expect(verdict.ok).toBe(true);
  if (verdict.ok) {
    // All correct: every character and space, over a quarter of a minute.
    expect(verdict.wpm).toBe(Math.round(text.length / 5 / 0.25));
    expect(verdict.accuracy).toBe(100);
  }
});

test("keys after the time limit don't count", () => {
  const words = Array(80).fill("ab");
  // 3 keys a second for 30 seconds, in a 15-second test.
  const events = typing("ab ".repeat(30), 333);
  // Keys at 0, 333 ... 14985ms are in time: 46 of them, all correct.
  expect(judge(words, 15, events)).toMatchObject({ ok: true, wpm: Math.round(46 / 5 / 0.25) });
});

test("inhumanly fast runs are rejected", () => {
  const words = wordsFor(2, 15);
  const text = words.slice(0, 60).join(" ") + " ";
  expect(judge(words, 15, typing(text, 10))).toEqual({ ok: false, reason: "too fast to be real" });
  // Plausible gaps, but too many words for the time: still over the cap.
  const verdict = judge(words, 15, typing(words.slice(0, 120).join(" ") + " ", 26));
  expect(verdict.ok ? verdict.wpm <= MAX_WPM : true).toBe(true);
});

test("runs that are mostly mistakes are rejected", () => {
  const words = wordsFor(3, 15);
  expect(judge(words, 15, typing("zzzzzz zzzzz zzzzzz zzzz "))).toMatchObject({ ok: false });
});

test("malformed runs are rejected", () => {
  const words = wordsFor(4, 15);
  expect(judge(words, 15, "nope")).toMatchObject({ ok: false });
  expect(judge(words, 15, [[0, "a"], [10, "b"]])).toMatchObject({ ok: false, reason: "not enough typing" });
  expect(judge(words, 15, [[0, "a"], [500, "bb"], [600, "c"], [700, "d"], [800, "e"]])).toMatchObject({ reason: "malformed run" });
  expect(judge(words, 15, [[0, "a"], [500, "b"], [400, "c"], [700, "d"], [800, "e"]])).toMatchObject({ reason: "malformed run" });
  expect(judge(words, 15, [[100, "a"], [500, "b"], [600, "c"], [700, "d"], [800, "e"]])).toMatchObject({ reason: "malformed run" });
});

describe("names", () => {
  test("are trimmed and squeezed", () => {
    expect(cleanName("  Ada   Lovelace ")).toBe("Ada Lovelace");
  });

  test("allow letters in any script, digits and a little punctuation", () => {
    expect(cleanName("Åsa-Lind")).toBe("Åsa-Lind");
    expect(cleanName("o'brien.42")).toBe("o'brien.42");
  });

  test("must be 2 to 16 characters", () => {
    expect(cleanName("a")).toBeNull();
    expect(cleanName("a".repeat(17))).toBeNull();
  });

  test("reject markup, emoji and blocked words, even disguised", () => {
    expect(cleanName("<script>")).toBeNull();
    expect(cleanName("🔥🔥")).toBeNull();
    expect(cleanName("f.u.c.k")).toBeNull();
    expect(cleanName(42)).toBeNull();
  });
});
