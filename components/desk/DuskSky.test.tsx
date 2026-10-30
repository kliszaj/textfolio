import { renderHook } from "@testing-library/react";
import * as THREE from "three";
import { morningLightStrength, roomDarkness, TWILIGHT_STYLES, useDuskSky, windowLightStrength, type TwilightStyle } from "./DuskSky";
import { DEFAULT_DESK_TWILIGHT } from "./DeskTwilight";

const AFTERNOON = "#f5ede6";
const NIGHT = "#181828";

// jsdom has no 2D canvas; the dither style only needs somewhere to put pixels.
beforeAll(() => {
  jest.spyOn(HTMLCanvasElement.prototype, "getContext").mockImplementation(function (this: HTMLCanvasElement) {
    return {
      createImageData: (w: number, h: number) => ({ data: new Uint8ClampedArray(w * h * 4) }),
      putImageData: () => {},
    } as unknown as CanvasRenderingContext2D;
  } as unknown as typeof HTMLCanvasElement.prototype.getContext);
  jest.spyOn(HTMLCanvasElement.prototype, "toDataURL").mockReturnValue("data:image/png;base64,");
});
afterAll(() => jest.restoreAllMocks());

function sky(style: TwilightStyle, horizon: number, nightMix: number) {
  return renderHook((props) => useDuskSky(props), {
    initialProps: { twilight: { ...DEFAULT_DESK_TWILIGHT, style }, afternoon: AFTERNOON, night: NIGHT, horizon, nightMix },
  });
}

const distance = (a: THREE.Color, hex: string) => {
  const b = new THREE.Color(hex);
  return Math.hypot(a.r - b.r, a.g - b.g, a.b - b.b);
};

describe.each(TWILIGHT_STYLES.map(({ id }) => id))("the %s sky", (style) => {
  test("is the plain afternoon colour behind the clock while the sun is high", () => {
    const { result } = sky(style, 0, 0);
    expect(distance(result.current.corner, AFTERNOON)).toBeLessThan(0.02);
  });

  test("is the night colour behind the clock once night has fallen", () => {
    const { result } = sky(style, 1, 1);
    expect(distance(result.current.corner, NIGHT)).toBeLessThan(0.02);
  });

  test("darkens behind the clock as the evening goes on", () => {
    const luminance = (horizon: number, nightMix: number) => {
      const { corner } = sky(style, horizon, nightMix).result.current;
      return 0.2126 * corner.r + 0.7152 * corner.g + 0.0722 * corner.b;
    };
    expect(luminance(1, 0.5)).toBeLessThan(luminance(0, 0));
    expect(luminance(1, 1)).toBeLessThanOrEqual(luminance(1, 0.5));
  });
});

test("tiny changes in the light reuse the same sky, so the dither doesn't redraw", () => {
  // The same twilight object throughout, as the stage passes it.
  const twilight = { ...DEFAULT_DESK_TWILIGHT, style: "dither" as const };
  const { result, rerender } = renderHook((props) => useDuskSky(props), {
    initialProps: { twilight, afternoon: AFTERNOON, night: NIGHT, horizon: 0.5, nightMix: 0.2 },
  });
  const before = result.current;
  rerender({ twilight, afternoon: AFTERNOON, night: NIGHT, horizon: 0.502, nightMix: 0.201 });
  expect(result.current).toBe(before);
  rerender({ twilight, afternoon: AFTERNOON, night: NIGHT, horizon: 0.6, nightMix: 0.2 });
  expect(result.current).not.toBe(before);
});

describe("the last sun through the window", () => {
  test("is gone at night", () => {
    expect(windowLightStrength(1, 1)).toBe(0);
    expect(windowLightStrength(0.4, 0.6)).toBe(0);
  });

  test("is strongest as the sun reaches the horizon", () => {
    expect(windowLightStrength(0.9, 0)).toBeGreaterThan(windowLightStrength(0.3, 0));
    expect(windowLightStrength(0.3, 0)).toBeGreaterThan(windowLightStrength(0, 0));
  });

  test("never goes past full strength", () => {
    for (let h = 0; h <= 1; h += 0.05) expect(windowLightStrength(h, 0)).toBeLessThanOrEqual(1);
  });
});

describe("the dark room at twilight", () => {
  test("is as dark as night by sunset, and light through the afternoon", () => {
    expect(roomDarkness("dark", 1, 0, false)).toBe(1);
    expect(roomDarkness("dark", 0.2, 0, false)).toBe(0);
    expect(roomDarkness("dark", 0.7, 0, false)).toBeGreaterThan(0);
  });

  test("stays dark into the night", () => {
    expect(roomDarkness("dark", 0.5, 1, false)).toBe(1);
  });

  test("is only the evening, and only in that style", () => {
    expect(roomDarkness("dark", 1, 0, true)).toBe(0);
    expect(roomDarkness("radial", 1, 0, false)).toBe(0);
  });
});

describe("the first sun through the window", () => {
  test("is strong just after sunrise", () => {
    // The morning stop: sun low (horizon 0.91), sky no longer night.
    expect(morningLightStrength(0.91, 0)).toBeGreaterThan(0.9);
  });

  test("fades as the sun climbs, and is gone by mid-morning", () => {
    expect(morningLightStrength(0.7, 0)).toBeLessThan(morningLightStrength(0.91, 0));
    expect(morningLightStrength(0.4, 0)).toBe(0);
  });

  test("isn't there before dawn", () => {
    expect(morningLightStrength(1, 1)).toBe(0);
  });
});
