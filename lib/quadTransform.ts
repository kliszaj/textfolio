// The CSS transform that lays a w x h box onto a four-cornered shape on the
// page: a projective map (a homography), written as one flat matrix3d with
// transform-origin 0 0. A rectangle in a 3D scene projects to exactly such a
// map, so this puts HTML on a 3D surface without nesting perspective and
// preserve-3d, which Safari places wrongly at the scales a desk scene uses.

export type Point = { x: number; y: number };

// Corners clockwise from the top left: where the box's own top left, top
// right, bottom right and bottom left land.
export function quadTransform(w: number, h: number, [p0, p1, p2, p3]: [Point, Point, Point, Point]): string {
  // The unit square onto the quad (Heckbert's square-to-quad).
  const dx1 = p1.x - p2.x;
  const dx2 = p3.x - p2.x;
  const dx3 = p0.x - p1.x + p2.x - p3.x;
  const dy1 = p1.y - p2.y;
  const dy2 = p3.y - p2.y;
  const dy3 = p0.y - p1.y + p2.y - p3.y;
  let g = 0;
  let k = 0;
  if (dx3 !== 0 || dy3 !== 0) {
    const det = dx1 * dy2 - dx2 * dy1;
    g = (dx3 * dy2 - dx2 * dy3) / det;
    k = (dx1 * dy3 - dx3 * dy1) / det;
  }
  const a = p1.x - p0.x + g * p1.x;
  const b = p3.x - p0.x + k * p3.x;
  const d = p1.y - p0.y + g * p1.y;
  const e = p3.y - p0.y + k * p3.y;
  // The box onto the unit square first: its x over w, its y over h. matrix3d
  // takes columns: x's coefficients, y's, z's, then the translation.
  const m = [a / w, d / w, 0, g / w, b / h, e / h, 0, k / h, 0, 0, 1, 0, p0.x, p0.y, 0, 1];
  return `matrix3d(${m.join(",")})`;
}
