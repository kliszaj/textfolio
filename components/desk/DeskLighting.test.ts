import { deskDaylight, stockholmPreviewDate, windowLit } from "@/lib/deskDaylight";
import { daylightWindowStrength } from "./DeskLighting";

const at = (day: string, hour: number, minute = 0) =>
  deskDaylight(new Date(stockholmPreviewDate(new Date(`${day}T12:00:00Z`), hour).getTime() + minute * 60000));

test("the day's skylight comes through the window between the morning light and sunset", () => {
  const noon = at("2026-06-21", 13);
  expect(windowLit(noon)).toBe(false);
  expect(daylightWindowStrength(noon)).toBeGreaterThan(0.2);
});

test("it gives way to the morning and sunset panes, and is out at night", () => {
  // Late October: sunrise about 07:30, sunset about 16:00.
  const sunrise = at("2026-10-28", 8, 15);
  expect(windowLit(sunrise)).toBe(true);
  expect(daylightWindowStrength(sunrise)).toBe(0);
  const dusk = at("2026-10-28", 16, 30);
  expect(daylightWindowStrength(dusk)).toBe(0);
  expect(daylightWindowStrength(at("2026-10-28", 23))).toBe(0);
});
