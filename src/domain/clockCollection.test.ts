import { createIntlTimezoneRules } from "../adapters/intlTimezoneRules";
import {
  projectClockCollection,
  sortChronologically,
  type CityClockDefinition,
  type CustomClockDefinition,
} from "./clockCollection";

const city = (
  selectionId: string,
  ianaId: string,
  name: string,
  addSequence = 1,
): CityClockDefinition => ({
  kind: "city",
  selectionId,
  addSequence,
  catalogId: `catalog-${selectionId}`,
  city: name,
  primaryCountryCode: "XX",
  countries: [{ code: "XX", name: "Example" }],
  ianaId,
});

const custom = (
  selectionId: string,
  name: string,
  offsetMinutes: number,
  addSequence = 1,
): CustomClockDefinition => ({
  kind: "custom",
  selectionId,
  addSequence,
  name,
  offsetMinutes,
});

const project = (
  instant: string,
  localTimeZone: string,
  selected: readonly (CityClockDefinition | CustomClockDefinition)[],
) =>
  projectClockCollection(
    {
      instantMs: Date.parse(instant),
      localTimeZone,
      locale: "en-US",
      hourPreference: "24-hour",
      selected,
    },
    createIntlTimezoneRules(),
  );

describe("clock collection projection", () => {
  it.each([
    ["2026-01-15T12:00:00Z", "2026-01-15", "13:00", "UTC+01:00", "07:00", "UTC−05:00"],
    ["2026-07-15T12:00:00Z", "2026-07-15", "14:00", "UTC+02:00", "08:00", "UTC−04:00"],
  ])(
    "projects Stockholm and New York at %s",
    (instant, calendarDate, localTime, localOffset, selectedTime, selectedOffset) => {
      const clocks = project(instant, "Europe/Stockholm", [
        city("new-york", "America/New_York", "New York"),
      ]);

      expect(clocks.find(({ id }) => id === "local")).toMatchObject({
        calendarDate,
        time: localTime,
        effectiveOffset: localOffset,
      });
      expect(clocks.find(({ id }) => id === "new-york")).toMatchObject({
        calendarDate,
        time: selectedTime,
        effectiveOffset: selectedOffset,
      });
      expect(clocks.find(({ id }) => id === "new-york")).not.toHaveProperty(
        "dayDifference",
      );
    },
  );

  it("projects and orders Pago Pago, UTC Local, and Kiritimati across the date line", () => {
    const clocks = project("2026-01-01T10:30:00Z", "UTC", [
      city("pago-pago", "Pacific/Pago_Pago", "Pago Pago", 1),
      city("kiritimati", "Pacific/Kiritimati", "Kiritimati", 2),
    ]);

    expect(clocks.map(({ id }) => id)).toEqual([
      "pago-pago",
      "local",
      "kiritimati",
    ]);
    expect(clocks[0]).toMatchObject({
      calendarDate: "2025-12-31",
      time: "23:30",
      dayDifference: "−1",
    });
    expect(clocks[1]).toMatchObject({
      calendarDate: "2026-01-01",
      time: "10:30",
    });
    expect(clocks[2]).toMatchObject({
      calendarDate: "2026-01-02",
      time: "00:30",
      dayDifference: "+1",
    });
  });

  it("preserves the exact +2 and −2 date-line projections", () => {
    const plusTwo = project("2026-01-01T10:30:00Z", "Pacific/Pago_Pago", [
      city("kiritimati", "Pacific/Kiritimati", "Kiritimati"),
    ]);
    expect(plusTwo.find(({ id }) => id === "local")).toMatchObject({
      calendarDate: "2025-12-31",
      time: "23:30",
      effectiveOffset: "UTC−11:00",
    });
    expect(plusTwo.find(({ id }) => id === "kiritimati")).toMatchObject({
      calendarDate: "2026-01-02",
      time: "00:30",
      effectiveOffset: "UTC+14:00",
      dayDifference: "+2",
    });

    const minusTwo = project("2026-01-01T10:30:00Z", "Pacific/Kiritimati", [
      city("pago-pago", "Pacific/Pago_Pago", "Pago Pago"),
    ]);
    expect(minusTwo.find(({ id }) => id === "local")).toMatchObject({
      calendarDate: "2026-01-02",
      time: "00:30",
      effectiveOffset: "UTC+14:00",
    });
    expect(minusTwo.find(({ id }) => id === "pago-pago")).toMatchObject({
      calendarDate: "2025-12-31",
      time: "23:30",
      effectiveOffset: "UTC−11:00",
      dayDifference: "−2",
    });
  });

  it("projects New York through the spring gap and autumn overlap", () => {
    const newYork = city("new-york", "America/New_York", "New York");

    expect(
      project("2026-03-08T06:59:00Z", "Europe/Stockholm", [newYork]).find(
        ({ id }) => id === "new-york",
      ),
    ).toMatchObject({ time: "01:59", effectiveOffset: "UTC−05:00" });
    expect(
      project("2026-03-08T07:00:00Z", "Europe/Stockholm", [newYork]).find(
        ({ id }) => id === "new-york",
      ),
    ).toMatchObject({ time: "03:00", effectiveOffset: "UTC−04:00" });
    expect(
      project("2026-11-01T05:30:00Z", "Europe/Stockholm", [newYork]).find(
        ({ id }) => id === "new-york",
      ),
    ).toMatchObject({ time: "01:30", effectiveOffset: "UTC−04:00" });
    expect(
      project("2026-11-01T06:30:00Z", "Europe/Stockholm", [newYork]).find(
        ({ id }) => id === "new-york",
      ),
    ).toMatchObject({ time: "01:30", effectiveOffset: "UTC−05:00" });
  });

  it("projects Kathmandu's fractional offset", () => {
    expect(
      project("2026-01-15T12:00:00Z", "Europe/Stockholm", [
        city("kathmandu", "Asia/Kathmandu", "Kathmandu"),
      ]).find(({ id }) => id === "kathmandu"),
    ).toMatchObject({ time: "17:45", effectiveOffset: "UTC+05:45" });
  });

  it.each([
    [-720, "2026-01-15", "00:00", "UTC−12:00"],
    [0, "2026-01-15", "12:00", "UTC+00:00"],
    [345, "2026-01-15", "17:45", "UTC+05:45"],
    [840, "2026-01-16", "02:00", "UTC+14:00"],
  ])(
    "projects fixed offset %s with integer arithmetic and no DST rules",
    (offsetMinutes, calendarDate, time, effectiveOffset) => {
      const rules = createIntlTimezoneRules();
      const projectRules = jest.spyOn(rules, "project");

      const selected = projectClockCollection(
        {
          instantMs: Date.parse("2026-01-15T12:00:00Z"),
          localTimeZone: "Europe/Stockholm",
          locale: "en-US",
          hourPreference: "24-hour",
          selected: [custom("reference", "Reference", offsetMinutes)],
        },
        rules,
      ).find(({ id }) => id === "reference");

      expect(selected).toMatchObject({
        kind: "custom",
        name: "Reference",
        calendarDate,
        time,
        effectiveOffset,
        canEdit: true,
      });
      expect(projectRules).toHaveBeenCalledTimes(1);
    },
  );

  it.each([
    ["2026-01-01T10:30:00Z", "Pacific/Pago_Pago", "Pacific/Kiritimati", "+2"],
    ["2026-01-01T10:30:00Z", "Pacific/Kiritimati", "Pacific/Pago_Pago", "−2"],
    ["2026-01-01T11:30:00Z", "Pacific/Honolulu", "Pacific/Auckland", "+1"],
    ["2026-01-01T11:30:00Z", "Pacific/Auckland", "Pacific/Honolulu", "−1"],
    ["2026-01-01T10:30:00Z", "Europe/Stockholm", "Europe/Paris", undefined],
  ])(
    "at %s reports the actual day difference from %s to %s",
    (instant, localTimeZone, selectedTimeZone, dayDifference) => {
      const selected = project(instant, localTimeZone, [
        city("selected", selectedTimeZone, "Selected"),
      ]).find(({ id }) => id === "selected");

      if (dayDifference === undefined) {
        expect(selected).not.toHaveProperty("dayDifference");
      } else {
        expect(selected).toMatchObject({ dayDifference });
      }
    },
  );

  it("sorts by calendar date and wall minute with Local/add-sequence/stable-ID ties", () => {
    expect(
      sortChronologically([
        { id: "later", kind: "selected", calendarDate: "2026-01-02", minuteOfDay: 0, addSequence: 1 },
        { id: "b", kind: "selected", calendarDate: "2026-01-01", minuteOfDay: 630, addSequence: 2 },
        { id: "local", kind: "local", calendarDate: "2026-01-01", minuteOfDay: 630 },
        { id: "a", kind: "selected", calendarDate: "2026-01-01", minuteOfDay: 630, addSequence: 2 },
        { id: "first", kind: "selected", calendarDate: "2026-01-01", minuteOfDay: 630, addSequence: 1 },
        { id: "earlier", kind: "selected", calendarDate: "2025-12-31", minuteOfDay: 1430, addSequence: 3 },
      ]).map(({ id }) => id),
    ).toEqual(["earlier", "local", "first", "a", "b", "later"]);
  });

  it("reorders New York against UTC−04:30 between winter and summer", () => {
    const winter = sortChronologically([
      { id: "new-york", kind: "selected", calendarDate: "2026-01-15", minuteOfDay: 420, addSequence: 1 },
      { id: "fixed", kind: "selected", calendarDate: "2026-01-15", minuteOfDay: 450, addSequence: 2 },
    ]).map(({ id }) => id);
    const summer = sortChronologically([
      { id: "new-york", kind: "selected", calendarDate: "2026-07-15", minuteOfDay: 480, addSequence: 1 },
      { id: "fixed", kind: "selected", calendarDate: "2026-07-15", minuteOfDay: 450, addSequence: 2 },
    ]).map(({ id }) => id);

    expect(winter).toEqual(["new-york", "fixed"]);
    expect(summer).toEqual(["fixed", "new-york"]);
  });
});
