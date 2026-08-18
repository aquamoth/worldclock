import { createLiveClockApplication } from "./liveClock";

const emptyCollectionDependencies = {
  catalog: {
    search: () => [],
    findById: () => undefined,
  },
  selectedClockStorage: {
    load: async () => null,
    replace: async () => undefined,
  },
};

describe("live local clock", () => {
  it("samples one instant and refreshes at the next minute boundary", () => {
    let now = Date.parse("2026-01-15T12:00:42.125Z");
    let scheduledDelay: number | undefined;
    let scheduledTick: (() => void) | undefined;
    const projectedInstants: number[] = [];

    const app = createLiveClockApplication({
      ...emptyCollectionDependencies,
      time: {
        now: () => now,
        schedule: (callback, delayMs) => {
          scheduledTick = callback;
          scheduledDelay = delayMs;
          return () => undefined;
        },
      },
      devicePreferences: {
        read: () => ({
          timeZone: "Europe/Stockholm",
          locale: "sv-SE",
          uses24HourClock: true,
        }),
      },
      timezoneRules: {
        project: (instantMs) => {
          projectedInstants.push(instantMs);
          return {
            calendarDate: "2026-01-15",
            hour: 13,
            minute: instantMs === now ? 0 : 1,
            effectiveOffsetMinutes: 60,
          };
        },
      },
    });

    expect(app.getScreen()).toMatchObject({
      sampledInstantMs: Date.parse("2026-01-15T12:00:42.125Z"),
      emptyGuidance: "Add a timezone to compare times around the world.",
      clocks: [{ id: "local", name: "Local", canDelete: false }],
    });
    expect(projectedInstants).toEqual([
      Date.parse("2026-01-15T12:00:42.125Z"),
    ]);

    app.start();
    expect(scheduledDelay).toBe(17_875);

    now = Date.parse("2026-01-15T12:01:00.000Z");
    scheduledTick?.();

    expect(app.getScreen().sampledInstantMs).toBe(now);
    expect(projectedInstants).toEqual([
      Date.parse("2026-01-15T12:00:42.125Z"),
      Date.parse("2026-01-15T12:01:00.000Z"),
    ]);
  });

  it("reprojects Local when the phone timezone and hour preference change", () => {
    let preferences = {
      timeZone: "Europe/Stockholm",
      locale: "sv-SE",
      uses24HourClock: true,
    };
    const projectionRequests: Array<{
      instantMs: number;
      timeZone: string;
      locale: string;
    }> = [];

    const app = createLiveClockApplication({
      ...emptyCollectionDependencies,
      time: {
        now: () => Date.parse("2026-01-15T12:05:00Z"),
        schedule: () => () => undefined,
      },
      devicePreferences: { read: () => preferences },
      timezoneRules: {
        project: (instantMs, timeZone, locale) => {
          projectionRequests.push({ instantMs, timeZone, locale });
          return timeZone === "America/New_York"
            ? {
                calendarDate: "2026-01-15",
                hour: 7,
                minute: 5,
                effectiveOffsetMinutes: -300,
              }
            : {
                calendarDate: "2026-01-15",
                hour: 13,
                minute: 5,
                effectiveOffsetMinutes: 60,
              };
        },
      },
    });

    expect(app.getScreen().clocks[0]).toMatchObject({
      time: "13:05",
      effectiveOffset: "UTC+01:00",
    });
    expect(app.getScreen().clocks[0]).not.toHaveProperty("period");

    preferences = {
      timeZone: "America/New_York",
      locale: "en-US",
      uses24HourClock: false,
    };
    app.refresh();

    expect(app.getScreen().clocks[0]).toMatchObject({
      time: "7:05",
      period: "AM",
      effectiveOffset: "UTC−05:00",
    });
    expect(projectionRequests.at(-1)).toEqual({
      instantMs: Date.parse("2026-01-15T12:05:00Z"),
      timeZone: "America/New_York",
      locale: "en-US",
    });
  });
});
