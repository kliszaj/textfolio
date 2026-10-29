// The typing leaderboard's API, run by the Worker in front of the static site
// (worker/index.ts). Kept free of Worker globals so it can be tested against
// a local SQLite database.
//
//   POST /api/tests   { duration }              -> { id, seed, duration }
//   POST /api/scores  { testId, name, events }  -> { wpm, accuracy, rank, board }
//   GET  /api/scores?duration=15                -> { board }
import { cleanName, isDuration, judge, LEADERBOARD_SIZE, wordsFor, type Entry } from "../lib/leaderboard";

// The subset of Cloudflare's D1 API used here.
export interface D1PreparedStatement {
  bind(...values: unknown[]): D1PreparedStatement;
  first<T = Record<string, unknown>>(): Promise<T | null>;
  all<T = Record<string, unknown>>(): Promise<{ results: T[] }>;
  run(): Promise<unknown>;
}
export interface D1Database {
  prepare(query: string): D1PreparedStatement;
}

const MINUTE = 60_000;
// A test must be scored within this long of being handed out.
const TEST_TTL = 60 * MINUTE;
// Per visitor: tests handed out an hour, scores saved per ten minutes.
const TESTS_PER_HOUR = 120;
const SCORES_PER_10_MIN = 10;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", "cache-control": "no-store" },
  });

// Rate limits only need to tell visitors apart for a day, not identify them.
async function hashIp(ip: string, now: number) {
  const day = new Date(now).toISOString().slice(0, 10);
  const bytes = new TextEncoder().encode(`${day}:${ip}`);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest).slice(0, 12), (b) => b.toString(16).padStart(2, "0")).join("");
}

// Each name's best run, best first.
async function board(db: D1Database, duration: number): Promise<Entry[]> {
  const { results } = await db
    .prepare(
      `SELECT name, wpm, accuracy, created_at AS createdAt FROM (
         SELECT *, ROW_NUMBER() OVER (PARTITION BY lower(name) ORDER BY wpm DESC, accuracy DESC, created_at ASC) AS rn
         FROM scores WHERE duration = ?
       ) WHERE rn = 1
       ORDER BY wpm DESC, accuracy DESC, createdAt ASC
       LIMIT ?`,
    )
    .bind(duration, LEADERBOARD_SIZE)
    .all<Entry>();
  return results;
}

async function readJson(request: Request): Promise<Record<string, unknown> | null> {
  try {
    const body = await request.json();
    return body && typeof body === "object" ? (body as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

export async function handleApi(request: Request, db: D1Database, now = Date.now()): Promise<Response> {
  const url = new URL(request.url);
  const ip = request.headers.get("cf-connecting-ip") ?? "unknown";

  if (url.pathname === "/api/scores" && request.method === "GET") {
    const duration = Number(url.searchParams.get("duration"));
    if (!isDuration(duration)) return json({ error: "unknown test length" }, 400);
    return json({ board: await board(db, duration) });
  }

  if (url.pathname === "/api/tests" && request.method === "POST") {
    const body = await readJson(request);
    const duration = Number(body?.duration);
    if (!isDuration(duration)) return json({ error: "unknown test length" }, 400);
    const ipHash = await hashIp(ip, now);
    const recent = await db
      .prepare("SELECT COUNT(*) AS n FROM tests WHERE ip_hash = ? AND created_at > ?")
      .bind(ipHash, now - 60 * MINUTE)
      .first<{ n: number }>();
    if ((recent?.n ?? 0) >= TESTS_PER_HOUR) return json({ error: "slow down" }, 429);
    // Old tests are only needed for an hour; tidy as we go.
    await db.prepare("DELETE FROM tests WHERE created_at < ?").bind(now - 24 * 60 * MINUTE).run();
    const id = crypto.randomUUID();
    const seed = crypto.getRandomValues(new Uint32Array(1))[0];
    await db
      .prepare("INSERT INTO tests (id, seed, duration, created_at, ip_hash) VALUES (?, ?, ?, ?, ?)")
      .bind(id, seed, duration, now, ipHash)
      .run();
    return json({ id, seed, duration });
  }

  if (url.pathname === "/api/scores" && request.method === "POST") {
    const body = await readJson(request);
    if (!body) return json({ error: "bad request" }, 400);
    const name = cleanName(body.name);
    if (!name) return json({ error: "Names are 2–16 letters, numbers, spaces or . _ ' -" }, 400);
    const ipHash = await hashIp(ip, now);
    const recent = await db
      .prepare("SELECT COUNT(*) AS n FROM scores WHERE ip_hash = ? AND created_at > ?")
      .bind(ipHash, now - 10 * MINUTE)
      .first<{ n: number }>();
    if ((recent?.n ?? 0) >= SCORES_PER_10_MIN) return json({ error: "slow down" }, 429);

    const test = await db
      .prepare("SELECT seed, duration, created_at AS createdAt, used FROM tests WHERE id = ?")
      .bind(typeof body.testId === "string" ? body.testId : "")
      .first<{ seed: number; duration: number; createdAt: number; used: number }>();
    if (!test || test.used) return json({ error: "That test can't be scored" }, 400);
    if (now - test.createdAt > TEST_TTL) return json({ error: "That test has expired" }, 400);
    // A run can't be over before its time has passed since the words were given.
    if (now - test.createdAt < test.duration * 1000) return json({ error: "That test isn't finished" }, 400);

    const verdict = judge(wordsFor(test.seed, test.duration), test.duration, body.events);
    // Spent either way, so a rejected run can't be retried with edits.
    await db.prepare("UPDATE tests SET used = 1 WHERE id = ?").bind(body.testId).run();
    if (!verdict.ok) return json({ error: `Not saved: ${verdict.reason}` }, 400);

    await db
      .prepare("INSERT INTO scores (name, duration, wpm, accuracy, raw, created_at, ip_hash) VALUES (?, ?, ?, ?, ?, ?, ?)")
      .bind(name, test.duration, verdict.wpm, verdict.accuracy, verdict.raw, now, ipHash)
      .run();
    // Where this run places among each name's best.
    const better = await db
      .prepare(
        `SELECT COUNT(*) AS n FROM (
           SELECT lower(name) AS who, MAX(wpm * 1000 + accuracy) AS best FROM scores
           WHERE duration = ? AND lower(name) != lower(?) GROUP BY who
         ) WHERE best > ?`,
      )
      .bind(test.duration, name, verdict.wpm * 1000 + verdict.accuracy)
      .first<{ n: number }>();
    return json({
      wpm: verdict.wpm,
      accuracy: verdict.accuracy,
      rank: (better?.n ?? 0) + 1,
      board: await board(db, test.duration),
    });
  }

  return json({ error: "not found" }, 404);
}
