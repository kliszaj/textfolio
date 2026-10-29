"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { backspace, deleteWord, newTest, results, tick, typeChar, typeSpace, type TypingState } from "@/lib/typingTest";
import { BACKSPACE, DELETE_WORD, wordsFor, type Entry, type RunEvent } from "@/lib/leaderboard";

export const TYPING_DURATIONS = [15, 30, 60] as const;
const NAME_KEY = "typing-name";

export type Leaderboard = {
  // "offline": no API (local preview, or the database isn't set up).
  status: "idle" | "loading" | "ready" | "offline";
  board: Entry[];
  // Whether this run can be saved: the words came from the server, it scored,
  // and it isn't saved yet.
  eligible: boolean;
  saving: "idle" | "saving" | "saved" | "error";
  message: string | null;
  rank: number | null;
  name: string;
  savedName: string | null;
};

type BoardState = Omit<Leaderboard, "eligible">;

// The leaderboard opened from the test (the "leaderboard" button), any length.
export type Browse = { duration: number; status: "loading" | "ready" | "offline"; board: Entry[] };
const EMPTY_BOARD: BoardState = { status: "idle", board: [], saving: "idle", message: null, rank: null, name: "", savedName: null };

// One retry after a short pause, for a dropped connection or a server error,
// so the leaderboard doesn't vanish over a single hiccup. Not for 4xx answers,
// which a retry wouldn't change.
const RETRY_DELAY_MS = 800;

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    let response: Response | null = null;
    try {
      response = await fetch(url, init);
    } catch (error) {
      if (attempt > 0) throw error;
    }
    if (response) {
      if (response.ok) return (await response.json()) as T;
      if (response.status < 500 || attempt > 0) throw new Error(`leaderboard ${response.status}`);
    }
    await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
  }
}

function storedName() {
  try {
    return window.localStorage.getItem(NAME_KEY) ?? "";
  } catch {
    return "";
  }
}

// Runs one typing test at a time: the clock, the per-second graph samples and
// the input, plus the leaderboard. Both copies of the window (on the 3D
// monitor and the flat one laid over it once the zoom lands) render from this
// one state, so the swap between them never shows.
export function useTypingTest() {
  const [duration, setDuration] = useState<number>(TYPING_DURATIONS[0]);
  // Starts empty: the words are random, and the server render must match.
  const [state, setState] = useState<TypingState | null>(null);
  const [now, setNow] = useState(0);
  const [boardState, setLeaderboard] = useState<BoardState>(EMPTY_BOARD);
  // The server's test for the current run. Its words are used only if they
  // arrive before typing starts; the run is checkable if they were.
  const [serverTest, setServerTest] = useState<{ id: string; words: string[] } | null>(null);
  // Every keystroke with its time, sent with the run.
  const events = useRef<RunEvent[]>([]);
  // Bumped on every restart, so a slow response for an old test is ignored.
  const generation = useRef(0);
  // The test, or the leaderboard opened from it.
  const [view, setView] = useState<"test" | "board">("test");
  const [browse, setBrowse] = useState<Browse>({ duration: TYPING_DURATIONS[0], status: "loading", board: [] });
  const browseRequest = useRef(0);

  const restart = useCallback((next = duration) => {
    const run = ++generation.current;
    setView("test");
    setDuration(next);
    setState(newTest(next));
    setNow(Date.now());
    setServerTest(null);
    events.current = [];
    setLeaderboard((board) => ({ ...EMPTY_BOARD, name: board.name || storedName() }));
    // Words from the server, so the run can be checked and saved. They arrive
    // during the zoom; if typing has already begun, this run just stays local.
    fetchJson<{ id: string; seed: number }>("/api/tests", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ duration: next }),
    })
      .then((test) => {
        if (generation.current !== run) return;
        const words = wordsFor(test.seed, next);
        setServerTest({ id: test.id, words });
        setState((s) => (!s || s.startedAt !== null ? s : { ...s, words }));
      })
      .catch(() => {
        if (generation.current === run) setLeaderboard((board) => ({ ...board, status: "offline" }));
      });
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
    if (kind === "backspace") events.current.push([at, BACKSPACE]);
    else if (kind === "deleteWord") events.current.push([at, DELETE_WORD]);
    else for (const char of text) events.current.push([at, char]);
    setState((s) => {
      if (!s) return s;
      if (kind === "backspace") return backspace(s, at);
      if (kind === "deleteWord") return deleteWord(s, at);
      return [...text].reduce((next, char) => (char === " " ? typeSpace(next, at) : typeChar(next, char, at)), s);
    });
  }, []);

  // This length's board, for the run that is current when it was asked for.
  const loadBoard = useCallback((length: number) => {
    const run = generation.current;
    fetchJson<{ board: Entry[] }>(`/api/scores?duration=${length}`)
      .then(({ board }) => {
        if (generation.current === run) setLeaderboard((current) => ({ ...current, status: "ready", board }));
      })
      .catch(() => {
        if (generation.current === run) setLeaderboard((current) => ({ ...current, status: "offline" }));
      });
  }, []);

  // At the end: the board, and whether the run can go on it.
  const finished = state?.finishedAt != null;
  useEffect(() => {
    if (finished && state) loadBoard(state.duration);
    // Once per finished run.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [finished]);

  // "Try again" on an unavailable board.
  const retryBoard = useCallback(() => {
    if (!state) return;
    setLeaderboard((board) => ({ ...board, status: "loading" }));
    loadBoard(state.duration);
  }, [state, loadBoard]);

  const setName = useCallback((name: string) => setLeaderboard((board) => ({ ...board, name })), []);

  const submit = useCallback(() => {
    const id = serverTest?.id;
    const first = events.current[0]?.[0];
    if (!id || first === undefined) return;
    const run = generation.current;
    const name = boardState.name.trim();
    try {
      window.localStorage.setItem(NAME_KEY, name);
    } catch {}
    setLeaderboard((board) => ({ ...board, saving: "saving", message: null }));
    fetch("/api/scores", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ testId: id, name, events: events.current.map(([at, key]) => [at - first, key]) }),
    })
      .then(async (response) => {
        const body = await response.json().catch(() => ({}));
        if (generation.current !== run) return;
        if (!response.ok) {
          setLeaderboard((board) => ({ ...board, saving: "error", message: body.error ?? "Couldn't save that" }));
          return;
        }
        setLeaderboard((board) => ({ ...board, saving: "saved", board: body.board, rank: body.rank, savedName: name }));
      })
      .catch(() => {
        if (generation.current === run) setLeaderboard((board) => ({ ...board, saving: "error", message: "Couldn't reach the leaderboard" }));
      });
  }, [boardState.name, serverTest]);

  const leaderboard: Leaderboard = {
    ...boardState,
    // Waiting on the board once the run is over.
    status: finished && boardState.status === "idle" ? "loading" : boardState.status,
    eligible:
      finished &&
      state !== null &&
      serverTest !== null &&
      state.words === serverTest.words &&
      results(state).wpm > 0 &&
      boardState.saving !== "saved",
  };

  // Opens the leaderboard for a length, or switches its tab.
  const showBoard = useCallback((length: number) => {
    const request = ++browseRequest.current;
    setView("board");
    setBrowse({ duration: length, status: "loading", board: [] });
    fetchJson<{ board: Entry[] }>(`/api/scores?duration=${length}`)
      .then(({ board }) => {
        if (browseRequest.current === request) setBrowse({ duration: length, status: "ready", board });
      })
      .catch(() => {
        if (browseRequest.current === request) setBrowse({ duration: length, status: "offline", board: [] });
      });
  }, []);
  const hideBoard = useCallback(() => setView("test"), []);

  return { state, now, duration, restart, input, leaderboard, setName, submit, retryBoard, view, browse, showBoard, hideBoard };
}
