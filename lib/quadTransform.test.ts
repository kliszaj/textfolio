import { quadTransform, type Point } from "./quadTransform";

// Where a matrix3d sends a point of the box, as the browser would.
function apply(css: string, x: number, y: number): Point {
  const m = css.slice("matrix3d(".length, -1).split(",").map(Number);
  const w = m[3] * x + m[7] * y + m[15];
  return { x: (m[0] * x + m[4] * y + m[12]) / w, y: (m[1] * x + m[5] * y + m[13]) / w };
}

function expectNear(actual: Point, expected: Point) {
  expect(actual.x).toBeCloseTo(expected.x, 6);
  expect(actual.y).toBeCloseTo(expected.y, 6);
}

test("lands each corner of the box on its corner of the quad", () => {
  const quad: [Point, Point, Point, Point] = [
    { x: 410, y: 160 },
    { x: 960, y: 190 },
    { x: 930, y: 400 },
    { x: 440, y: 360 },
  ];
  const css = quadTransform(1536, 600, quad);
  expectNear(apply(css, 0, 0), quad[0]);
  expectNear(apply(css, 1536, 0), quad[1]);
  expectNear(apply(css, 1536, 600), quad[2]);
  expectNear(apply(css, 0, 600), quad[3]);
});

test("is a plain scale and move for a rectangle", () => {
  const css = quadTransform(200, 100, [
    { x: 10, y: 20 },
    { x: 110, y: 20 },
    { x: 110, y: 70 },
    { x: 10, y: 70 },
  ]);
  expect(css).toBe("matrix3d(0.5,0,0,0,0,0.5,0,0,0,0,1,0,10,20,0,1)");
});
