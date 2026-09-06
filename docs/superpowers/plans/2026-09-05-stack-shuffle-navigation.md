# Stack Shuffle Navigation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make jumping to a case study from the page-indicator rail (and returning home from one) read as physically finding a specific page in the paper stack, instead of a generic zoom or a full-stack reset.

**Architecture:** Two new pure helpers in `lib/fanProgress.ts` (`combineTravel`, `travelForDepth`) let the stack's existing fan-emphasis math be driven to or from an arbitrary depth. A new `useStackShuffle` hook tweens the stack's travel value open to a target depth, holds briefly, then hands off to the existing lift/`CaseStudyFocus` machinery using the revealed sheet's real screen position. `useStackCollapse` is generalized to start its collapse from any travel value (not just 1), driven by the departing case study's own depth.

**Tech Stack:** Next.js 16 (App Router, `output: "export"`), React 19, TypeScript, Jest + Testing Library, Tailwind v4.

**Spec:** `docs/superpowers/specs/2026-09-05-stack-shuffle-navigation-design.md`

## Global Constraints

- No commits to git without the user's explicit sign-off — this plan does not include a push/deploy step. Regular `git commit` per task is fine (established project convention below), but confirm before anything touches `origin`.
- Every task must leave the full suite, `npx tsc --noEmit`, and `npx eslint .` clean before moving to the next task.
- Follow the codebase's existing TDD rhythm: write the failing test, watch it fail for the stated reason, implement, watch it pass.
- `hooks/*.ts` in this codebase never import from `@/data/*` — keep that boundary. Case-study data lookups (slug → depth) belong in `app/page.tsx`, which already imports `caseStudies`/`ABOUT_PAGE`.
- This repo's rAF-driven hooks are tested by hand-mocking `performance.now`/`requestAnimationFrame`/`cancelAnimationFrame` and stepping frames manually (see `hooks/useStackCollapse.test.ts`) — not `jest.useFakeTimers()`. Component-level integration tests that need a rAF-driven hook to run to completion use `jest.useFakeTimers()` with small incremental `advanceTimersByTime` steps instead (see the existing "the intro's cut effect" tests in `components/Hero.test.tsx`). Use whichever pattern matches the file you're in.

---

## Design deviations from the spec (read before starting)

Two implementation details differ from the spec's literal wording, discovered while working out exact signatures. Both are internal refinements, not behavior changes — flagging them so nothing looks like a silent departure from what was approved:

1. **`useStackCollapse`'s new parameter is `startTravel: number`, not `sheetCount`/`fanSplit`.** The spec said the hook "gains `sheetCount` and `fanSplit` parameters" and looks up the departing case study's depth itself. Keeping that lookup inside the hook would mean `hooks/useStackCollapse.ts` importing `caseStudies`/`ABOUT_PAGE` from `@/data/` — every other hook in this codebase is domain-agnostic. Instead, `app/page.tsx` (which already imports that data) resolves the slug to a depth and passes the *already-computed* starting travel value straight in. Same behavior, cleaner boundary.
2. **`useFanProgress` is not disabled during a shuffle.** The spec said real pointer input would be disabled via `useFanProgress`'s `enabled` flag. Checking the actual current code: `useStackCollapse`'s existing override does *not* disable `useFanProgress` either — `pointerFan` keeps computing in the background, and the priority ternary (`collapseTravel === null ? pointerFan : ...`) simply ignores its output while collapsing. `useStackShuffle` follows the exact same, already-proven pattern: no new `enabled` plumbing needed.

---

## Task 1: `combineTravel` and `travelForDepth` in `lib/fanProgress.ts`

**Files:**
- Modify: `lib/fanProgress.ts`
- Test: `lib/fanProgress.test.ts`

**Interfaces:**
- Consumes: `splitTravel` (existing, same file) — used by tests to construct round-trip inputs. `clamp01` (existing, same file, not exported) — reused internally.
- Produces:
  - `combineTravel(fanProgress: number, sweepProgress: number, fanSplit: number): number`
  - `travelForDepth(depth: number, sheetCount: number, fanSplit: number): number`

  Both consumed by Task 2 (`useStackShuffle`'s caller) and Task 6 (`app/page.tsx`).

- [ ] **Step 1: Write the failing tests**

Add to `lib/fanProgress.test.ts`, after the existing `splitTravel` describe block:

```ts
describe("combineTravel", () => {
  test("round-trips with splitTravel across the fan phase", () => {
    const { fanProgress, sweepProgress } = splitTravel(0.2, 0.45);
    expect(combineTravel(fanProgress, sweepProgress, 0.45)).toBeCloseTo(0.2);
  });

  test("round-trips with splitTravel across the sweep phase", () => {
    const { fanProgress, sweepProgress } = splitTravel(0.8, 0.45);
    expect(combineTravel(fanProgress, sweepProgress, 0.45)).toBeCloseTo(0.8);
  });

  test("round-trips exactly at the split", () => {
    const { fanProgress, sweepProgress } = splitTravel(0.45, 0.45);
    expect(combineTravel(fanProgress, sweepProgress, 0.45)).toBeCloseTo(0.45);
  });

  test("handles a fanSplit of 0 -- sweepProgress alone carries the travel", () => {
    const { fanProgress, sweepProgress } = splitTravel(0.5, 0);
    expect(combineTravel(fanProgress, sweepProgress, 0)).toBeCloseTo(0.5);
  });

  test("handles a fanSplit of 1 -- fanProgress alone carries the travel", () => {
    const { fanProgress, sweepProgress } = splitTravel(0.5, 1);
    expect(combineTravel(fanProgress, sweepProgress, 1)).toBeCloseTo(0.5);
  });

  test("a fully closed stack combines back to 0", () => {
    expect(combineTravel(0, 0, 0.45)).toBe(0);
  });
});

describe("travelForDepth", () => {
  test("the first case study's peak lands right at the fan/sweep split", () => {
    expect(travelForDepth(1, 6, 0.45)).toBeCloseTo(0.45);
  });

  test("the last case study's peak lands at full travel", () => {
    expect(travelForDepth(6, 6, 0.45)).toBeCloseTo(1);
  });

  test("a middle depth lands proportionally between the split and full travel", () => {
    // depth 3 of 6: sweepProgress = (3-1)/(6-1) = 0.4
    expect(travelForDepth(3, 6, 0.45)).toBeCloseTo(0.45 + 0.4 * 0.55);
  });

  test("falls back to a fully-fanned travel when there is only one sheet", () => {
    expect(travelForDepth(1, 1, 0.45)).toBe(0.45);
  });
});
```

Update the import at the top of `lib/fanProgress.test.ts`:

```ts
import {
  computeCursorTravel,
  computeScrollTravel,
  splitTravel,
  combineTravel,
  travelForDepth,
  FAN_THRESHOLD_PX,
} from "./fanProgress";
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx jest lib/fanProgress.test.ts`
Expected: FAIL — `combineTravel` and `travelForDepth` are not exported functions (TypeError / "is not a function").

- [ ] **Step 3: Implement**

Append to `lib/fanProgress.ts` (after `splitTravel`):

```ts
// The inverse of splitTravel: reconstructs the single travel scalar from
// the two phases it was split into. Used to start a scripted stack
// animation (see useStackShuffle) from wherever the stack actually is right
// now, rather than snapping to a fixed starting point.
export function combineTravel(
  fanProgress: number,
  sweepProgress: number,
  fanSplit: number
): number {
  if (sweepProgress > 0) return fanSplit + sweepProgress * (1 - fanSplit);
  return fanProgress * fanSplit;
}

// The travel value whose emphasis peak (see computeEmphasis in
// lib/fanSheet.ts) lands exactly on `depth` -- the inverse of that peak
// formula. depth is 1-indexed, matching PaperStack's own numbering (the
// hero is depth 0, and is never a valid target here).
export function travelForDepth(depth: number, sheetCount: number, fanSplit: number): number {
  if (sheetCount <= 1) return fanSplit;
  const sweepProgress = clamp01((depth - 1) / (sheetCount - 1));
  return fanSplit + sweepProgress * (1 - fanSplit);
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx jest lib/fanProgress.test.ts`
Expected: PASS, all tests in the file.

- [ ] **Step 5: Type-check and lint**

Run: `npx tsc --noEmit && npx eslint lib/fanProgress.ts lib/fanProgress.test.ts`
Expected: no output (clean).

- [ ] **Step 6: Commit**

```bash
git add lib/fanProgress.ts lib/fanProgress.test.ts
git commit -m "$(cat <<'EOF'
Add combineTravel/travelForDepth helpers for targeting a stack depth

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 2: `useStackShuffle` hook

**Files:**
- Create: `hooks/useStackShuffle.ts`
- Test: `hooks/useStackShuffle.test.ts`

**Interfaces:**
- Consumes: nothing from earlier tasks directly (uses only `performance.now`/`requestAnimationFrame`/`cancelAnimationFrame`).
- Produces:
  ```ts
  function useStackShuffle(openMs?: number, holdMs?: number): {
    travel: number | null;
    shuffleTo: (fromTravel: number, toTravel: number, onArrived: () => void) => void;
  }
  ```
  `openMs` defaults to `700`, `holdMs` defaults to `180`. Consumed by Task 6 (`app/page.tsx`).

- [ ] **Step 1: Write the failing tests**

Create `hooks/useStackShuffle.test.ts`:

```ts
import { act, renderHook } from "@testing-library/react";
import { useStackShuffle } from "./useStackShuffle";

let now = 0;
let pending: FrameRequestCallback | null = null;

// Frames are driven by hand rather than by a timer: the hook schedules the
// next frame from inside the current one, so anything self-driving spins
// forever (same reasoning as useStackCollapse.test.ts).
function frame(at: number) {
  now = at;
  const cb = pending;
  pending = null;
  act(() => {
    cb?.(at);
  });
}

beforeEach(() => {
  now = 0;
  pending = null;
  jest.spyOn(performance, "now").mockImplementation(() => now);
  jest.spyOn(window, "requestAnimationFrame").mockImplementation((cb) => {
    pending = cb;
    return 1;
  });
  jest.spyOn(window, "cancelAnimationFrame").mockImplementation(() => {
    pending = null;
  });
});
afterEach(() => jest.restoreAllMocks());

test("sits idle until a shuffle is triggered", () => {
  const { result } = renderHook(() => useStackShuffle(700, 180));
  expect(result.current.travel).toBeNull();
});

test("tweens travel from the starting value toward the target", () => {
  const { result } = renderHook(() => useStackShuffle(700, 180));
  act(() => {
    result.current.shuffleTo(0.1, 0.9, jest.fn());
  });

  frame(350); // halfway through the 700ms open
  expect(result.current.travel).toBeGreaterThan(0.1);
  expect(result.current.travel).toBeLessThan(0.9);

  frame(700); // open finished, now holding at the target
  expect(result.current.travel).toBe(0.9);
});

test("holds at the target for holdMs before arriving", () => {
  const onArrived = jest.fn();
  const { result } = renderHook(() => useStackShuffle(700, 180));
  act(() => {
    result.current.shuffleTo(0.1, 0.9, onArrived);
  });

  frame(700);
  expect(onArrived).not.toHaveBeenCalled();

  frame(700 + 179);
  expect(onArrived).not.toHaveBeenCalled();

  frame(700 + 180);
  expect(onArrived).toHaveBeenCalledTimes(1);
  expect(result.current.travel).toBe(0.9);
});

test("ignores a second trigger while a shuffle is already in flight", () => {
  const firstArrived = jest.fn();
  const secondArrived = jest.fn();
  const { result } = renderHook(() => useStackShuffle(700, 180));

  act(() => {
    result.current.shuffleTo(0, 1, firstArrived);
  });
  act(() => {
    result.current.shuffleTo(0, 0.2, secondArrived);
  });

  frame(880);
  expect(firstArrived).toHaveBeenCalledTimes(1);
  expect(secondArrived).not.toHaveBeenCalled();
  // Landed on the first target, not the ignored second one.
  expect(result.current.travel).toBe(1);
});

test("a fresh shuffle can be triggered again once the previous one has arrived", () => {
  const { result } = renderHook(() => useStackShuffle(700, 180));
  act(() => {
    result.current.shuffleTo(0, 0.5, jest.fn());
  });
  frame(880);

  const secondArrived = jest.fn();
  act(() => {
    result.current.shuffleTo(0.5, 0.9, secondArrived);
  });
  frame(880 + 880);
  expect(secondArrived).toHaveBeenCalledTimes(1);
  expect(result.current.travel).toBe(0.9);
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx jest hooks/useStackShuffle.test.ts`
Expected: FAIL — `Cannot find module './useStackShuffle'`.

- [ ] **Step 3: Implement**

Create `hooks/useStackShuffle.ts`:

```ts
"use client";

import { useEffect, useRef, useState } from "react";

// Drives the page-indicator's "find this case study in the stack, then lift
// it out" sequence: tweens the stack's travel value from wherever it
// currently sits to the value that reveals a target depth (see
// travelForDepth in lib/fanProgress.ts), holds there briefly so the found
// sheet actually registers, then hands back control via onArrived.
export function useStackShuffle(
  openMs: number = 700,
  holdMs: number = 180
): {
  travel: number | null;
  shuffleTo: (fromTravel: number, toTravel: number, onArrived: () => void) => void;
} {
  const [travel, setTravel] = useState<number | null>(null);
  const activeRef = useRef(false);
  const frameRef = useRef(0);

  useEffect(() => {
    return () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
    };
  }, []);

  function shuffleTo(fromTravel: number, toTravel: number, onArrived: () => void) {
    // A second dot click mid-shuffle is ignored until this one resolves.
    if (activeRef.current) return;
    activeRef.current = true;
    const start = performance.now();

    const step = (now: number) => {
      const elapsed = now - start;

      if (elapsed < openMs) {
        const t = elapsed / openMs;
        const eased = t * t * (3 - 2 * t);
        setTravel(fromTravel + (toTravel - fromTravel) * eased);
        frameRef.current = requestAnimationFrame(step);
        return;
      }

      if (elapsed < openMs + holdMs) {
        setTravel(toTravel);
        frameRef.current = requestAnimationFrame(step);
        return;
      }

      setTravel(toTravel);
      activeRef.current = false;
      onArrived();
    };

    frameRef.current = requestAnimationFrame(step);
  }

  return { travel, shuffleTo };
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx jest hooks/useStackShuffle.test.ts`
Expected: PASS, all 5 tests.

- [ ] **Step 5: Type-check and lint**

Run: `npx tsc --noEmit && npx eslint hooks/useStackShuffle.ts hooks/useStackShuffle.test.ts`
Expected: no output.

- [ ] **Step 6: Commit**

```bash
git add hooks/useStackShuffle.ts hooks/useStackShuffle.test.ts
git commit -m "$(cat <<'EOF'
Add useStackShuffle: tween the stack open to a depth, hold, then hand off

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 3: Generalize `useStackCollapse` to start from any travel value

**Files:**
- Modify: `hooks/useStackCollapse.ts`
- Modify: `hooks/useStackCollapse.test.ts`

**Interfaces:**
- Produces (signature changes from the current `useStackCollapse(durationMs?: number)`):
  ```ts
  function markReturningHome(slug: string): void
  function peekReturningFromSlug(): string | null   // new export
  function resetReturningHomeForTests(): void        // unchanged
  function useStackCollapse(startTravel: number, durationMs?: number): number | null
  ```
  `peekReturningFromSlug` and `useStackCollapse` are consumed by Task 6 (`app/page.tsx`). `markReturningHome` is consumed by Task 4 (`CaseStudyView.tsx`).

**A correctness note for the implementer:** `startTravel` must be captured once, at mount, via a ref -- not read fresh from the effect's dependency array. `app/page.tsx` will recompute its `startTravel` argument on every render (it reads a module-level flag that gets cleared once the hook's effect consumes it), so if the running effect depended on `startTravel` directly, it would see it change on the second render (from a real depth-based value down to a `1` fallback) and incorrectly restart the tween partway through. A ref captured on the first render only -- the same trick already used for `playing` -- avoids this. This is exercised by Step 1's "does not restart if the caller passes a different startTravel on a later render" test below.

- [ ] **Step 1: Write the failing tests**

Replace the full contents of `hooks/useStackCollapse.test.ts`:

```ts
import { StrictMode } from "react";
import { act, renderHook } from "@testing-library/react";
import {
  markReturningHome,
  resetReturningHomeForTests,
  useStackCollapse,
} from "./useStackCollapse";

let now = 0;
let pending: FrameRequestCallback | null = null;

// Frames are driven by hand rather than by a timer: the hook schedules the next
// frame from inside the current one, so anything self-driving spins forever.
function frame(at: number) {
  now = at;
  const cb = pending;
  pending = null;
  act(() => {
    cb?.(at);
  });
}

beforeEach(() => {
  now = 0;
  pending = null;
  resetReturningHomeForTests();
  jest.spyOn(performance, "now").mockImplementation(() => now);
  jest.spyOn(window, "requestAnimationFrame").mockImplementation((cb) => {
    pending = cb;
    return 1;
  });
  jest.spyOn(window, "cancelAnimationFrame").mockImplementation(() => {
    pending = null;
  });
});
afterEach(() => jest.restoreAllMocks());

test("stays out of the way on an ordinary first visit", () => {
  const { result } = renderHook(() => useStackCollapse(1, 700));
  // Nothing to replay: the pointer owns the stack from the start.
  expect(result.current).toBeNull();
});

test("starts at the given travel when the reader has just come back from a case study", () => {
  markReturningHome("spotify-jam");
  const { result } = renderHook(() => useStackCollapse(1, 700));
  expect(result.current).toBe(1);
});

test("starts at a lower travel for a case study nearer the top of the stack", () => {
  markReturningHome("spotify-jam");
  const { result } = renderHook(() => useStackCollapse(0.6, 700));
  expect(result.current).toBe(0.6);
});

test("collapses the stack shut and then hands control back", () => {
  markReturningHome("spotify-jam");
  const { result } = renderHook(() => useStackCollapse(1, 700));

  frame(350);
  expect(result.current).toBeLessThan(1);
  expect(result.current).toBeGreaterThan(0);

  frame(700);
  // Null, not 0: the pointer takes the stack back rather than being pinned
  // shut under a reader whose cursor is already low on the screen.
  expect(result.current).toBeNull();
});

test("a lower starting travel still collapses all the way to null, not just to 0", () => {
  markReturningHome("spotify-jam");
  const { result } = renderHook(() => useStackCollapse(0.6, 700));

  frame(350);
  expect(result.current).toBeLessThan(0.6);
  expect(result.current).toBeGreaterThan(0);

  frame(700);
  expect(result.current).toBeNull();
});

test("does not restart or retarget if the caller passes a different startTravel on a later render", () => {
  markReturningHome("spotify-jam");
  const { result, rerender } = renderHook(
    ({ startTravel }) => useStackCollapse(startTravel, 700),
    { initialProps: { startTravel: 0.6 } }
  );
  expect(result.current).toBe(0.6);

  // Simulates app/page.tsx recomputing its argument on a later render, after
  // the flag this hook reads has already been consumed.
  rerender({ startTravel: 1 });
  expect(result.current).toBe(0.6);

  frame(350);
  // Still easing down from 0.6, not from the later 1.
  expect(result.current).toBeLessThan(0.6);
});

test("only replays the collapse once per return", () => {
  markReturningHome("spotify-jam");
  renderHook(() => useStackCollapse(1, 700));
  const { result } = renderHook(() => useStackCollapse(1, 700));
  expect(result.current).toBeNull();
});

test("still collapses when React mounts the effect twice", () => {
  // Development remounts every component once. Consuming the flag inside the
  // effect meant the second run took the early return, the frame was never
  // rescheduled, and the stack sat frozen wide open.
  markReturningHome("spotify-jam");
  const { result } = renderHook(() => useStackCollapse(1, 700), {
    wrapper: StrictMode,
  });
  expect(result.current).toBe(1);

  frame(350);
  expect(result.current).toBeLessThan(1);

  frame(700);
  expect(result.current).toBeNull();
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx jest hooks/useStackCollapse.test.ts`
Expected: FAIL — `markReturningHome` called with an argument doesn't match the current no-arg signature (TypeScript compile error surfaced through ts-jest/Next's Jest transform), and `useStackCollapse(1, 700)` passes two arguments to a function that currently takes one.

- [ ] **Step 3: Implement**

Replace the full contents of `hooks/useStackCollapse.ts`:

```ts
"use client";

import { useEffect, useRef, useState } from "react";

// Set as a case study leaves for home, read once when home mounts. Module
// scope for the same reason the intro flag is: it survives a client-side
// navigation and dies with the page load, which is exactly the lifetime we
// want. Stores the slug, not a resolved depth or travel value, so this
// module stays free of any dependency on the case-study data itself --
// resolving the slug into a starting travel value is the caller's job (see
// app/page.tsx).
let returningFromSlug: string | null = null;

export function markReturningHome(slug: string): void {
  returningFromSlug = slug;
}

// Read-only: does not consume the flag. Lets a caller resolve the departing
// case study's own depth (and so its starting travel) before the hook
// itself later consumes and clears the flag inside its effect.
export function peekReturningFromSlug(): string | null {
  return returningFromSlug;
}

export function resetReturningHomeForTests(): void {
  returningFromSlug = null;
}

// The inverse of the way in. Arriving back from a case study, the stack
// starts fanned open to wherever that card actually was and folds shut into
// the resting page, so it is obvious they came up from underneath.
//
// Returns travel from `startTravel` down to 0, then null once the pointer
// should own the stack again -- null rather than 0, so a reader whose
// cursor is already low does not get the stack pinned shut under them.
export function useStackCollapse(startTravel: number, durationMs: number = 700): number | null {
  // Whether to play is settled from the flag during render, but the flag is
  // NOT consumed here: React may invoke a state initialiser more than once,
  // and clearing it in the first invocation would hide it from the second.
  const [playing] = useState(() => returningFromSlug !== null);
  // Captured once, at mount, not read fresh from the effect below: the
  // caller (app/page.tsx) recomputes its own startTravel argument on every
  // render by reading the same flag this hook consumes, so after the first
  // render it recomputes down to a fallback value. If the effect depended
  // on the live `startTravel` prop it would see that change and incorrectly
  // restart the tween partway through.
  const startTravelRef = useRef(startTravel);
  const [travel, setTravel] = useState<number | null>(() =>
    returningFromSlug !== null ? startTravelRef.current : null
  );

  useEffect(() => {
    if (!playing) return;
    // Consumed here, and the effect keys off `playing` rather than the flag,
    // so a remount (React runs mount effects twice in development) restarts
    // the animation instead of finding the flag already cleared and leaving
    // the stack frozen wide open.
    returningFromSlug = null;

    const committedStart = startTravelRef.current;
    let frame = 0;
    const start = performance.now();

    const step = (now: number) => {
      const t = Math.min(1, (now - start) / durationMs);
      if (t >= 1) {
        setTravel(null);
        return;
      }
      // Smoothstep, run backwards: quick through the middle, easing shut.
      // Scaled by the committed start rather than assuming it is always 1 --
      // a card near the top of the stack has less distance to close.
      setTravel(committedStart * (1 - t * t * (3 - 2 * t)));
      frame = requestAnimationFrame(step);
    };

    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [playing, durationMs]);

  return travel;
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx jest hooks/useStackCollapse.test.ts`
Expected: PASS, all 8 tests.

- [ ] **Step 5: Type-check and lint**

Run: `npx tsc --noEmit && npx eslint hooks/useStackCollapse.ts hooks/useStackCollapse.test.ts`
Expected: no output. (`startTravelRef.current` is read inside the effect and intentionally omitted from its dependency array; `react-hooks/exhaustive-deps` does not flag ref reads, so this should not produce a warning. If it does, do not add it to the deps array -- that would reintroduce the bug this ref exists to prevent. Confirm the warning is real before touching anything, per this project's established practice of verifying a lint rule's suggested fix isn't itself buggy.)

- [ ] **Step 6: Commit**

```bash
git add hooks/useStackCollapse.ts hooks/useStackCollapse.test.ts
git commit -m "$(cat <<'EOF'
Generalize useStackCollapse to start from any travel, not just 1

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 4: `CaseStudyView` passes its own slug when leaving

**Files:**
- Modify: `components/CaseStudyView.tsx:93`

**Interfaces:**
- Consumes: `markReturningHome(slug: string)` from Task 3.
- Produces: nothing new (internal call-site change only).

This is a one-line change with no new behavior to unit-test in isolation (the existing `CaseStudyView.test.tsx`, if any assertion currently checks that `markReturningHome` was called, needs updating to check the argument -- see Step 1).

- [ ] **Step 1: Check for and update any existing assertion on this call**

Run: `grep -n "markReturningHome" components/CaseStudyView.test.tsx`

If a match exists asserting `markReturningHome` was called (e.g. via a mock), update it to assert it was called with `caseStudy.slug` (using whatever `caseStudy` fixture that test renders `CaseStudyView` with). If no match exists, skip to Step 2 -- there is nothing to update.

- [ ] **Step 2: Make the change**

In `components/CaseStudyView.tsx`, change line 93 from:

```ts
    markReturningHome();
```

to:

```ts
    markReturningHome(caseStudy.slug);
```

(`caseStudy` is already the component's own prop, in scope at this line -- no new import needed.)

- [ ] **Step 3: Run the full suite**

Run: `npx jest`
Expected: PASS. (`components/CaseStudyView.test.tsx` does not currently assert on `markReturningHome`'s call, so this step should be a pure formality -- but run it to be sure.)

- [ ] **Step 4: Type-check and lint**

Run: `npx tsc --noEmit && npx eslint components/CaseStudyView.tsx`
Expected: no output.

- [ ] **Step 5: Commit**

```bash
git add components/CaseStudyView.tsx
git commit -m "$(cat <<'EOF'
Pass the departing case study's slug to markReturningHome

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 5: Thread `onJumpToCaseStudy` through `PaperStack` and `Hero`

**Files:**
- Modify: `components/Hero.tsx:108,144,375`
- Modify: `components/PaperStack.tsx:42,58,81`
- Test: `components/Hero.test.tsx`

**Interfaces:**
- Consumes: nothing from earlier tasks (pure prop-threading).
- Produces: a new optional prop on both components, `onJumpToCaseStudy?: (caseStudy: CaseStudy) => void`, consumed by Task 6 (`app/page.tsx`, which renders `<PaperStack onJumpToCaseStudy={...} />`).

**Why this task is safe to do before Task 6 exists:** `onJumpToCaseStudy` is optional and unused by any existing caller until Task 6 wires a real handler in; this task only proves the prop reaches `PageIndicator`'s `onSelect` instead of `onSelectCaseStudy`, and that direct sheet clicks (`CaseStudyPreview`, fed by the unchanged `onSelectCaseStudy`) are unaffected.

- [ ] **Step 1: Write the failing test**

Add to `components/Hero.test.tsx`, near the existing page-indicator tests:

```ts
test("routes the page indicator through onJumpToCaseStudy, not onSelectCaseStudy", () => {
  const onSelectCaseStudy = jest.fn();
  const onJumpToCaseStudy = jest.fn();
  render(
    <Hero
      playIntro={false}
      fanProgress={0}
      onSelectCaseStudy={onSelectCaseStudy}
      onJumpToCaseStudy={onJumpToCaseStudy}
    />
  );

  fireEvent.click(screen.getByRole("button", { name: caseStudies[0].title }));

  expect(onJumpToCaseStudy).toHaveBeenCalledWith(caseStudies[0]);
  expect(onSelectCaseStudy).not.toHaveBeenCalled();
});
```

Check the top of `components/Hero.test.tsx` for an existing `caseStudies` import; if `caseStudies` from `@/data/caseStudies` is not already imported there, add:

```ts
import { caseStudies } from "@/data/caseStudies";
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx jest components/Hero.test.tsx -t "routes the page indicator"`
Expected: FAIL — TypeScript error, `onJumpToCaseStudy` is not a valid prop on `Hero` (or, if TS errors don't block the Jest run in this project's config, a runtime failure because the click still calls `onSelectCaseStudy`).

- [ ] **Step 3: Implement**

In `components/Hero.tsx`, add to the props type (after line 108's `onSelectCaseStudy?: (caseStudy: CaseStudy) => void;`):

```ts
  // From the page-indicator rail specifically -- shuffles the stack open to
  // find the case study before lifting, rather than lifting immediately
  // from wherever the dot itself was clicked. Direct clicks on an
  // already-fanned sheet keep using onSelectCaseStudy, unchanged.
  onJumpToCaseStudy?: (caseStudy: CaseStudy) => void;
```

Add to the destructured props (after line 144's `onSelectCaseStudy,`):

```ts
  onJumpToCaseStudy,
```

Change line 375 from:

```tsx
        onSelect={onSelectCaseStudy}
```

to:

```tsx
        onSelect={onJumpToCaseStudy}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx jest components/Hero.test.tsx -t "routes the page indicator"`
Expected: PASS.

- [ ] **Step 5: Run the full Hero test file**

Run: `npx jest components/Hero.test.tsx`
Expected: PASS, all tests (existing tests that pass only `onSelectCaseStudy` to `Hero` and never interact with the page indicator are unaffected).

- [ ] **Step 6: Update `PaperStack.tsx`**

In `components/PaperStack.tsx`, add to `PaperStackProps` (after line 42's `onSelectCaseStudy?: (caseStudy: CaseStudy) => void;`):

```ts
  onJumpToCaseStudy?: (caseStudy: CaseStudy) => void;
```

Add to the destructured props (after line 58's `onSelectCaseStudy,`):

```ts
  onJumpToCaseStudy,
```

Change line 81 from:

```tsx
        <Hero playIntro={playIntro} suppressHeadlineHover={suppressHeadlineHover} onSelectCaseStudy={onSelectCaseStudy} fanProgress={fanProgress} liftPercent={heroLift} asciiConfig={asciiConfig} warpConfig={warpConfig} strokeConfig={strokeConfig} paperTextureConfig={paperTextureConfig} cutEffect={cutEffect} rgbConfig={rgbConfig} />
```

to:

```tsx
        <Hero playIntro={playIntro} suppressHeadlineHover={suppressHeadlineHover} onSelectCaseStudy={onSelectCaseStudy} onJumpToCaseStudy={onJumpToCaseStudy} fanProgress={fanProgress} liftPercent={heroLift} asciiConfig={asciiConfig} warpConfig={warpConfig} strokeConfig={strokeConfig} paperTextureConfig={paperTextureConfig} cutEffect={cutEffect} rgbConfig={rgbConfig} />
```

Leave line 105 (`CaseStudyPreview`'s `onSelect={onSelectCaseStudy}`) untouched.

- [ ] **Step 7: Run the full suite, type-check, lint**

Run: `npx jest && npx tsc --noEmit && npx eslint components/Hero.tsx components/Hero.test.tsx components/PaperStack.tsx`
Expected: full suite passes; no type or lint output.

- [ ] **Step 8: Commit**

```bash
git add components/Hero.tsx components/Hero.test.tsx components/PaperStack.tsx
git commit -m "$(cat <<'EOF'
Thread a separate onJumpToCaseStudy prop to the page-indicator rail

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 6: Wire the shuffle sequence and the depth-aware collapse into `app/page.tsx`

**Files:**
- Modify: `app/page.tsx`
- Test: `app/page.test.tsx`

**Interfaces:**
- Consumes:
  - `combineTravel`, `travelForDepth` from `@/lib/fanProgress` (Task 1)
  - `useStackShuffle` from `@/hooks/useStackShuffle` (Task 2)
  - `useStackCollapse(startTravel, durationMs?)`, `peekReturningFromSlug()` from `@/hooks/useStackCollapse` (Task 3)
  - `onJumpToCaseStudy` prop on `<PaperStack>` (Task 5)
- Produces: nothing consumed by a later task -- this is the final integration point.

- [ ] **Step 1: Write the failing tests**

In `app/page.test.tsx`, first update the existing test that calls `markReturningHome()` with no argument. Find:

```ts
test("opens fanned and folds shut when the reader has just come back", () => {
  // The pointer says the stack is closed; the return says it should start open
  // and collapse. The return has to win, or the fold is never seen.
  mockUseFanProgress.mockReturnValue({ fanProgress: 0, sweepProgress: 0 });
  markReturningHome();

  render(<HomePage />);
  const sheet = screen.getByTestId("paper-sheet-1");

  expect(sheet.style.bottom).not.toBe("0%");
  resetReturningHomeForTests();
});
```

Replace `markReturningHome();` with `markReturningHome(ABOUT_PAGE.slug);` (the last sheet in the stack, so `travelForDepth` resolves to exactly `1` -- the same value this test always exercised before, now reached through the new depth-aware path instead of a hardcoded default).

Then add two new tests, placed directly after it:

```ts
test("collapses a lighter distance when returning from a case study near the top of the stack", () => {
  mockUseFanProgress.mockReturnValue({ fanProgress: 0, sweepProgress: 0 });

  markReturningHome(caseStudies[0].slug);
  const { unmount } = render(<HomePage />);
  const shallowBottom = parseFloat(screen.getByTestId("paper-sheet-1").style.bottom);
  unmount();
  resetReturningHomeForTests();

  markReturningHome(ABOUT_PAGE.slug);
  render(<HomePage />);
  const fullBottom = parseFloat(screen.getByTestId("paper-sheet-1").style.bottom);
  resetReturningHomeForTests();

  expect(shallowBottom).toBeLessThan(fullBottom);
});

test("shuffles the stack open to a case study clicked in the page-indicator rail, then lifts from its real position", () => {
  jest.useFakeTimers();
  mockUseFanProgress.mockReturnValue({ fanProgress: 0, sweepProgress: 0 });
  render(<HomePage />);

  const target = caseStudies[1];
  const depth = caseStudies.findIndex((cs) => cs.slug === target.slug) + 1;
  const sheet = screen.getByTestId(`paper-sheet-${depth}`);
  jest.spyOn(sheet, "getBoundingClientRect").mockReturnValue({
    left: 100,
    top: 200,
    width: 300,
    height: 50,
    right: 400,
    bottom: 250,
  } as DOMRect);
  Object.defineProperty(window, "innerWidth", { value: 1000, configurable: true });
  Object.defineProperty(window, "innerHeight", { value: 1000, configurable: true });

  fireEvent.click(screen.getByRole("button", { name: target.title }));

  // Stepped in small increments: the shuffle's own rAF loop needs to
  // actually process each frame, not just have the clock skipped past it
  // (same lesson as Hero.test.tsx's cut-effect and reveal-beat tests).
  for (let elapsed = 0; elapsed < 700 + 180 + 50; elapsed += 50) {
    act(() => {
      jest.advanceTimersByTime(50);
    });
  }

  const overlay = screen.getByTestId("case-study-focus");
  expect(overlay).toHaveAttribute("data-variant", "lift");
  // Origin is the sheet's own centre (250/1000=25%, 225/1000=22.5%), not a
  // fixed click point.
  expect(overlay.style.getPropertyValue("--focus-x")).toBe("25%");
  expect(overlay.style.getPropertyValue("--focus-y")).toBe("22.5%");
  jest.useRealTimers();
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx jest app/page.test.tsx`
Expected: FAIL on all three touched/new tests -- `markReturningHome()` no longer compiles without an argument (breaks the whole file's compile in this project's ts-jest setup, so run this after Task 3 and Task 4 are already merged in; if running standalone before those, expect a TypeScript error instead of a runtime failure), and the two new tests fail because `app/page.tsx` has no page-indicator-driven shuffle yet (clicking the dot currently calls nothing -- `PageIndicator`'s `onSelect` is still wired to the same `liftCaseStudy` as a direct sheet click today, or, once Task 5 lands, to a not-yet-defined `onJumpToCaseStudy` handler that `app/page.tsx` doesn't pass yet).

- [ ] **Step 3: Implement**

In `app/page.tsx`, update the import block:

```ts
import { FAN_SMOOTHING_MS, FAN_SPLIT, FAN_THRESHOLD_PX, combineTravel, splitTravel, travelForDepth } from "@/lib/fanProgress";
```

```ts
import { peekReturningFromSlug, useStackCollapse } from "@/hooks/useStackCollapse";
```

```ts
import { useStackShuffle } from "@/hooks/useStackShuffle";
```

(The existing `import { useStackCollapse } from "@/hooks/useStackCollapse";` line gets replaced by the `peekReturningFromSlug` + `useStackCollapse` line above.)

Add this function above `export default function HomePage()`:

```ts
// Resolves the departing case study's own depth into the travel value
// useStackCollapse should start its collapse from -- the same numbering
// PaperStack itself uses ([...caseStudies, ABOUT_PAGE], 1-indexed).
function returningHomeStartTravel(fanSplit: number): number {
  const slug = peekReturningFromSlug();
  if (!slug) return 1;
  const allSheets = [...caseStudies, ABOUT_PAGE];
  const depth = allSheets.findIndex((cs) => cs.slug === slug) + 1;
  return depth > 0 ? travelForDepth(depth, allSheets.length, fanSplit) : 1;
}
```

Inside `HomePage`, change:

```ts
  const collapseTravel = useStackCollapse();
```

to:

```ts
  const collapseTravel = useStackCollapse(returningHomeStartTravel(fanSplit));
  const shuffle = useStackShuffle();
```

Change the fan/sweep derivation from:

```ts
  const { fanProgress, sweepProgress } =
    collapseTravel === null ? pointerFan : splitTravel(collapseTravel, fanSplit);
```

to:

```ts
  const { fanProgress, sweepProgress } =
    shuffle.travel !== null
      ? splitTravel(shuffle.travel, fanSplit)
      : collapseTravel === null
        ? pointerFan
        : splitTravel(collapseTravel, fanSplit);
```

Add this function alongside `liftCaseStudy` (after it, before the `return`):

```ts
  // Finds the case study's own sheet in the stack (shuffling it into view
  // if it isn't already), then lifts from that sheet's real position --
  // not wherever the page-indicator dot itself was clicked.
  function jumpToCaseStudy(caseStudy: CaseStudy) {
    const allSheets = [...caseStudies, ABOUT_PAGE];
    const depth = allSheets.findIndex((cs) => cs.slug === caseStudy.slug) + 1;
    if (depth <= 0) return;
    const fromTravel = combineTravel(fanProgress, sweepProgress, fanSplit);
    const toTravel = travelForDepth(depth, allSheets.length, fanSplit);
    shuffle.shuffleTo(fromTravel, toTravel, () => {
      const sheet = document.querySelector(`[data-testid="paper-sheet-${depth}"]`);
      const rect = sheet?.getBoundingClientRect();
      const origin = rect
        ? {
            xPercent: ((rect.left + rect.width / 2) / window.innerWidth) * 100,
            yPercent: ((rect.top + rect.height / 2) / window.innerHeight) * 100,
          }
        : focusOriginRef.current;
      liftCaseStudy(caseStudy, origin);
    });
  }
```

Update the `<PaperStack>` element:

```tsx
        <PaperStack
          playIntro={playIntro}
          fanProgress={fanProgress}
          sweepProgress={sweepProgress}
          config={activeConfig}
          transitionMs={transitionMs}
          asciiConfig={asciiConfig}
          warpConfig={warpConfig}
          strokeConfig={strokeConfig}
          paperTextureConfig={paperTextureConfig}
          cutEffect={cutEffect}
          rgbConfig={rgbConfig}
          suppressHeadlineHover={collapseTravel !== null || shuffle.travel !== null}
          onSelectCaseStudy={liftCaseStudy}
          onJumpToCaseStudy={jumpToCaseStudy}
        />
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx jest app/page.test.tsx`
Expected: PASS, all tests in the file.

- [ ] **Step 5: Run the full suite, type-check, lint**

Run: `npx jest && npx tsc --noEmit && npx eslint app/page.tsx app/page.test.tsx`
Expected: full suite passes; no type or lint output.

- [ ] **Step 6: Manual verification in the browser**

This task changes real click-driven animation timing that jsdom cannot render. With the dev server running (`npm run dev`):
1. Load the home page, wait for the intro to settle, and click a page-indicator dot for a case study in the middle of the stack. Confirm the stack visibly opens to that card, pauses briefly, then lifts into the case study -- not a zoom from the dot's own position in the rail.
2. From that case study, click Home. Confirm the stack starts the collapse animation already open to roughly where that card was (not fully fanned), then folds shut.
3. Click a case study near the top of the list from the rail, then leave it and come home again -- confirm the collapse this time is visibly shorter/lighter than step 2's.

Report back what you saw before moving on; this is not optional given jsdom cannot catch a regression here.

- [ ] **Step 7: Commit**

```bash
git add app/page.tsx app/page.test.tsx
git commit -m "$(cat <<'EOF'
Wire the shuffle-to-reveal sequence and depth-aware collapse into HomePage

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

## Final check

- [ ] Run `npx jest && npx tsc --noEmit && npx eslint .` one more time from the repo root and confirm a completely clean result.
- [ ] Update `handoff.md` with a dated entry summarizing what shipped (forward shuffle, reverse depth-aware collapse), matching this project's existing handoff-entry style -- see the entries already in that file for tone and structure.
- [ ] Do not push or otherwise publish anything without the user's explicit sign-off, per this project's standing rule (see Global Constraints).
