import { getPosition, getTimes } from "suncalc";

const stockholmDate = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Europe/Stockholm", year: "numeric", month: "2-digit", day: "2-digit",
  hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23",
});

const WINDOW_AZIMUTH_DEGREES = 45; // Northeast; +Z points out through the window.

export function nextDeskStage(date: Date, direction: -1 | 1): Date {
  const stages: Date[] = [];
  // Include adjacent days so the four-stage tour wraps naturally at midnight.
  for (const day of [-1, 0, 1]) {
    const noon = stockholmPreviewDate(new Date(date.getTime() + day * 86400000), 12);
    const times = getTimes(noon, 59.3293, 18.0686);
    const morning = new Date((times.sunrise ?? noon).getTime() + 45 * 60000);
    const afternoon = times.solarNoon;
    const twilight = times.sunset ?? new Date(noon.getTime() + 6 * 3600000);
    const night = new Date((times.dusk ?? twilight).getTime() + 60 * 60000);
    stages.push(morning, afternoon, twilight, night);
  }
  stages.sort((a, b) => a.getTime() - b.getTime());
  // A preview follows the live clock between clicks; ignore up to a minute
  // of drift so a stage cannot accidentally select itself again.
  return direction === 1
    ? stages.find((stage) => stage.getTime() > date.getTime() + 60000)!
    : stages.reverse().find((stage) => stage.getTime() < date.getTime() - 60000)!;
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
