import {
  ASCII_CAMERA_DISTANCE,
  ASCII_CAMERA_FOV_DEG,
  ASCII_FALLBACK_PLANE_HEIGHT,
  ASCII_DEPTH_RAMP,
  ASCII_EXTRUDE_LAYERS,
  extrudeLayerShade,
  ASCII_INK_BLUE,
  ASCII_INK_LIME,
  DEFAULT_ASCII_TEXT_CONFIG,
  ASCII_MIN_FONT_SIZE,
  asciiFontSizeForHost,
  ASCII_TYPE_COLUMN_SPREAD,
  ASCII_TYPE_JUNK,
  asciiCellStateAt,
  ASCII_TYPE_SHARE,
  asciiJunkGlyph,
  chipForBrightness,
  demoTiltAt,
  planeHeightForFontSize,
  textTextureLayout,
  visibleWorldHeight,
} from "./asciiText";

test("every field has a default, so the config can be spread as props", () => {
  const keys = Object.keys(DEFAULT_ASCII_TEXT_CONFIG).sort();
  expect(keys).toEqual([
    "asciiFontSize",
    "crtCurvature",
    "enableWaves",
    "extrudeDepth",
    "planeScale",
    "randomizeGlyphColors",
    "randomizeStageColor",
    "textFontSize",
    "tiltStrength",
  ]);
});

test("sizes are positive, or the three.js plane collapses", () => {
  expect(DEFAULT_ASCII_TEXT_CONFIG.asciiFontSize).toBeGreaterThan(0);
  expect(DEFAULT_ASCII_TEXT_CONFIG.textFontSize).toBeGreaterThan(0);
  expect(DEFAULT_ASCII_TEXT_CONFIG.planeScale).toBeGreaterThan(0);
});

test("the ascii grid is far finer than the text it samples", () => {
  expect(DEFAULT_ASCII_TEXT_CONFIG.asciiFontSize).toBeLessThan(
    DEFAULT_ASCII_TEXT_CONFIG.textFontSize
  );
});

describe("responsive ASCII cells", () => {
  test("keeps the desktop setting at the reference width", () => {
    expect(asciiFontSizeForHost(11, 1100)).toBe(11);
  });

  test("scales cells down on a narrow host while keeping a readable floor", () => {
    expect(asciiFontSizeForHost(11, 550)).toBeCloseTo(ASCII_MIN_FONT_SIZE);
    expect(asciiFontSizeForHost(11, 275)).toBe(ASCII_MIN_FONT_SIZE);
  });

  test("does not scale a configured size up on wide screens", () => {
    expect(asciiFontSizeForHost(16, 2200)).toBe(16);
  });
});

test("CRT curvature stays restrained by default but can be disabled", () => {
  expect(DEFAULT_ASCII_TEXT_CONFIG.crtCurvature).toBeGreaterThan(0);
  expect(DEFAULT_ASCII_TEXT_CONFIG.crtCurvature).toBeLessThan(0.68);
});

describe("ascii colour scheme", () => {
  test("every chip inks in either blue or lime, nothing else", () => {
    for (const chip of ASCII_DEPTH_RAMP) {
      expect([ASCII_INK_BLUE, ASCII_INK_LIME]).toContain(chip.foreground);
    }
  });

  test("every container colour is valid hex and used once", () => {
    const backgrounds = ASCII_DEPTH_RAMP.map((c) => c.background);
    for (const background of backgrounds) {
      expect(background).toMatch(/^#[0-9A-Fa-f]{6}$/);
    }
    expect(new Set(backgrounds).size).toBe(backgrounds.length);
  });

  test("the lit face is blue on light grey", () => {
    const face = chipForBrightness(1);
    expect(face).toBe(ASCII_DEPTH_RAMP[0]);
    expect(face.background).toBe("#DDE0DD");
    expect(face.foreground).toBe(ASCII_INK_BLUE);
  });

  test("the darkest cells fall to the deepest shadow", () => {
    expect(chipForBrightness(0)).toBe(ASCII_DEPTH_RAMP[ASCII_DEPTH_RAMP.length - 1]);
  });

  test("colour follows the light: dimmer never means shallower", () => {
    // Colour has to describe one continuous surface, so stepping the light
    // down must only ever walk further into shadow.
    let previous = -1;
    for (let i = 0; i <= 100; i++) {
      const index = ASCII_DEPTH_RAMP.indexOf(chipForBrightness(1 - i / 100));
      expect(index).toBeGreaterThanOrEqual(previous);
      previous = index;
    }
  });

  test("blue holds the lit end and lime only the shadowed end", () => {
    const inks = ASCII_DEPTH_RAMP.map((c) => c.foreground);
    const lastBlue = inks.lastIndexOf(ASCII_INK_BLUE);
    const firstLime = inks.indexOf(ASCII_INK_LIME);
    expect(firstLime).toBeGreaterThan(lastBlue);
  });

  test("the face is blue, so blue carries the treatment", () => {
    expect(ASCII_DEPTH_RAMP[0].foreground).toBe(ASCII_INK_BLUE);
  });

  test("the stage no longer randomises, so it matches the reference", () => {
    expect(DEFAULT_ASCII_TEXT_CONFIG.randomizeStageColor).toBe(false);
  });
});

describe("matching the original font size", () => {
  // The headline container at a 1440 viewport: 320px tall, font at 230px.
  const at1440 = {
    textureCanvasHeightPx: 285,
    hostHeightPx: 320,
    targetFontSizePx: 230,
    textureFontSizePx: 340,
  };

  test("the camera's visible height follows its cone and distance", () => {
    expect(visibleWorldHeight(45, 30)).toBeCloseTo(24.853, 2);
    expect(visibleWorldHeight(45, 60)).toBeCloseTo(49.706, 2);
  });

  test("the camera moved much farther away without changing what it sees", () => {
    // The FOV was narrowed to match, specifically so every plane-height
    // formula below -- all built on visibleWorldHeight() -- lands on exactly
    // the same on-screen size it always did. Only the camera's sensitivity
    // to the plane's own tilt should have changed.
    expect(ASCII_CAMERA_DISTANCE).toBeGreaterThan(100);
    expect(visibleWorldHeight(ASCII_CAMERA_FOV_DEG, ASCII_CAMERA_DISTANCE)).toBeCloseTo(
      visibleWorldHeight(45, 30),
      6
    );
  });

  test("a plane as wide as the word now sits well inside the camera's distance", () => {
    // At the old 30-unit distance the plane's own half-width (comparable to
    // the whole distance) meant a rotated plane's near and far edges sat at
    // meaningfully different depths -- real keystoning, not just a lean. The
    // camera needs to be far enough past the plane's size that this stops
    // being true.
    const approximateHalfWidth = 32;
    expect(ASCII_CAMERA_DISTANCE).toBeGreaterThan(approximateHalfWidth * 5);
  });

  test("matching a 230px headline needs a bigger plane than the old default", () => {
    const height = planeHeightForFontSize(at1440);
    expect(height).toBeCloseTo(14.97, 1);
    // The old fixed 13 rendered the ascii noticeably smaller than the font.
    expect(height).toBeGreaterThan(ASCII_FALLBACK_PLANE_HEIGHT);
  });

  test("a larger headline needs a proportionally larger plane", () => {
    const single = planeHeightForFontSize(at1440);
    const doubled = planeHeightForFontSize({ ...at1440, targetFontSizePx: 460 });
    expect(doubled).toBeCloseTo(single * 2, 5);
  });

  test("a taller host needs a proportionally smaller plane", () => {
    const single = planeHeightForFontSize(at1440);
    const tall = planeHeightForFontSize({ ...at1440, hostHeightPx: 640 });
    expect(tall).toBeCloseTo(single / 2, 5);
  });

  test("falls back rather than dividing by zero before the host is measured", () => {
    expect(planeHeightForFontSize({ ...at1440, hostHeightPx: 0 })).toBe(
      ASCII_FALLBACK_PLANE_HEIGHT
    );
    expect(planeHeightForFontSize({ ...at1440, targetFontSizePx: 0 })).toBe(
      ASCII_FALLBACK_PLANE_HEIGHT
    );
  });

  test("the tilt is present but well short of the original swing", () => {
    // The old behaviour was 0.9 rad across the host.
    expect(DEFAULT_ASCII_TEXT_CONFIG.tiltStrength).toBeGreaterThan(0);
    expect(DEFAULT_ASCII_TEXT_CONFIG.tiltStrength).toBeLessThan(0.9 / 2);
  });
});

describe("sprinkling the edges", () => {
  test("the lit face ignores jitter entirely", () => {
    // A speckled front plane would read as noise, not as a surface.
    for (const jitter of [0, 0.25, 0.5, 0.75, 1]) {
      expect(chipForBrightness(1, jitter)).toBe(ASCII_DEPTH_RAMP[0]);
    }
  });

  test("edge cells scatter across neighbouring shadow colours", () => {
    const seen = new Set<string>();
    for (let i = 0; i <= 20; i++) {
      seen.add(chipForBrightness(0.5, i / 20).background);
    }
    expect(seen.size).toBeGreaterThan(1);
  });

  test("jitter never promotes an edge cell back onto the face", () => {
    for (let brightness = 0; brightness < 0.85; brightness += 0.05) {
      for (const jitter of [0, 0.5, 1]) {
        expect(chipForBrightness(brightness, jitter)).not.toBe(ASCII_DEPTH_RAMP[0]);
      }
    }
  });

  test("always lands on a real chip however extreme the inputs", () => {
    for (const brightness of [-1, 0, 0.5, 1, 2, NaN]) {
      for (const jitter of [-1, 0, 1, 2]) {
        expect(ASCII_DEPTH_RAMP).toContain(chipForBrightness(brightness, jitter));
      }
    }
  });
});

describe("the scripted tilt sweep", () => {
  const DURATION = 1500;
  const STRENGTH = 0.3;

  test("starts level and leans a single way", () => {
    // Crossing level midway read as two separate moves.
    expect(demoTiltAt(0, DURATION, STRENGTH)).toBeCloseTo(0, 6);
    expect(demoTiltAt(DURATION * 0.5, DURATION, STRENGTH)!).toBeGreaterThan(0);
  });

  test("never leans back the other way", () => {
    for (let t = 0; t < DURATION; t += 25) {
      expect(demoTiltAt(t, DURATION, STRENGTH)!).toBeGreaterThanOrEqual(0);
    }
  });

  test("eases back to level by its own end, not held at the extreme", () => {
    // A held lean relied on the handover fade to hide it disappearing
    // mid-tilt. Now that a handover can be a hard cut with no fade at all
    // (HEADLINE_HANDOVER_MS can be 0), the motion has to land back at level
    // under its own steam before its duration is up, or a hard cut catches
    // the plane mid-lean -- which a perspective camera reads as shifted and
    // shrunk, not just angled.
    expect(demoTiltAt(DURATION * 0.99, DURATION, STRENGTH)!).toBeCloseTo(0, 1);
  });

  test("rises to a peak partway through, then relaxes back -- one motion, not held", () => {
    let previous = -Infinity;
    let sawDecrease = false;
    for (let t = 0; t < DURATION; t += 25) {
      const lean = demoTiltAt(t, DURATION, STRENGTH)!;
      if (lean < previous) sawDecrease = true;
      previous = lean;
    }
    expect(sawDecrease).toBe(true);
  });

  test("never leans further than a real cursor could", () => {
    for (let t = 0; t < DURATION; t += 25) {
      expect(Math.abs(demoTiltAt(t, DURATION, STRENGTH)!)).toBeLessThanOrEqual(STRENGTH);
    }
  });

  test("hands back to the real pointer once it is done", () => {
    expect(demoTiltAt(DURATION, DURATION, STRENGTH)).toBeNull();
    expect(demoTiltAt(DURATION + 500, DURATION, STRENGTH)).toBeNull();
  });

  test("stays out of the way when it was never asked for", () => {
    expect(demoTiltAt(10, 0, STRENGTH)).toBeNull();
    expect(demoTiltAt(NaN, DURATION, STRENGTH)).toBeNull();
    expect(demoTiltAt(-10, DURATION, STRENGTH)).toBeNull();
  });
});

describe("extruding the letters", () => {
  test("the default extrusion stays subtle", () => {
    expect(DEFAULT_ASCII_TEXT_CONFIG.extrudeDepth).toBeLessThanOrEqual(0.06);
  });

  test("the back of the body is black and the front nearly white", () => {
    // Spanning that range is what gives the depth ramp every colour to use,
    // including the darkest containers.
    expect(extrudeLayerShade(ASCII_EXTRUDE_LAYERS, ASCII_EXTRUDE_LAYERS)).toBe(0);
    expect(extrudeLayerShade(1, ASCII_EXTRUDE_LAYERS)).toBeGreaterThan(200);
  });

  test("shades darken steadily toward the back", () => {
    let previous = 256;
    for (let layer = 1; layer <= ASCII_EXTRUDE_LAYERS; layer += 1) {
      const shade = extrudeLayerShade(layer, ASCII_EXTRUDE_LAYERS);
      expect(shade).toBeLessThan(previous);
      previous = shade;
    }
  });

  test("every layer stays a drawable grey", () => {
    for (let layer = 0; layer <= ASCII_EXTRUDE_LAYERS; layer += 1) {
      const shade = extrudeLayerShade(layer, ASCII_EXTRUDE_LAYERS);
      expect(shade).toBeGreaterThanOrEqual(0);
      expect(shade).toBeLessThanOrEqual(255);
    }
  });

  test("the body reaches the darkest chips the palette has", () => {
    // The maroon and dark green were previously almost never reached.
    const deepest = chipForBrightness(extrudeLayerShade(ASCII_EXTRUDE_LAYERS, ASCII_EXTRUDE_LAYERS) / 255);
    expect(deepest).toBe(ASCII_DEPTH_RAMP[ASCII_DEPTH_RAMP.length - 1]);
  });

  test("survives a degenerate layer count", () => {
    expect(extrudeLayerShade(1, 0)).toBe(0);
  });

  describe("laying the face out on its own texture canvas", () => {
    // Deliberately asymmetric left/right, the way a real bold display face's
    // side bearings are: a test built on equal bearings couldn't tell "centred
    // on the ink" apart from "centred on the advance box", which is exactly
    // the bug this layout used to have.
    const INK_LEFT = 3.2;
    const INK_RIGHT = 1379.24;
    const layout = textTextureLayout({
      inkLeftPx: INK_LEFT,
      inkRightPx: INK_RIGHT,
      ascentPx: 265.625,
      descentPx: 0,
      extrudeXPx: 20.4,
      extrudeYPx: 12.648,
    });

    test("gives the face equal margin left and right", () => {
      // The extruded body only ever trails down-and-right, so a margin sized
      // to fit just that trailing edge left more empty canvas on the right
      // than the left -- and since the whole canvas (not just the face) is
      // what a centred plane centres on screen, that is what put the ASCII
      // word visibly left of the other treatments' shared centre.
      const leftMargin = layout.baseX - INK_LEFT;
      const rightMargin = layout.canvasWidth - (layout.baseX + INK_RIGHT);
      // Within a pixel: canvasWidth is rounded up to a whole pixel, so the
      // trailing margin can be a fraction of a pixel wider than the leading
      // one, but never a whole extra margin's worth.
      expect(Math.abs(rightMargin - leftMargin)).toBeLessThan(1);
    });

    test("gives the face equal margin top and bottom", () => {
      const topMargin = layout.baseY - 265.625;
      const bottomMargin = layout.canvasHeight - (layout.baseY + 0);
      expect(Math.abs(bottomMargin - topMargin)).toBeLessThan(1);
    });

    test("still keeps the extruded body's trailing edge inside the canvas", () => {
      const rightReach = layout.baseX + 20.4 + INK_RIGHT;
      const bottomReach = layout.baseY + 12.648 + 0;
      expect(rightReach).toBeLessThan(layout.canvasWidth);
      expect(bottomReach).toBeLessThan(layout.canvasHeight);
    });
  });
});

describe("typing the ascii word in", () => {
  test("nothing is on screen at the start and everything is by the end", () => {
    for (const column of [0.01, 0.5, 0.99]) {
      for (const row of [0, 0.5, 1]) {
        expect(asciiCellStateAt(column, row, 0)).toBe("hidden");
        expect(asciiCellStateAt(column, row, 1)).toBe("settled");
      }
    }
  });

  test("a column streams downward: upper cells land before lower ones", () => {
    // This is what makes it read as rain rather than a scatter or a wipe.
    const column = 0.2;
    const order = { hidden: 0, churning: 1, settled: 2 };
    for (let t = 0.05; t < 1; t += 0.05) {
      const top = order[asciiCellStateAt(column, 0, t)];
      const bottom = order[asciiCellStateAt(column, 1, t)];
      expect(top).toBeGreaterThanOrEqual(bottom);
    }
  });

  test("columns start at staggered moments rather than as one front", () => {
    const early = asciiCellStateAt(0, 0, 0.2);
    const late = asciiCellStateAt(1, 0, 0.2);
    expect(early).not.toBe("hidden");
    expect(late).toBe("hidden");
  });

  test("a cell churns through junk before it settles", () => {
    const column = 0;
    expect(asciiCellStateAt(column, 0.9, 0.3)).toBe("hidden");
    expect(asciiCellStateAt(column, 0.9, 0.52)).toBe("churning");
    expect(asciiCellStateAt(column, 0.9, 0.95)).toBe("settled");
  });

  test("a cell never goes backwards as the type-in runs", () => {
    const order = { hidden: 0, churning: 1, settled: 2 };
    let previous = 0;
    for (let t = 0; t <= 1; t += 0.02) {
      const rank = order[asciiCellStateAt(0.35, 0.6, t)];
      expect(rank).toBeGreaterThanOrEqual(previous);
      previous = rank;
    }
  });

  test("the last column's last row lands exactly as the type-in ends", () => {
    // Any later and the word would still be arriving when the stage moves on.
    expect(ASCII_TYPE_COLUMN_SPREAD).toBeGreaterThan(0);
    expect(ASCII_TYPE_COLUMN_SPREAD).toBeLessThan(1);
    expect(asciiCellStateAt(1, 1, 0.999)).not.toBe("hidden");
  });

  test("junk glyphs come from the junk set and reshuffle over time", () => {
    const first = asciiJunkGlyph(0.42, 0);
    expect(ASCII_TYPE_JUNK).toContain(first);
    const later = Array.from({ length: 12 }, (_, tick) => asciiJunkGlyph(0.42, tick));
    expect(new Set(later).size).toBeGreaterThan(1);
  });

  test("survives nonsense input rather than blanking the word", () => {
    expect(asciiCellStateAt(0.5, 0.5, NaN)).toBe("settled");
    expect(asciiCellStateAt(NaN, 0.5, 0.5)).toBe("settled");
    expect(asciiCellStateAt(0.5, NaN, 0.5)).toBe("settled");
  });
});

test("finishes the rain well inside the ascii stage so it reads as quick", () => {
  // The word lands with time to spare rather than still filling in as the
  // stage hands over.
  expect(ASCII_TYPE_SHARE).toBeLessThanOrEqual(0.7);
  expect(asciiCellStateAt(1, 1, 1)).toBe("settled");
});

describe("the plane never outgrows its frame", () => {
  // A phone: a narrow host, and a texture holding a word far wider than it.
  const onAPhone = {
    textureCanvasWidthPx: 1560,
    textureCanvasHeightPx: 285,
    hostWidthPx: 378,
    hostHeightPx: 176,
    targetFontSizePx: 72,
    textureFontSizePx: 340,
  };

  // How wide the plane ends up on screen, in host pixels.
  const renderedWidth = (input: typeof onAPhone) => {
    const height = planeHeightForFontSize(input);
    const aspect = input.textureCanvasWidthPx / input.textureCanvasHeightPx;
    return height * aspect * (input.hostHeightPx / visibleWorldHeight());
  };

  test("fits the frame even when the headline cannot be measured yet", () => {
    // A target of 0 is the unmeasured path. It used to return a fixed world
    // height that ignored the viewport: on a phone that rendered the word
    // wider than the screen, and the frame does not clip.
    const unmeasured = { ...onAPhone, targetFontSizePx: 0 };
    expect(renderedWidth(unmeasured)).toBeLessThanOrEqual(onAPhone.hostWidthPx);
    expect(planeHeightForFontSize(unmeasured)).toBeLessThan(ASCII_FALLBACK_PLANE_HEIGHT);
  });

  test("fits the frame when the headline clamp asks for more than fits", () => {
    const huge = { ...onAPhone, targetFontSizePx: 260 };
    expect(renderedWidth(huge)).toBeLessThanOrEqual(onAPhone.hostWidthPx);
  });

  test("still matches the headline exactly when there is room", () => {
    const roomy = {
      ...onAPhone,
      hostWidthPx: 1100,
      hostHeightPx: 320,
      targetFontSizePx: 230,
    };
    const expected =
      (roomy.textureCanvasHeightPx * visibleWorldHeight() * roomy.targetFontSizePx) /
      (roomy.hostHeightPx * roomy.textureFontSizePx);
    expect(planeHeightForFontSize(roomy)).toBeCloseTo(expected, 5);
  });

  test("keeps the texture's proportions while fitting", () => {
    const wide = planeHeightForFontSize({ ...onAPhone, targetFontSizePx: 260 });
    const half = planeHeightForFontSize({
      ...onAPhone,
      targetFontSizePx: 260,
      textureCanvasWidthPx: 780,
    });
    // Half the word, so twice the height fits across the same frame.
    expect(half).toBeCloseTo(wide * 2, 5);
  });
});
