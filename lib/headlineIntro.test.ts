import {
  ASCII_INTRO_DEMO_MS,
  ASCII_INTRO_DURATION_MS,
  DEFAULT_INTRO_DURATION_MS,
  HEADLINE_HANDOVER_MS,
  HEADLINE_INTRO_DEMO_MS,
  HEADLINE_INTRO_BOUNDARIES_MS,
  HEADLINE_INTRO_DURATION_MS,
  HEADLINE_INTRO_STEPS,
  HEADLINE_TREATMENT_DURATION_MS,
  glitchFlicker,
  handoverOpacityAt,
  introStateAt,
} from "./headlineIntro";

const [defaultStep, sketch, ascii, warp] = HEADLINE_INTRO_STEPS;

test("opens on the plain resting treatment, briefly, before the flip-through starts", () => {
  expect(introStateAt(0).phase).toBe("default");
  expect(introStateAt(defaultStep.durationMs - 1).phase).toBe("default");
});

test("hands over to the sketch once the opening beat has passed", () => {
  expect(introStateAt(defaultStep.durationMs).phase).toBe("sketch");
});

test("hands over to ascii once the sketch has had its turn", () => {
  expect(introStateAt(defaultStep.durationMs + sketch.durationMs).phase).toBe("ascii");
});

test("hands over to warp once ascii has had its turn", () => {
  expect(
    introStateAt(defaultStep.durationMs + sketch.durationMs + ascii.durationMs).phase
  ).toBe("warp");
});

test("runs all five stages of the flip-through", () => {
  const seen = new Set<string>();
  for (let t = 0; t <= HEADLINE_INTRO_DURATION_MS + 100; t += 10) {
    seen.add(introStateAt(t).phase);
  }
  expect([...seen]).toEqual(["default", "sketch", "ascii", "warp", "final"]);
});

test("settles back on the plain resting treatment and stays there", () => {
  expect(introStateAt(HEADLINE_INTRO_DURATION_MS + HEADLINE_HANDOVER_MS)).toEqual({
    phase: "final",
    phaseProgress: 1,
    opacity: 1,
    done: true,
  });
  expect(introStateAt(HEADLINE_INTRO_DURATION_MS * 10).done).toBe(true);
});

test("the phases run forwards only, never back a step", () => {
  const order = ["default", "sketch", "ascii", "warp", "final"];
  let previous = 0;
  for (let t = 0; t <= HEADLINE_INTRO_DURATION_MS + 500; t += 50) {
    const index = order.indexOf(introStateAt(t).phase);
    expect(index).toBeGreaterThanOrEqual(previous);
    previous = index;
  }
});

test("survives nonsense elapsed values", () => {
  expect(introStateAt(-500).phase).toBe("default");
  expect(introStateAt(NaN).phase).toBe("default");
});

describe("sketch shows the finished, corrected word -- no draw-in", () => {
  // Unlike ascii and warp, sketch's whole appeal is the finished hand-inked
  // look. A still frame shows that off just as well as watching it arrive,
  // in a fraction of the time -- so, unlike the other two, it carries no
  // demo-motion constant of its own here. (Hero renders it with
  // animate={false} during this phase; that's a StrokeText concern, not a
  // timing one, so there's nothing to pin in this file.)
  test("gets the same beat as ascii and warp", () => {
    expect(sketch.durationMs).toBe(HEADLINE_TREATMENT_DURATION_MS);
  });
});

describe("ascii and warp keep a small scripted motion, since they need it to read", () => {
  test("every treatment gets the same beat", () => {
    expect(sketch.durationMs).toBe(HEADLINE_TREATMENT_DURATION_MS);
    expect(warp.durationMs).toBe(HEADLINE_TREATMENT_DURATION_MS);
    expect(ascii.durationMs).toBe(ASCII_INTRO_DURATION_MS);
    expect(ASCII_INTRO_DURATION_MS).toBe(HEADLINE_TREATMENT_DURATION_MS);
  });

  test("the demo motions extend to the handover, not the whole stage", () => {
    expect(HEADLINE_INTRO_DEMO_MS).toBe(
      HEADLINE_TREATMENT_DURATION_MS - HEADLINE_HANDOVER_MS / 2
    );
    // With HEADLINE_HANDOVER_MS at 0 right now, the demo runs the full
    // stage -- there's no outgoing fade left to end before. Still holds as
    // an equality at zero handover and a strict "less than" at any nonzero
    // one, so this stays true either way that constant gets tuned.
    expect(HEADLINE_INTRO_DEMO_MS).toBeLessThanOrEqual(warp.durationMs);
    expect(ASCII_INTRO_DEMO_MS).toBeLessThanOrEqual(ascii.durationMs);
  });
});

describe("glitchFlicker -- the shape of the fade, independent of whether it's in use", () => {
  // Pinned directly against `t` rather than through handoverOpacityAt, so
  // this stays meaningful regardless of what HEADLINE_HANDOVER_MS is
  // currently set to (0 right now bypasses handoverOpacityAt's use of this
  // entirely -- see the hard-cut tests below).
  test("lands exactly at 0 at the start and exactly at 1 at the end", () => {
    expect(glitchFlicker(0)).toBe(0);
    expect(glitchFlicker(1)).toBe(1);
  });

  test("clamps outside its 0-1 domain rather than extrapolating the oscillation", () => {
    expect(glitchFlicker(-5)).toBe(0);
    expect(glitchFlicker(50)).toBe(1);
  });

  test("flickers rather than dissolving smoothly -- a stutter, not a crossfade", () => {
    // A plain ease is monotonic; the glitch deliberately is not -- it dips
    // back down at least once on the way from 0 to 1.
    const samples = [];
    for (let t = 0; t <= 1; t += 1 / 80) samples.push(glitchFlicker(t));
    let sawIncrease = false;
    let sawDecreaseAfterIncrease = false;
    for (let i = 1; i < samples.length; i += 1) {
      if (samples[i] > samples[i - 1]) sawIncrease = true;
      if (sawIncrease && samples[i] < samples[i - 1]) sawDecreaseAfterIncrease = true;
    }
    expect(sawDecreaseAfterIncrease).toBe(true);
  });

  test("never leaves its 0-1 range mid-flicker", () => {
    for (let t = 0; t <= 1; t += 1 / 80) {
      expect(glitchFlicker(t)).toBeGreaterThanOrEqual(0);
      expect(glitchFlicker(t)).toBeLessThanOrEqual(1);
    }
  });
});

describe("handing over between stages -- a hard cut, per direct request", () => {
  // HEADLINE_HANDOVER_MS is 0: no crossfade, no flicker, nothing dipping to
  // hide a swap -- the flip-through should read as flashing by. See the
  // constant's own comment for the trade-off this accepts (ascii and sketch
  // fully mount on every swap, unlike warp, and have nothing hiding that any
  // more).
  test("is always fully visible, including exactly on a boundary", () => {
    for (const boundary of HEADLINE_INTRO_BOUNDARIES_MS) {
      expect(handoverOpacityAt(boundary)).toBe(1);
    }
    expect(handoverOpacityAt(0)).toBe(1);
    const [, defaultEnd] = HEADLINE_INTRO_BOUNDARIES_MS;
    expect(handoverOpacityAt(defaultEnd / 2)).toBe(1);
  });

  test("the story is over exactly at the total duration -- no extra fade-in wait", () => {
    // There is no fade left to finish, unlike the old design, where "done"
    // waited an extra half-handover past the last boundary for the final
    // fade-in to complete.
    expect(introStateAt(HEADLINE_INTRO_DURATION_MS).done).toBe(true);
    expect(introStateAt(HEADLINE_INTRO_DURATION_MS).phase).toBe("final");
  });
});

test("runs the whole flip-through in well under the old nine-second story", () => {
  // A quick reel proving the range exists, not a narrative watching it
  // arrive -- the exact beat lengths have already moved once since this was
  // first built (leaner immediately after landing, then lengthened again on
  // request), so this pins the composition, not a specific total.
  expect(HEADLINE_INTRO_DURATION_MS).toBe(
    DEFAULT_INTRO_DURATION_MS + HEADLINE_TREATMENT_DURATION_MS * 3
  );
  expect(HEADLINE_INTRO_DURATION_MS).toBeLessThan(6000);
});
