import { createLiveClockApplication } from "./liveClock";
import type { SelectedClockSnapshot } from "./selectedClockSnapshot";

const snapshot: SelectedClockSnapshot = {
  version: 1,
  nextAddSequence: 2,
  selectedClocks: [
    {
      kind: "city",
      selectionId: "flip-city",
      addSequence: 0,
      catalogId: "flip-city",
      city: "Flip City",
      primaryCountryCode: "XX",
      countries: [{ code: "XX", name: "Example" }],
      ianaId: "Test/Flip",
    },
    {
      kind: "custom",
      selectionId: "office",
      addSequence: 1,
      name: "Office",
      offsetMinutes: 60,
    },
  ],
};

const createHarness = (initialInstant = "2026-01-15T07:32:00Z") => {
  let now = Date.parse(initialInstant);
  const app = createLiveClockApplication({
    time: {
      now: () => now,
      schedule: () => () => undefined,
    },
    devicePreferences: {
      read: () => ({
        timeZone: "UTC",
        locale: "en-US",
        uses24HourClock: true,
      }),
    },
    timezoneRules: {
      project: (instantMs, timeZone) => {
        const instant = new Date(instantMs);
        if (timeZone === "Test/Flip") {
          const beforeFlip = instantMs < Date.parse("2026-01-15T07:40:00Z");
          return {
            calendarDate: "2026-01-15",
            hour: beforeFlip ? 6 : 9,
            minute: instant.getUTCMinutes(),
            effectiveOffsetMinutes: beforeFlip ? -60 : 60,
          };
        }
        return {
          calendarDate: instant.toISOString().slice(0, 10),
          hour: instant.getUTCHours(),
          minute: instant.getUTCMinutes(),
          effectiveOffsetMinutes: 0,
        };
      },
    },
    catalog: { search: () => [], findById: () => undefined },
    selectedClockStorage: {
      load: async () => snapshot,
      replace: async () => undefined,
    },
  });
  return {
    app,
    setNow: (instant: string) => {
      now = Date.parse(instant);
    },
  };
};

describe("clock-row Virtual time", () => {
  it("reanchors through each row while preserving one shared comparison instant", async () => {
    const { app } = createHarness();
    await app.initialize();

    expect(app.adjustRow("local", "earlier")).toBe(true);
    expect(app.getScreen()).toMatchObject({
      mode: "virtual",
      sampledInstantMs: Date.parse("2026-01-15T07:30:00Z"),
      status: { offset: "−0:02" },
      announcement: { message: "Virtual time, 2 minutes earlier, 07:30." },
      clockRequest: {
        clockId: "local",
        scrollIntoView: false,
        focus: true,
      },
    });
    expect(app.getScreen().clocks.map(({ time }) => time)).toEqual([
      "06:30",
      "07:30",
      "08:30",
    ]);

    app.backToLive();
    expect(app.adjustRow("local", "later")).toBe(true);
    expect(app.getScreen().status).toMatchObject({ offset: "+0:13" });

    expect(app.adjustRow("office", "later")).toBe(true);
    expect(app.getScreen()).toMatchObject({
      mode: "virtual",
      sampledInstantMs: Date.parse("2026-01-15T08:00:00Z"),
      status: { offset: "+0:28" },
      clockRequest: {
        clockId: "office",
        scrollIntoView: false,
        focus: true,
      },
    });
    expect(new Set(app.getScreen().clocks.map(({ calendarDate }) => calendarDate))).toEqual(
      new Set(["2026-01-15"]),
    );
  });

  it("continues on the status offset grid after a row-derived remainder", async () => {
    const { app } = createHarness();
    await app.initialize();

    app.adjustRow("local", "later");
    app.adjustStatus("later");

    expect(app.getScreen()).toMatchObject({
      sampledInstantMs: Date.parse("2026-01-15T08:00:00Z"),
      status: { offset: "+0:28" },
    });
  });

  it("moves away from exact quarters and wraps the nonzero row lattice", async () => {
    const exact = createHarness("2026-01-15T07:30:00Z").app;
    await exact.initialize();
    exact.adjustRow("local", "earlier");
    expect(exact.getScreen().status).toMatchObject({ offset: "−0:15" });
    exact.backToLive();
    exact.adjustRow("local", "later");
    expect(exact.getScreen().status).toMatchObject({ offset: "+0:15" });

    const { app } = createHarness();
    await app.initialize();
    app.adjustRow("local", "later");
    for (let step = 0; step < 95; step += 1) app.adjustStatus("later");
    expect(app.getScreen().status).toMatchObject({ offset: "+23:58" });
    app.adjustRow("local", "later");
    expect(app.getScreen()).toMatchObject({
      status: { offset: "−23:47" },
      announcement: { message: expect.stringMatching(/^Wrapped\./) },
    });
    app.adjustRow("local", "earlier");
    expect(app.getScreen().status).toMatchObject({ offset: "+23:58" });
  });

  it("derives pointer moves from gesture start, cancels cleanly, and reconciles held order", async () => {
    const { app, setNow } = createHarness();
    await app.initialize();
    expect(app.getScreen().clocks.map(({ id }) => id)).toEqual([
      "flip-city",
      "local",
      "office",
    ]);

    expect(app.beginRowScrub("local")).toBe(true);
    app.updateRowScrub(1);
    expect(app.getScreen().status).toMatchObject({ offset: "+0:13" });
    app.updateRowScrub(2);
    expect(app.getScreen().status).toMatchObject({ offset: "+0:28" });
    app.updateRowScrub(1);
    expect(app.getScreen().status).toMatchObject({ offset: "+0:13" });
    expect(app.getScreen().clocks.map(({ id }) => id)).toEqual([
      "flip-city",
      "local",
      "office",
    ]);

    app.cancelRowScrub();
    expect(app.getScreen()).toMatchObject({ mode: "live" });

    app.beginRowScrub("local");
    app.updateRowScrub(2);
    setNow("2026-01-15T10:00:00Z");
    app.refresh();
    expect(app.getScreen().sampledInstantMs).toBe(
      Date.parse("2026-01-15T08:00:00Z"),
    );
    expect(app.getScreen().clocks.map(({ id }) => id)).toEqual([
      "flip-city",
      "local",
      "office",
    ]);

    app.endRowScrub();
    expect(app.getScreen().clocks.map(({ id }) => id)).toEqual([
      "local",
      "flip-city",
      "office",
    ]);
    expect(app.getScreen().clockRequest).toMatchObject({
      clockId: "local",
      scrollIntoView: false,
      focus: true,
    });
  });
});
