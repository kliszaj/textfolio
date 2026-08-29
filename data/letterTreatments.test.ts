import { letterTreatments, NAME } from "./letterTreatments";

test("has exactly one entry per letter position in NAME", () => {
  expect(letterTreatments).toHaveLength(NAME.length);
});

test("positions cover 0..N-1 exactly once", () => {
  const positions = letterTreatments.map((t) => t.position).sort((a, b) => a - b);
  expect(positions).toEqual(NAME.split("").map((_, i) => i));
});

test("letters match NAME in position order", () => {
  const orderedLetters = [...letterTreatments]
    .sort((a, b) => a.position - b.position)
    .map((t) => t.letter)
    .join("");
  expect(orderedLetters).toBe(NAME);
});

test("every bgColor is a valid hex color", () => {
  for (const t of letterTreatments) {
    expect(t.bgColor).toMatch(/^#[0-9A-Fa-f]{6}$/);
  }
});
