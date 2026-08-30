import {
  ASCII_TYPE_SHARE,
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

test("settles on the finished treatment and stays there", () => {
  expect(introStateAt(HEADLINE_INTRO_DURATION_MS)).toEqual({
    phase: "final",
    revealFraction: 1,
    done: true,
  });
  expect(introStateAt(HEADLINE_INTRO_DURATION_MS * 10).done).toBe(true);
});

test("only the ascii step is partly revealed; the others are whole", () => {
  expect(introStateAt(0).revealFraction).toBe(1);
  expect(introStateAt(sketch.durationMs).revealFraction).toBe(0);
  expect(introStateAt(HEADLINE_INTRO_DURATION_MS).revealFraction).toBe(1);
});

test("the characters type in and then hold, rather than typing to the last moment", () => {
  const typedBy = sketch.durationMs + ascii.durationMs * ASCII_TYPE_SHARE;
  expect(introStateAt(typedBy).revealFraction).toBeCloseTo(1, 5);
  // Still ascii, fully typed, holding before the handover.
  const holding = introStateAt(typedBy + (ascii.durationMs * (1 - ASCII_TYPE_SHARE)) / 2);
  expect(holding.phase).toBe("ascii");
  expect(holding.revealFraction).toBe(1);
});

test("the reveal only ever grows while typing", () => {
  let previous = -1;
  for (let t = sketch.durationMs; t < HEADLINE_INTRO_DURATION_MS; t += 25) {
    const reveal = introStateAt(t).revealFraction;
    expect(reveal).toBeGreaterThanOrEqual(previous);
    previous = reveal;
  }
});

test("the phases run forwards only, never back a step", () => {
  const order = ["sketch", "ascii", "final"];
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
