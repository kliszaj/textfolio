import {
  computeEmphasis,
  computeReveal,
  computeBandThickness,
  computeSheetInset,
} from "./fanSheet";
import type { FanSheetConfig } from "./fanSheet";

const SHEET_COUNT = 3;

const baseConfig: FanSheetConfig = {
  mechanic: "bottom",
  bandPercents: [4, 4, 4],
  emphasisBonusPercent: 8,
  emphasisFalloff: 1.5,
  revealLeadSheets: 1.5,
  tiltStepDegrees: -1.5,
  maxTiltDegrees: 6,
  brightnessFalloff: 0.05,
};

describe("computeEmphasis", () => {
  test("the peak sits on the first case study at the start of the sweep", () => {
    expect(computeEmphasis(1, 0, SHEET_COUNT, 1.5)).toBe(1);
    expect(computeEmphasis(2, 0, SHEET_COUNT, 1.5)).toBeCloseTo(0.259, 3);
    expect(computeEmphasis(3, 0, SHEET_COUNT, 1.5)).toBe(0);
  });

  test("the peak sits on the last case study at the end of the sweep", () => {
    expect(computeEmphasis(1, 1, SHEET_COUNT, 1.5)).toBe(0);
    expect(computeEmphasis(2, 1, SHEET_COUNT, 1.5)).toBeCloseTo(0.259, 3);
    expect(computeEmphasis(3, 1, SHEET_COUNT, 1.5)).toBe(1);
  });

  test("the peak glides to the middle sheet halfway through the sweep", () => {
    expect(computeEmphasis(2, 0.5, SHEET_COUNT, 1.5)).toBe(1);
    expect(computeEmphasis(1, 0.5, SHEET_COUNT, 1.5)).toBeCloseTo(0.259, 3);
    expect(computeEmphasis(3, 0.5, SHEET_COUNT, 1.5)).toBeCloseTo(0.259, 3);
  });

  test("the hero is never emphasized", () => {
    expect(computeEmphasis(0, 0, SHEET_COUNT, 1.5)).toBe(0);
    expect(computeEmphasis(0, 0.5, SHEET_COUNT, 1.5)).toBe(0);
    expect(computeEmphasis(0, 1, SHEET_COUNT, 1.5)).toBe(0);
  });

  test("a tighter falloff isolates the peak to a single sheet", () => {
    expect(computeEmphasis(1, 0, SHEET_COUNT, 1)).toBe(1);
    expect(computeEmphasis(2, 0, SHEET_COUNT, 1)).toBe(0);
  });

  test("a wider falloff spreads emphasis across the whole stack", () => {
    expect(computeEmphasis(3, 0, SHEET_COUNT, 3)).toBeCloseTo(0.259, 3);
  });

  test("a single case study holds the peak for the whole sweep", () => {
    expect(computeEmphasis(1, 0, 1, 1.5)).toBe(1);
    expect(computeEmphasis(1, 1, 1, 1.5)).toBe(1);
  });
});

describe("computeBandThickness", () => {
  test("a sheet's band is its base thickness plus its share of the emphasis bonus", () => {
    // sweep 0 -> sheet 1 at full weight: 4 + 1 * 8
    expect(computeBandThickness(1, 1, 0, baseConfig, SHEET_COUNT)).toBeCloseTo(12);
    // sheet 2 is only 0.259 revealed this early: (4 + 0.259 * 8) * 0.259
    expect(computeBandThickness(2, 1, 0, baseConfig, SHEET_COUNT)).toBeCloseTo(1.575, 2);
    // sheet 3 has not been reached by the reveal yet
    expect(computeBandThickness(3, 1, 0, baseConfig, SHEET_COUNT)).toBe(0);
  });

  test("every band collapses to nothing when the fan is closed", () => {
    expect(computeBandThickness(1, 0, 0, baseConfig, SHEET_COUNT)).toBe(0);
    expect(computeBandThickness(3, 0, 1, baseConfig, SHEET_COUNT)).toBe(0);
  });

  test("bands scale linearly with fanProgress", () => {
    expect(computeBandThickness(1, 0.5, 0, baseConfig, SHEET_COUNT)).toBeCloseTo(6);
  });
});

describe("computeSheetInset", () => {
  test("the backmost sheet stays flush against the bottom edge", () => {
    const inset = computeSheetInset(SHEET_COUNT, 1, 0, baseConfig, SHEET_COUNT);
    expect(inset.bottom).toBe(0);
  });

  test("each sheet's bottom inset is the sum of the bands behind it", () => {
    // bands at sweep 0: [12, 1.575, 0] -- the stack has only opened as far as
    // the cursor has travelled
    expect(computeSheetInset(2, 1, 0, baseConfig, SHEET_COUNT).bottom).toBe(0);
    expect(computeSheetInset(1, 1, 0, baseConfig, SHEET_COUNT).bottom).toBeCloseTo(1.575, 2);
    expect(computeSheetInset(0, 1, 0, baseConfig, SHEET_COUNT).bottom).toBeCloseTo(13.575, 2);
  });

  test("the hero lifts further as the emphasised sheet claims more room", () => {
    const closed = computeSheetInset(0, 1, 0, { ...baseConfig, emphasisBonusPercent: 0 }, SHEET_COUNT);
    const open = computeSheetInset(0, 1, 0, baseConfig, SHEET_COUNT);
    expect(open.bottom).toBeGreaterThan(closed.bottom);
  });

  test("fanProgress 0 collapses every sheet flush", () => {
    expect(computeSheetInset(0, 0, 0, baseConfig, SHEET_COUNT).bottom).toBe(0);
    expect(computeSheetInset(3, 0, 0, baseConfig, SHEET_COUNT).bottom).toBe(0);
  });

  test("corner mechanic splits the inset across both axes evenly", () => {
    const config: FanSheetConfig = { ...baseConfig, mechanic: "corner" };
    const inset = computeSheetInset(0, 1, 0, config, SHEET_COUNT);
    expect(inset.bottom).toBeCloseTo(6.787, 2);
    expect(inset.right).toBeCloseTo(6.787, 2);
  });

  test("the hero tilts along with the rest of the stack", () => {
    // depth 0 is a sheet like any other, one tilt step in
    expect(computeSheetInset(0, 1, 0, baseConfig, SHEET_COUNT).rotate).toBeCloseTo(-1.5);
  });

  test("tilt deepens by one step per sheet once the stack is fully fanned", () => {
    expect(computeSheetInset(1, 1, 1, baseConfig, SHEET_COUNT).rotate).toBeCloseTo(-3);
    expect(computeSheetInset(2, 1, 1, baseConfig, SHEET_COUNT).rotate).toBeCloseTo(-4.5);
  });

  test("deeper sheets stay square until the sweep travels down to them", () => {
    // The stack must not snap to its fanned angles the moment the cursor
    // reaches the first case study.
    const early = computeSheetInset(2, 1, 0, baseConfig, SHEET_COUNT).rotate;
    const settled = computeSheetInset(2, 1, 1, baseConfig, SHEET_COUNT).rotate;
    expect(Math.abs(early)).toBeLessThan(Math.abs(settled) / 2);
    expect(early).toBeCloseTo(-1.167, 2);
  });

  test("tilt opens smoothly with the fan and is flat when closed", () => {
    expect(computeSheetInset(2, 0, 1, baseConfig, SHEET_COUNT).rotate).toBeCloseTo(0);
    expect(computeSheetInset(2, 1, 1, baseConfig, SHEET_COUNT).rotate).toBeCloseTo(-4.5);
    expect(computeSheetInset(2, 0.5, 1, baseConfig, SHEET_COUNT).rotate).toBeCloseTo(-2.25);
  });

  test("the backmost sheet is a fixed base: it never tilts and never moves", () => {
    // It is the surface the rest of the stack is dealt onto, so it stays
    // square to the viewport and no gap can open behind the stack.
    for (const [fan, sweep] of [[0, 0], [0.5, 0], [1, 0], [1, 0.5], [1, 1]]) {
      const inset = computeSheetInset(SHEET_COUNT, fan, sweep, baseConfig, SHEET_COUNT);
      expect(inset.rotate).toBe(0);
      expect(inset.bottom).toBe(0);
      expect(inset.right).toBe(0);
    }
  });

  test("tilt only ever deepens as the sweep advances, never rocking back", () => {
    // A sheet that turned one way and then back as the peak crossed it would
    // read as a see-saw. Each sheet turns in a single direction only.
    const angles = [0, 0.2, 0.4, 0.6, 0.8, 1].map(
      (sweep) => computeSheetInset(2, 1, sweep, baseConfig, SHEET_COUNT).rotate
    );
    for (let i = 1; i < angles.length; i++) {
      expect(angles[i]).toBeLessThanOrEqual(angles[i - 1]);
    }
    expect(angles[angles.length - 1]).toBeCloseTo(-4.5);
  });

  test("an emphasised sheet brightens to full as its weight rises", () => {
    // depth 3 unemphasized: 1 - 3 * 0.05
    expect(computeSheetInset(3, 1, 0, baseConfig, SHEET_COUNT).brightness).toBeCloseTo(0.85);
    expect(computeSheetInset(3, 1, 1, baseConfig, SHEET_COUNT).brightness).toBeCloseTo(1);
  });

  test("brightness still dims progressively with depth when nothing is emphasised", () => {
    const flat: FanSheetConfig = { ...baseConfig, emphasisFalloff: 0.0001 };
    expect(computeSheetInset(1, 1, 1, flat, SHEET_COUNT).brightness).toBeCloseTo(0.95);
    expect(computeSheetInset(2, 1, 1, flat, SHEET_COUNT).brightness).toBeCloseTo(0.9);
  });

  test("reports the sheet's emphasis weight alongside its geometry", () => {
    expect(computeSheetInset(1, 1, 0, baseConfig, SHEET_COUNT).emphasis).toBe(1);
    expect(computeSheetInset(3, 1, 0, baseConfig, SHEET_COUNT).emphasis).toBe(0);
  });
});

describe("emphasis easing", () => {
  test("eases in and out instead of ramping linearly to the peak", () => {
    // A triangular peak has a kink at the top and at each edge, so a sheet
    // changes speed abruptly as the sweep crosses it. An eased peak is flat at
    // both ends: just off the peak it sits above the linear ramp.
    const nearPeak = computeEmphasis(1, 0.075, SHEET_COUNT, 1.5); // t = 0.9
    expect(nearPeak).toBeCloseTo(0.972, 2);
    expect(nearPeak).toBeGreaterThan(0.9);

    const nearEdge = computeEmphasis(1, 0.675, SHEET_COUNT, 1.5); // t = 0.1
    expect(nearEdge).toBeCloseTo(0.028, 2);
    expect(nearEdge).toBeLessThan(0.1);
  });
});

describe("computeReveal", () => {
  test("the first sheet is open as soon as the fan is, the last is not", () => {
    expect(computeReveal(1, 0, SHEET_COUNT, 1.5)).toBe(1);
    expect(computeReveal(SHEET_COUNT, 0, SHEET_COUNT, 1.5)).toBe(0);
  });

  test("a sheet opens as the cursor travels down to it", () => {
    const backmost = [0, 0.25, 0.5, 0.75, 1].map((sweep) =>
      computeReveal(SHEET_COUNT, sweep, SHEET_COUNT, 1.5)
    );
    expect(backmost[0]).toBe(0);
    expect(backmost[backmost.length - 1]).toBe(1);
    // and it only ever opens further, never shuts again mid-gesture
    for (let i = 1; i < backmost.length; i++) {
      expect(backmost[i]).toBeGreaterThanOrEqual(backmost[i - 1]);
    }
  });

  test("the next sheet down peeks open ahead of the peak as a hint", () => {
    expect(computeReveal(2, 0, SHEET_COUNT, 1.5)).toBeCloseTo(0.259, 3);
  });

  test("a sheet stays open once the peak has moved past it", () => {
    expect(computeReveal(1, 1, SHEET_COUNT, 1.5)).toBe(1);
  });

  test("the hero is not a band and is never staggered", () => {
    expect(computeReveal(0, 0, SHEET_COUNT, 1.5)).toBe(1);
  });

  test("a lead of zero opens the whole stack at once", () => {
    expect(computeReveal(SHEET_COUNT, 0, SHEET_COUNT, 0)).toBe(1);
  });
});

describe("tilt cap", () => {
  const steep: FanSheetConfig = { ...baseConfig, tiltStepDegrees: -4, maxTiltDegrees: 6 };

  test("stops the tilt compounding past the cap", () => {
    // raw would be -8 and -12 for depths 1 and 2
    expect(computeSheetInset(1, 1, 1, steep, SHEET_COUNT).rotate).toBe(-6);
    expect(computeSheetInset(2, 1, 1, steep, SHEET_COUNT).rotate).toBe(-6);
  });

  test("leaves tilts under the cap untouched", () => {
    // the hero is one step in at -4, comfortably inside the cap
    expect(computeSheetInset(0, 1, 1, steep, SHEET_COUNT).rotate).toBeCloseTo(-4);
  });

  test("still opens progressively up to the cap", () => {
    const angles = [0, 0.5, 1].map(
      (sweep) => computeSheetInset(2, 1, sweep, steep, SHEET_COUNT).rotate
    );
    for (let i = 1; i < angles.length; i++) {
      expect(angles[i]).toBeLessThanOrEqual(angles[i - 1]);
    }
    expect(angles[angles.length - 1]).toBe(-6);
  });
});
