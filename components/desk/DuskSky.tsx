"use client";

import { useMemo } from "react";
import type { ReactNode } from "react";
import * as THREE from "three";
import type { DeskTwilight } from "./DeskTwilight";

// Twilight backdrops, drawn as a layer behind the transparent 3D canvas. Each
// style runs from the afternoon colour (horizon 0) through dusk (horizon 1)
// into the night colour (nightMix 1), and reports the colour behind the
// clock so the name and time can pick ink or cream.

export const TWILIGHT_STYLES = [
  { id: "dark", label: "Dark room, window light" },
  { id: "radial", label: "Radial glow" },
  { id: "horizon", label: "Horizon bands" },
  { id: "grain", label: "Grain mesh" },
  { id: "dither", label: "Dither" },
  { id: "window", label: "Window light" },
] as const;
export type TwilightStyle = (typeof TWILIGHT_STYLES)[number]["id"];

type Inputs = {
  twilight: DeskTwilight;
  afternoon: string;
  night: string;
  horizon: number;
  nightMix: number;
  // Whether the room has gone dark (lib/deskDaylight roomIsDark).
  roomDark: boolean;
};

// Roughly where the name and clock sit, as a share of the stage.
const CLOCK_AT: [number, number] = [0.86, 0.9];
const css = (color: THREE.Color) => color.getStyle();
const mix = (a: THREE.Color, b: THREE.Color, t: number) => a.clone().lerp(b, t);
const clamp01 = (n: number) => Math.min(1, Math.max(0, n));

// Film grain as an SVG turbulence tile.
const GRAIN = `url("data:image/svg+xml,${encodeURIComponent(
  "<svg xmlns='http://www.w3.org/2000/svg' width='220' height='220'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 .5 0 0 0 0 .5 0 0 0 0 .5 0 0 0 1 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>",
)}")`;

// How strongly the last sunlight falls through the window: building through
// the afternoon, strongest as the sun nears the horizon, gone as night falls.
export function windowLightStrength(horizon: number, nightMix: number) {
  const d = THREE.MathUtils.smoothstep(horizon, 0.35, 1);
  return clamp01(Math.sin(Math.PI * clamp01(horizon * 1.15)) * 0.4 + d * 0.6) * (1 - clamp01(nightMix * 1.8));
}

// The first sun through the window, the morning's mirror of the above:
// strongest from sunrise, fading as the sun climbs, absent before dawn.
export function morningLightStrength(horizon: number, nightMix: number) {
  return THREE.MathUtils.smoothstep(horizon, 0.45, 0.95) * (1 - clamp01(nightMix * 1.8));
}

// The dark-room twilight: the room is either in daylight or dark, as if its
// lights were off, never a grey in between. It goes dark as the sun nears
// the horizon (horizonMix runs 0 at noon to 1 at 3 degrees up) and only the
// sunset comes in, through the window (WindowLight, in the scene). The
// switch is eased where it's drawn: the lights in the scene, a fade on the
// wall. 0 or 1; the lighting takes the darker of this and the real sky's.
// How long the backdrop takes to cross between day and night. Short on
// purpose: halfway, cream and the night purple mix to a flat grey, so the
// crossing should read as a quick dissolve rather than a grey moment.
export const DAY_NIGHT_FADE_MS = 500;

export function roomDarkness(style: TwilightStyle, roomDark: boolean) {
  return style === "dark" && roomDark ? 1 : 0;
}

// One-click colour combinations for the twilight sky (glow, middle, edges).
export const TWILIGHT_PALETTES = [
  { name: "Lavender dusk", glow: "#f5ede6", middle: "#181828", edge: "#3b2f6e" },
  { name: "Peach & plum", glow: "#f6c9ab", middle: "#24182f", edge: "#6b3f6e" },
  { name: "Blue hour", glow: "#d6e3f2", middle: "#121a30", edge: "#34507d" },
  { name: "Rose dusk", glow: "#f2c9c4", middle: "#2a1828", edge: "#7a4862" },
  { name: "Ink & cream", glow: "#f5ede6", middle: "#1c1c1c", edge: "#45403b" },
  { name: "Golden hour", glow: "#ffd9a3", middle: "#2e1d17", edge: "#8a5636" },
] as const;

// 4x4 Bayer thresholds for the ordered dither.
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((n) => (n + 0.5) / 16);

export function useDuskSky({ twilight, afternoon, night, horizon, nightMix, roomDark }: Inputs): { node: ReactNode; corner: THREE.Color } {
  const style = twilight.style;
  // Quantised so the dither only redraws when the light visibly changes.
  const qHorizon = Math.round(horizon * 100) / 100;
  const qNight = Math.round(nightMix * 100) / 100;

  return useMemo(() => {
    const cream = new THREE.Color(afternoon);
    const nightColor = new THREE.Color(night);
    const glowSet = new THREE.Color(twilight.glow);
    const middleSet = new THREE.Color(twilight.middle);
    const edgeSet = new THREE.Color(twilight.edge).lerp(nightColor, twilight.towardNight);
    // Most styles hold the afternoon colour until the sun is low.
    const d = THREE.MathUtils.smoothstep(qHorizon, 0.35, 1);
    const n = qNight;
    const glow = mix(cream, glowSet, d).lerp(nightColor, n);
    const middle = mix(cream, middleSet, d).lerp(nightColor, n);
    const edge = mix(cream, edgeSet, d).lerp(nightColor, n);

    if (style === "dark") {
      // A dark room: the wall behind the desk is the afternoon colour or the
      // night colour, fading across when the room goes dark.
      const wall = roomDark ? nightColor : cream;
      return {
        node: <div className="absolute inset-0" style={{ backgroundColor: css(wall), transition: `background-color ${DAY_NIGHT_FADE_MS}ms ease` }} />,
        corner: wall,
      };
    }

    if (style === "radial") {
      // The glow pools low where the sun went down and shrinks as night
      // closes in from the top and edges.
      const base = mix(cream, glowSet, qHorizon);
      const violet = new THREE.Color(twilight.edge).lerp(nightColor, Math.max(n, twilight.towardNight));
      const core = mix(base, violet, n);
      const mid = mix(base, middleSet, qHorizon).lerp(violet, n);
      const outer = mix(base, violet, qHorizon);
      const reach = THREE.MathUtils.lerp(twilight.reachDay, twilight.reachSunset, qHorizon) * (1 - n * 0.6);
      const rx = reach * twilight.width, ry = reach, stop = twilight.middleStop;
      const dist = Math.hypot((CLOCK_AT[0] - twilight.sunX) / rx, (CLOCK_AT[1] - twilight.sunY) / ry);
      const corner = dist < stop ? mix(core, mid, dist / stop) : mix(mid, outer, Math.min(1, (dist - stop) / (1 - stop)));
      const image = `radial-gradient(ellipse ${rx * 100}% ${ry * 100}% at ${twilight.sunX * 100}% ${twilight.sunY * 100}%, ${css(core)} 0%, ${css(mid)} ${stop * 100}%, ${css(outer)} 100%)`;
      return { node: <div className="absolute inset-0" style={{ backgroundImage: image }} />, corner };
    }

    if (style === "horizon") {
      // Bands from the top down; night takes the top first and creeps down.
      const tones = [edge, middle, mix(middle, glow, 0.55), glow].map((tone, i) =>
        tone.clone().lerp(nightColor, clamp01(n * 1.6 - i * 0.22)),
      );
      const stops = [0, 38 + 24 * n, 68 + 18 * n, 100];
      const image = `linear-gradient(180deg, ${tones.map((tone, i) => `${css(tone)} ${stops[i]}%`).join(", ")})`;
      return { node: <div className="absolute inset-0" style={{ backgroundImage: image }} />, corner: mix(tones[2], tones[3], 0.6) };
    }

    if (style === "grain") {
      // Soft blooms over the edge colour, listed bottom layer first: the night
      // purple pressing down from the top, a lilac low on the right, and the
      // glow where the sun set. The light blooms shrink and night spreads.
      const shrink = 1 - n * 0.5;
      const blooms = [
        { color: middle, x: 0.55, y: -0.25, rx: 1.1 + n * 0.6, ry: 0.75 + n * 0.6 },
        { color: mix(glow, edge, 0.35), x: 0.88, y: 1.08, rx: 0.7 * shrink, ry: 0.7 * shrink },
        { color: glow, x: 0.16, y: 1.1, rx: 1.0 * shrink, ry: 0.8 * shrink },
      ];
      const FADE_AT = 0.75;
      const image = [...blooms].reverse().map(({ color, x, y, rx, ry }) =>
        `radial-gradient(ellipse ${rx * 100}% ${ry * 100}% at ${x * 100}% ${y * 100}%, ${css(color)} 0%, transparent ${FADE_AT * 100}%)`,
      ).join(", ");
      // The colour behind the clock: each bloom laid over the last.
      const corner = blooms.reduce((under, { color, x, y, rx, ry }) => {
        const reach = Math.hypot((CLOCK_AT[0] - x) / rx, (CLOCK_AT[1] - y) / ry);
        return mix(under, color, 1 - clamp01(reach / FADE_AT));
      }, edge.clone());
      return {
        node: (
          <div className="absolute inset-0" style={{ backgroundColor: css(edge), backgroundImage: image }}>
            <div className="absolute inset-0" style={{ backgroundImage: GRAIN, opacity: 0.35 * d + 0.08, mixBlendMode: "overlay" }} />
          </div>
        ),
        corner,
      };
    }

    if (style === "dither") {
      // Three tones -- the middle, the edges, the glow -- ordered-dithered over
      // a field that brightens towards the bottom left where the sun set.
      const w = 240, h = 135;
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d")!;
      const image = ctx.createImageData(w, h);
      // getHex() is in sRGB, which is what the canvas wants.
      const tones = [middle, edge, glow].map((tone) => { const hex = tone.getHex(); return [(hex >> 16) & 255, (hex >> 8) & 255, hex & 255]; });
      const reach = THREE.MathUtils.lerp(2.4, 1.1, d) * (1 - n * 0.7);
      const field = (x: number, y: number) => clamp01(0.75 * (1 - Math.hypot((x - 0.2) / (reach * 1.3), (y - 1.05) / reach)) + 0.35 * y - 0.1 + (1 - d) * 0.9);
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        const level = Math.min(2, Math.floor(field(x / w, y / h) * 2 + BAYER[(y % 4) * 4 + (x % 4)]));
        const [r, g, b] = tones[level], i = (y * w + x) * 4;
        image.data[i] = r; image.data[i + 1] = g; image.data[i + 2] = b; image.data[i + 3] = 255;
      }
      ctx.putImageData(image, 0, 0);
      const level = field(CLOCK_AT[0], CLOCK_AT[1]) * 2;
      const corner = level < 1 ? mix(middle, edge, level) : mix(edge, glow, level - 1);
      return {
        node: <div className="absolute inset-0" style={{ backgroundImage: `url(${canvas.toDataURL()})`, backgroundSize: "cover", backgroundPosition: "center", imageRendering: "pixelated" }} />,
        corner,
      };
    }

    // Window light: the backdrop becomes the room's wall, darkening into
    // night. The last of the sun falling on it is drawn in the 3D scene
    // (WindowLight in DeskStage), so it turns with the room.
    const wallTop = mix(cream, mix(edgeSet, middleSet, 0.5), d).lerp(nightColor, n);
    const wallBottom = mix(cream, mix(edgeSet, glowSet, 0.35), d).lerp(nightColor, n);
    return {
      node: <div className="absolute inset-0" style={{ backgroundImage: `linear-gradient(180deg, ${css(wallTop)}, ${css(wallBottom)})` }} />,
      corner: wallBottom,
    };
  }, [style, twilight, afternoon, night, qHorizon, qNight, roomDark]);
}
