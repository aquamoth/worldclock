import { formatEffectiveOffset, projectClock } from "./clock";

const fieldsAt = (hour: number) => ({
  calendarDate: "2026-01-15",
  hour,
  minute: 5,
  effectiveOffsetMinutes: 0,
});

describe("clock projection formatting", () => {
  it.each([
    [0, "00:05"],
    [12, "12:05"],
    [13, "13:05"],
  ])("formats hour %s using the 24-hour preference", (hour, expected) => {
    expect(projectClock(fieldsAt(hour), "24-hour")).toEqual({
      calendarDate: "2026-01-15",
      time: expected,
      effectiveOffset: "UTC+00:00",
    });
  });

  it.each([
    [0, "12:05", "AM"],
    [12, "12:05", "PM"],
    [13, "1:05", "PM"],
  ] as const)(
    "formats hour %s using the 12-hour preference",
    (hour, expected, period) => {
      expect(projectClock(fieldsAt(hour), "12-hour")).toEqual({
        calendarDate: "2026-01-15",
        time: expected,
        period,
        effectiveOffset: "UTC+00:00",
      });
    },
  );

  it("formats signed effective UTC offsets", () => {
    expect(formatEffectiveOffset(-300)).toBe("UTC−05:00");
    expect(formatEffectiveOffset(345)).toBe("UTC+05:45");
  });

  it("never places seconds in the projection", () => {
    const projection = projectClock(fieldsAt(13), "24-hour");

    expect(projection.time).toBe("13:05");
    expect(projection).not.toHaveProperty("second");
    expect(projection).not.toHaveProperty("seconds");
  });
});
