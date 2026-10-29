import { deskDaylight, stockholmPreviewDate } from "./deskDaylight";

test("the same Stockholm evening is light in summer and dark in winter", () => {
  const summer = deskDaylight(stockholmPreviewDate(new Date("2026-06-21T12:00:00Z"), 19));
  const winter = deskDaylight(stockholmPreviewDate(new Date("2026-12-21T12:00:00Z"), 19));
  expect(summer.daylight).toBeGreaterThan(0.9);
  expect(winter.darkness).toBe(1);
  expect(winter.sunIntensity).toBe(0);
});

test("preview hours use Stockholm's target-hour offset on DST change days", () => {
  expect(stockholmPreviewDate(new Date("2026-03-29T00:00:00Z"), 14).toISOString()).toBe("2026-03-29T12:00:00.000Z");
  expect(stockholmPreviewDate(new Date("2026-10-25T00:00:00Z"), 14).toISOString()).toBe("2026-10-25T13:00:00.000Z");
});

test("morning and evening sun directions are on opposite sides of the desk", () => {
  const date = new Date("2026-06-21T12:00:00Z");
  const morning = deskDaylight(stockholmPreviewDate(date, 9));
  const evening = deskDaylight(stockholmPreviewDate(date, 19));
  expect(morning.sunPosition[0] * evening.sunPosition[0]).toBeLessThan(0);
});

test("a northeast window admits morning sun but blocks direct afternoon sun", () => {
  const date = new Date("2026-06-21T12:00:00Z");
  expect(deskDaylight(stockholmPreviewDate(date, 9)).sunIntensity).toBeGreaterThan(0);
  const afternoon = deskDaylight(stockholmPreviewDate(date, 14));
  expect(afternoon.daylight).toBe(1);
  expect(afternoon.sunIntensity).toBe(0);
});
