import { deskDaylight, deskLook, nextDeskStage, stockholmPreviewDate, windowLit } from "./deskDaylight";

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
    // Mid-morning: the morning light has gone and it looks like the
    // afternoon, so back is this morning's stage.
    expect(deskLook(oct30("09:40"))).toBe("afternoon");
    expect(local(nextDeskStage(oct30("09:40"), -1))).toBe("30 07:46");
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

describe("each step shows a different room", () => {
  const oct30 = (hhmm: string) => new Date(`2026-10-30T${hhmm}:00+01:00`);
  const local = (date: Date) =>
    new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Stockholm", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" })
      .format(date)
      .replace(", ", " ");

  test("the room stays light until the sun has set", () => {
    // 15:30 and 15:55, the sun low but up: still the afternoon, so forward
    // is the 15:59 sunset.
    expect(deskLook(oct30("15:30"))).toBe("afternoon");
    expect(deskLook(oct30("15:55"))).toBe("afternoon");
    expect(local(nextDeskStage(oct30("15:30"), 1))).toBe("30 15:59");
    // Just after sunset it's twilight: forward to night, back to midday.
    expect(deskLook(oct30("16:10"))).toBe("twilight");
    expect(local(nextDeskStage(oct30("16:10"), 1))).toBe("30 17:43");
    expect(local(nextDeskStage(oct30("16:10"), -1))).toBe("30 11:31");
  });

  test("every stop looks like itself", () => {
    expect(deskLook(oct30("07:46"))).toBe("morning");
    expect(deskLook(oct30("11:31"))).toBe("afternoon");
    expect(deskLook(oct30("15:59"))).toBe("twilight");
    expect(deskLook(oct30("17:43"))).toBe("night");
  });

  test("stepping forward through a day never lands on the look it left", () => {
    for (const start of ["06:30", "08:30", "10:00", "13:00", "15:30", "16:30", "20:00", "23:30"]) {
      const from = oct30(start);
      const next = nextDeskStage(from, 1);
      expect(deskLook(next)).not.toBe(deskLook(from));
      const back = nextDeskStage(from, -1);
      expect(deskLook(back)).not.toBe(deskLook(from));
    }
  });
});

test("the light comes through the window in the morning and twilight looks, from the sun otherwise", () => {
  const at = (iso: string) => deskDaylight(new Date(iso));
  expect(windowLit(at("2026-10-30T07:46:00+01:00"))).toBe(true);
  expect(windowLit(at("2026-10-30T11:31:00+01:00"))).toBe(false);
  // A late-October afternoon: low sun, but still the sun's, right up to sunset.
  expect(windowLit(at("2026-10-30T14:58:00+01:00"))).toBe(false);
  expect(windowLit(at("2026-10-30T15:50:00+01:00"))).toBe(false);
  expect(windowLit(at("2026-10-30T15:59:00+01:00"))).toBe(true);
});
