import { deskDaylight, nextDeskStage, stockholmPreviewDate } from "./deskDaylight";

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

describe("stepping through the day", () => {
  // 30 October 2026 in Stockholm, local time: morning 07:46, noon 11:31,
  // sunset 15:59, night 17:43. The day before: sunset 16:02, night 17:45.
  const local = (date: Date) =>
    new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Stockholm", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" })
      .format(date)
      .replace(", ", " ");
  // A wall-clock time on 30 October, Stockholm (UTC+1 after the DST change).
  const oct30 = (hhmm: string) => new Date(`2026-10-30T${hhmm}:00+01:00`);

  test("from a stage, back and forward go to the neighbouring stages", () => {
    const sunset = nextDeskStage(oct30("13:00"), 1);
    expect(local(sunset)).toBe("30 15:59");
    expect(local(nextDeskStage(sunset, -1))).toBe("30 11:31");
    expect(local(nextDeskStage(sunset, 1))).toBe("30 17:43");
  });

  test("from the live clock in the sunset look, back skips the sunset stage", () => {
    // 16:40: already dark with the sunset at the window, like the 15:59 stage.
    expect(local(nextDeskStage(oct30("16:40"), -1))).toBe("30 11:31");
    expect(local(nextDeskStage(oct30("16:40"), 1))).toBe("30 17:43");
  });

  test("the same holds in every period, overnight included", () => {
    // Mid-morning: back skips this morning's stage, to last night.
    expect(local(nextDeskStage(oct30("09:40"), -1))).toBe("29 17:45");
    // Afternoon: back skips noon, to this morning.
    expect(local(nextDeskStage(oct30("13:00"), -1))).toBe("30 07:46");
    // Small hours: back skips last night's stage, to yesterday's sunset.
    expect(local(nextDeskStage(oct30("03:00"), -1))).toBe("29 16:02");
  });

  test("a preview left on a stage for a while still steps back from that stage", () => {
    const sunset = nextDeskStage(oct30("13:00"), 1);
    const later = new Date(sunset.getTime() + 20 * 60000);
    expect(local(nextDeskStage(later, -1))).toBe("30 11:31");
  });
});
