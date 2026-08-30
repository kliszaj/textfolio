import { ASCII_DEMO_TILT_MS } from "./asciiText";
import { DEFAULT_STROKE_TEXT_CONFIG, correctionSequenceMs } from "./strokeText";
import { WARP_DEMO_SWEEP_MS } from "./warpText";
import {
  HEADLINE_HANDOVER_MS,
  HEADLINE_INTRO_BOUNDARIES_MS,
  HEADLINE_INTRO_DURATION_MS,
  HEADLINE_INTRO_STEPS,
  handoverOpacityAt,
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
  expect(introStateAt(HEADLINE_INTRO_DURATION_MS + HEADLINE_HANDOVER_MS)).toEqual({
    phase: "final",
    opacity: 1,
    done: true,
  });
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

describe("handing over between stages", () => {
  test("the headline is invisible exactly on each boundary", () => {
    // The treatment is swapped there, so the mount must not be seen.
    for (const boundary of HEADLINE_INTRO_BOUNDARIES_MS) {
      expect(handoverOpacityAt(boundary)).toBe(0);
    }
  });

  test("it is fully visible in the middle of a stage", () => {
    const [, sketchEnd, asciiEnd] = HEADLINE_INTRO_BOUNDARIES_MS;
    expect(handoverOpacityAt(sketchEnd / 2)).toBe(1);
    expect(handoverOpacityAt((sketchEnd + asciiEnd) / 2)).toBe(1);
  });

  test("it eases rather than cutting", () => {
    const [, boundary] = HEADLINE_INTRO_BOUNDARIES_MS;
    const before = handoverOpacityAt(boundary - HEADLINE_HANDOVER_MS / 4);
    expect(before).toBeGreaterThan(0);
    expect(before).toBeLessThan(1);
  });

  test("the page fades in rather than appearing", () => {
    expect(handoverOpacityAt(0)).toBe(0);
    expect(handoverOpacityAt(HEADLINE_HANDOVER_MS / 2)).toBe(1);
  });

  test("the story is not over until the last fade-in finishes", () => {
    // Otherwise the finished treatment would arrive in a hard cut of its own.
    expect(introStateAt(HEADLINE_INTRO_DURATION_MS).done).toBe(false);
    expect(introStateAt(HEADLINE_INTRO_DURATION_MS).phase).toBe("final");
  });
});

describe("the sketch stage holds its correction", () => {
  test("the red pen finishes before the treatment hands over", () => {
    // Otherwise the loop and the X are still drawing when the stage ends, and
    // the correction is never actually seen.
    const sketch = HEADLINE_INTRO_STEPS.find((step) => step.phase === "sketch")!;
    const correction = correctionSequenceMs(
      DEFAULT_STROKE_TEXT_CONFIG.drawDuration,
      DEFAULT_STROKE_TEXT_CONFIG.stagger,
      6
    );
    expect(correction).toBeLessThan(sketch.durationMs);
    expect(sketch.durationMs - correction).toBeGreaterThanOrEqual(300);
  });
});
