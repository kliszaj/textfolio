import { DEFAULT_WARP_TEXT_CONFIG } from "./warpText";

test("every field has a default, so the config can be spread as props", () => {
  const keys = Object.keys(DEFAULT_WARP_TEXT_CONFIG).sort();
  expect(keys).toEqual([
    "lineHeight",
    "pointerInfluence",
    "pointerStrength",
    "refraction",
    "ripple",
    "speed",
    "warpScale",
    "warpStrength",
  ]);
});

test("shader amounts stay in the 0-1 range the uniforms expect", () => {
  for (const key of ["warpStrength", "pointerInfluence", "pointerStrength", "refraction"] as const) {
    expect(DEFAULT_WARP_TEXT_CONFIG[key]).toBeGreaterThanOrEqual(0);
    expect(DEFAULT_WARP_TEXT_CONFIG[key]).toBeLessThanOrEqual(1);
  }
});

test("the warp animates rather than sitting frozen", () => {
  expect(DEFAULT_WARP_TEXT_CONFIG.speed).toBeGreaterThan(0);
  expect(DEFAULT_WARP_TEXT_CONFIG.warpScale).toBeGreaterThan(0);
});
