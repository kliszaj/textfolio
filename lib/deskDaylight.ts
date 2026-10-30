import { getPosition, getTimes } from "suncalc";

const stockholmDate = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Europe/Stockholm", year: "numeric", month: "2-digit", day: "2-digit",
  hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23",
});

const WINDOW_AZIMUTH_DEGREES = 45; // Northeast; +Z points out through the window.

// The room goes dark (the "dark" twilight style) once the sun is this low in
// the evening: horizonMix runs 0 at noon to 1 at 3 degrees up.
export const DARK_ROOM_AT_HORIZON = 0.85;
// The morning window light is noticeable from here (see morningLightStrength).
export const MORNING_LOOK_AT_HORIZON = 0.65;

export type DeskStageKind = "morning" | "afternoon" | "twilight" | "night";

// Which of the four stops the room looks like at this moment, by the same
// rules that draw it -- not by which stop's time has passed. The room goes
// dark some time before the sunset stop, and the morning light fades well
// before noon, so a time between two stops can look like either.
export function deskLook(date: Date): DeskStageKind {
  const sky = deskDaylight(date);
  if (sky.backgroundNightMix >= 0.5) return "night";
  if (windowLit(sky)) return sky.morning ? "morning" : "twilight";
  return "afternoon";
}

// Whether the light comes in through the window (morning and twilight) or
// from the room's sun (the rest of the day): one or the other, never both,
// switching where the room's look does.
export function windowLit(sky: { morning: boolean; horizonMix: number; backgroundNightMix: number }) {
  return sky.morning ? sky.horizonMix >= MORNING_LOOK_AT_HORIZON : sky.horizonMix >= DARK_ROOM_AT_HORIZON || sky.backgroundNightMix > 0;
}

export function nextDeskStage(date: Date, direction: -1 | 1): Date {
  const stages: { at: Date; kind: DeskStageKind }[] = [];
  // Include adjacent days so the four-stage tour wraps naturally at midnight.
  for (const day of [-1, 0, 1]) {
    const noon = stockholmPreviewDate(new Date(date.getTime() + day * 86400000), 12);
    const times = getTimes(noon, 59.3293, 18.0686);
    const twilight = times.sunset ?? new Date(noon.getTime() + 6 * 3600000);
    stages.push(
      { at: new Date((times.sunrise ?? noon).getTime() + 45 * 60000), kind: "morning" },
      { at: times.solarNoon, kind: "afternoon" },
      { at: twilight, kind: "twilight" },
      { at: new Date((times.dusk ?? twilight).getTime() + 60 * 60000), kind: "night" },
    );
  }
  stages.sort((a, b) => a.at.getTime() - b.at.getTime());
  // Step from the stop the room looks like now -- the nearest one of that
  // kind -- so every step shows a different room: from 15:30, already dark
  // before a 15:59 sunset, forward goes on to night rather than to a sunset
  // that looks the same, and back goes to the afternoon.
  const look = deskLook(date);
  let current = 0;
  let nearest = Infinity;
  stages.forEach((stage, index) => {
    const distance = Math.abs(stage.at.getTime() - date.getTime());
    if (stage.kind === look && distance < nearest) {
      nearest = distance;
      current = index;
    }
  });
  return stages[current + direction].at;
}

// Today's Stockholm sunset: the same moment the clock's twilight stop uses.
export function sunsetOn(date: Date): Date {
  const noon = stockholmPreviewDate(date, 12);
  return getTimes(noon, 59.3293, 18.0686).sunset ?? new Date(noon.getTime() + 6 * 3600000);
}

// Resolve a wall-clock preview on today's Stockholm date, independently of
// the visitor's timezone. Recalculate the offset at the target hour for DST.
export function stockholmPreviewDate(now: Date, hour: number): Date {
  const parts = Object.fromEntries(stockholmDate.formatToParts(now).map((part) => [part.type, part.value]));
  const wallTime = Date.UTC(Number(parts.year), Number(parts.month) - 1, Number(parts.day), hour);
  let instant = wallTime;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const local = Object.fromEntries(stockholmDate.formatToParts(new Date(instant)).map((part) => [part.type, part.value]));
    const localAsUTC = Date.UTC(Number(local.year), Number(local.month) - 1, Number(local.day), Number(local.hour), Number(local.minute), Number(local.second));
    instant += wallTime - localAsUTC;
  }
  return new Date(instant);
}

export function deskDaylight(date: Date) {
  const sun = getPosition(date, 59.3293, 18.0686);
  const solarNoon = getTimes(date, 59.3293, 18.0686).solarNoon;
  const noonAltitude = getPosition(solarNoon, 59.3293, 18.0686).altitude;
  const radians = Math.PI / 180;
  const altitude = sun.altitude * radians;
  const relativeAzimuth = (sun.azimuth - WINDOW_AZIMUTH_DEGREES) * radians;
  // A vertical window admits direct sun only from its exterior hemisphere.
  // Cosine falloff softens grazing angles; sky fill remains available all day.
  const windowExposure = Math.max(0, Math.cos(relativeAzimuth));
  const t = Math.max(0, Math.min(1, (sun.altitude + 6) / 12));
  const daylight = t * t * (3 - 2 * t);
  return {
    altitude: sun.altitude,
    daylight,
    darkness: 1 - daylight,
    // Preserve the sunset palette through civil twilight before purple night.
    backgroundNightMix: (() => { const t = Math.max(0, Math.min(1, (-sun.altitude - 4) / 8)); return t * t * (3 - 2 * t); })(),
    morning: sun.azimuth < 180,
    horizonMix: Math.max(0, Math.min(1, (noonAltitude - sun.altitude) / Math.max(1, noonAltitude - 3))),
    // Rotate the geographic sun direction into the northeast-facing room.
    sunPosition: [-8 * Math.cos(altitude) * Math.sin(relativeAzimuth), 8 * Math.sin(altitude), 8 * Math.cos(altitude) * Math.cos(relativeAzimuth)] as [number, number, number],
    sunIntensity: sun.altitude <= 0 ? 0 : 3 * Math.sqrt(Math.sin(altitude)) * windowExposure,
    warmSun: Math.max(0, Math.min(1, 1 - sun.altitude / 20)),
    dayBackground: sun.altitude < 12 ? (sun.azimuth < 180 ? "#FFDEAD" : "#F6DDE3") : "#ADD6FF",
    dayPeriod: (sun.altitude < 12 ? (sun.azimuth < 180 ? "morning" : "evening") : "afternoon") as "morning" | "afternoon" | "evening",
  };
}
