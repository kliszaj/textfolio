import { sketchBackgroundPosition } from "./paperTexture";

test("moves the sketch texture with the lifted headline", () => {
  expect(sketchBackgroundPosition(0)).toBe("0px calc(0px - 0vh)");
  expect(sketchBackgroundPosition(12.5)).toBe("0px calc(0px - 12.5vh)");
  expect(sketchBackgroundPosition(Number.NaN)).toBe("0px calc(0px - 0vh)");
});
