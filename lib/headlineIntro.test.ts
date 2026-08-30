import { ASCII_DEMO_TILT_MS } from "./asciiText";
import { WARP_DEMO_SWEEP_MS } from "./warpText";
import {
  HEADLINE_INTRO_DURATION_MS,
  HEADLINE_INTRO_STEPS,
  introStateAt,
} from "./headlineIntro";

const [sketch, ascii] = HEADLINE_INTRO_STEPS;

test("opens on the sketch, the first step of the story", () => {
  expect(introStateAt(0).phase).toBe("sketch");
  expect(introStateAt(sketch.durationMs - 1).phase).toBe("sketch");
});

test("hands over to the ascii prototype once the sketch has drawn", () => {
  expect(introStateAt(sketch.durationMs).phase).toBe("ascii");
});

test("warps into shape after the ascii prototype", () => {
  expect(introStateAt(sketch.durationMs + ascii.durationMs).phase).toBe("warp");
});

test("runs all four stages of the story", () => {
  const seen = new Set<string>();
  for (let t = 0; t <= HEADLINE_INTRO_DURATION_MS + 100; t += 25) {
    seen.add(introStateAt(t).phase);
  }
  expect([...seen]).toEqual(["sketch", "ascii", "warp", "final"]);
});

test("settles on the finished treatment and stays there", () => {
  expect(introStateAt(HEADLINE_INTRO_DURATION_MS)).toEqual({ phase: "final", done: true });
  expect(introStateAt(HEADLINE_INTRO_DURATION_MS * 10).done).toBe(true);
});




test("the phases run forwards only, never back a step", () => {
  const order = ["sketch", "ascii", "warp", "final"];
  let previous = 0;
  for (let t = 0; t <= HEADLINE_INTRO_DURATION_MS + 500; t += 50) {
    const index = order.indexOf(introStateAt(t).phase);
    expect(index).toBeGreaterThanOrEqual(previous);
    previous = index;
  }
});

test("survives nonsense elapsed values", () => {
  expect(introStateAt(-500).phase).toBe("sketch");
  expect(introStateAt(NaN).phase).toBe("sketch");
});

describe("the sweeps fit the stages that hold them", () => {
  // A sweep cut off by its handover leaves the headline mid-lean, so each one
  // has to finish with room to settle before the next stage takes over.
  const stage = (phase: string) =>
    HEADLINE_INTRO_STEPS.find((step) => step.phase === phase)!.durationMs;

  test("the ascii tilt sweep finishes inside the ascii stage", () => {
    expect(ASCII_DEMO_TILT_MS).toBeLessThan(stage("ascii"));
  });

  test("the warp pointer sweep finishes inside the warp stage", () => {
    expect(WARP_DEMO_SWEEP_MS).toBeLessThan(stage("warp"));
  });

  test("each sweep leaves a beat to settle, not just a millisecond", () => {
    expect(stage("ascii") - ASCII_DEMO_TILT_MS).toBeGreaterThanOrEqual(300);
    expect(stage("warp") - WARP_DEMO_SWEEP_MS).toBeGreaterThanOrEqual(300);
  });
});
