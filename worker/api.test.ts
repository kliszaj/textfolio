/**
 * @jest-environment node
 */
import fs from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { handleApi, type D1Database, type D1PreparedStatement } from "./api";
import { wordsFor, type RunEvent } from "../lib/leaderboard";

// D1 is SQLite; this stands Node's built-in SQLite in for it, with the real
// migration applied.
function localD1(): D1Database {
  const sqlite = new DatabaseSync(":memory:");
  sqlite.exec(fs.readFileSync(path.join(__dirname, "../migrations/0001_leaderboard.sql"), "utf8"));
  return {
    prepare(query: string) {
      let params: unknown[] = [];
      const statement: D1PreparedStatement = {
        bind(...values) {
          params = values;
          return statement;
        },
        async first<T>() {
          return (sqlite.prepare(query).get(...params) as T) ?? null;
        },
        async all<T>() {
          return { results: sqlite.prepare(query).all(...params) as T[] };
        },
        async run() {
          return sqlite.prepare(query).run(...params);
        },
      };
      return statement;
    },
  };
}

const post = (path: string, body: unknown, ip = "1.2.3.4") =>
  new Request(`https://adrianklisz.com${path}`, {
    method: "POST",
    headers: { "content-type": "application/json", "cf-connecting-ip": ip },
    body: JSON.stringify(body),
  });
const get = (path: string) => new Request(`https://adrianklisz.com${path}`);

// Types the test's first `count` words correctly, a key every `gap` ms.
const honestRun = (seed: number, duration: number, count: number, gap = 150): RunEvent[] =>
  [...(wordsFor(seed, duration).slice(0, count).join(" ") + " ")].map((key, i) => [i * gap, key]);

const T0 = Date.UTC(2026, 9, 29, 12);

async function play(db: D1Database, name: string, count: number, ip = "1.2.3.4", duration = 15) {
  const test = await (await handleApi(post("/api/tests", { duration }, ip), db, T0)).json();
  const response = await handleApi(
    post("/api/scores", { testId: test.id, name, events: honestRun(test.seed, duration, count) }, ip),
    db,
    T0 + (duration + 5) * 1000,
  );
  return { test, response, body: await response.json() };
}

test("a test comes with a seed the server can rebuild the words from", async () => {
  const db = localD1();
  const response = await handleApi(post("/api/tests", { duration: 30 }), db, T0);
  const body = await response.json();
  expect(response.status).toBe(200);
  expect(body).toMatchObject({ duration: 30 });
  expect(typeof body.id).toBe("string");
  expect(Number.isInteger(body.seed)).toBe(true);
});

test("an honest run is scored by the server and lands on the board", async () => {
  const db = localD1();
  const { response, body } = await play(db, "Ada", 10);
  expect(response.status).toBe(200);
  expect(body.rank).toBe(1);
  expect(body.board).toEqual([expect.objectContaining({ name: "Ada", wpm: body.wpm, accuracy: 100 })]);
  const board = await (await handleApi(get("/api/scores?duration=15"), db, T0)).json();
  expect(board.board[0].name).toBe("Ada");
});

test("the board keeps each name's best run, best first, and reports rank", async () => {
  const db = localD1();
  await play(db, "Ada", 8, "1.1.1.1");
  await play(db, "ada", 12, "1.1.1.1"); // same person, better run
  await play(db, "Grace", 10, "2.2.2.2");
  const { body } = await play(db, "Linus", 4, "3.3.3.3");
  expect(body.board.map((entry: { name: string }) => entry.name)).toEqual(["ada", "Grace", "Linus"]);
  expect(body.rank).toBe(3);
});

test("a test can only be scored once", async () => {
  const db = localD1();
  const { test } = await play(db, "Ada", 10);
  const again = await handleApi(
    post("/api/scores", { testId: test.id, name: "Ada", events: honestRun(test.seed, 15, 10) }),
    db,
    T0 + 30_000,
  );
  expect(again.status).toBe(400);
});

test("a run can't come back before its time is up, or long after", async () => {
  const db = localD1();
  const test = await (await handleApi(post("/api/tests", { duration: 15 }), db, T0)).json();
  const early = await handleApi(post("/api/scores", { testId: test.id, name: "Ada", events: honestRun(test.seed, 15, 10) }), db, T0 + 5_000);
  expect(early.status).toBe(400);
  const test2 = await (await handleApi(post("/api/tests", { duration: 15 }), db, T0)).json();
  const late = await handleApi(post("/api/scores", { testId: test2.id, name: "Ada", events: honestRun(test2.seed, 15, 10) }), db, T0 + 2 * 3_600_000);
  expect(late.status).toBe(400);
});

test("typing words other than the ones handed out scores nothing", async () => {
  const db = localD1();
  const test = await (await handleApi(post("/api/tests", { duration: 15 }), db, T0)).json();
  // A perfect run of some other test's words.
  const events = honestRun(test.seed + 1, 15, 12);
  const response = await handleApi(post("/api/scores", { testId: test.id, name: "Mallory", events }), db, T0 + 20_000);
  expect(response.status).toBe(400);
});

test("a claimed score is ignored: only the keystrokes count", async () => {
  const db = localD1();
  const test = await (await handleApi(post("/api/tests", { duration: 15 }), db, T0)).json();
  const response = await handleApi(
    post("/api/scores", { testId: test.id, name: "Mallory", wpm: 240, events: honestRun(test.seed, 15, 3) }),
    db,
    T0 + 20_000,
  );
  const body = await response.json();
  expect(body.wpm).toBeLessThan(30);
});

test("bad names are refused before anything is spent", async () => {
  const db = localD1();
  const test = await (await handleApi(post("/api/tests", { duration: 15 }), db, T0)).json();
  const bad = await handleApi(post("/api/scores", { testId: test.id, name: "<b>", events: honestRun(test.seed, 15, 10) }), db, T0 + 20_000);
  expect(bad.status).toBe(400);
  const good = await handleApi(post("/api/scores", { testId: test.id, name: "Ada", events: honestRun(test.seed, 15, 10) }), db, T0 + 20_000);
  expect(good.status).toBe(200);
});

test("saving is rate limited per visitor", async () => {
  const db = localD1();
  const statuses: number[] = [];
  for (let i = 0; i < 12; i++) statuses.push((await play(db, `Ada${i}`, 6, "9.9.9.9")).response.status);
  expect(statuses.slice(0, 10).every((status) => status === 200)).toBe(true);
  expect(statuses[10]).toBe(429);
  // Someone else is unaffected.
  expect((await play(db, "Grace", 6, "8.8.8.8")).response.status).toBe(200);
});

test("unknown test lengths and routes are refused", async () => {
  const db = localD1();
  expect((await handleApi(get("/api/scores?duration=45"), db, T0)).status).toBe(400);
  expect((await handleApi(post("/api/tests", { duration: 5 }), db, T0)).status).toBe(400);
  expect((await handleApi(get("/api/nope"), db, T0)).status).toBe(404);
});
