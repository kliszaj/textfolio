import { sketchBackgroundPosition, sketchMarkTransform } from "./paperTexture";

test("moves the sketch texture with the lifted headline", () => {
  expect(sketchBackgroundPosition(0)).toBe("0px calc(0px - 0vh)");
  expect(sketchBackgroundPosition(12.5)).toBe("0px calc(0px - 12.5vh)");
  expect(sketchBackgroundPosition(Number.NaN)).toBe("0px calc(0px - 0vh)");
});

test("carries a corner mark up with the same lift, on top of its own tilt", () => {
  // The cool-S and lightning bolt are drawn in the corners of the same sheet
  // of paper the headline sits on. Without this they read as stickers on the
  // glass, floating in place while the page itself rises to reveal the case
  // studies beneath it.
  expect(sketchMarkTransform(0, 15)).toBe("translateY(calc(0px - 0vh)) rotate(15deg)");
  expect(sketchMarkTransform(12.5, -6)).toBe("translateY(calc(0px - 12.5vh)) rotate(-6deg)");
  expect(sketchMarkTransform(Number.NaN, 15)).toBe("translateY(calc(0px - 0vh)) rotate(15deg)");
});
