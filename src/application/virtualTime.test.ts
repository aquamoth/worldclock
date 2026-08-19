import { createLiveClockApplication } from "./liveClock";
import type { SelectedClockSnapshot } from "./selectedClockSnapshot";

const initialSnapshot: SelectedClockSnapshot = {
  version: 1,
  nextAddSequence: 1,
  selectedClocks: [
    {
      kind: "custom",
      selectionId: "office",
      addSequence: 0,
      name: "Office",
      offsetMinutes: 60,
    },
  ],
};

const createHarness = () => {
  let now = Date.parse("2026-01-15T07:32:00Z");
  const writes: SelectedClockSnapshot[] = [];
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
      project: (instantMs) => {
        const instant = new Date(instantMs);
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
      load: async () => initialSnapshot,
      replace: async (snapshot) => {
        writes.push(snapshot);
      },
    },
  });
  return {
    app,
    writes,
    setNow: (instant: string) => {
      now = Date.parse(instant);
    },
  };
};

describe("status-surface Virtual time", () => {
  it("keeps every clock tracking live time at the held offset until Back", async () => {
    const { app, setNow, writes } = createHarness();
    await app.initialize();

    app.adjustStatus("earlier");
    expect(app.getScreen()).toMatchObject({
      mode: "virtual",
      sampledInstantMs: Date.parse("2026-01-15T07:17:00Z"),
      status: {
        label: "Virtual time",
        offset: "−0:15",
        accessibilityValue: "15 minutes earlier, 07:17",
      },
      clocks: [{ name: "Local", time: "07:17" }, { name: "Office", time: "08:17" }],
    });

    setNow("2026-01-15T09:10:00Z");
    app.refresh();
    expect(app.getScreen()).toMatchObject({
      mode: "virtual",
      sampledInstantMs: Date.parse("2026-01-15T08:55:00Z"),
      status: { offset: "−0:15" },
    });
    expect(app.getScreen().clocks.map(({ time }) => time)).toEqual([
      "08:55",
      "09:55",
    ]);

    app.backToLive();
    expect(app.getScreen()).toMatchObject({
      mode: "live",
      sampledInstantMs: Date.parse("2026-01-15T09:10:00Z"),
      status: { label: "Live", offset: "Now", accessibilityValue: "Live time" },
    });
    expect(writes).toEqual([]);
  });

  it("uses exact discrete steps, exits at zero, and wraps both edges", async () => {
    const { app } = createHarness();
    await app.initialize();

    app.adjustStatus("later");
    expect(app.getScreen()).toMatchObject({
      mode: "virtual",
      sampledInstantMs: Date.parse("2026-01-15T07:47:00Z"),
      status: { offset: "+0:15" },
      announcement: { message: "Virtual time, 15 minutes later, 07:47." },
    });
    app.adjustStatus("earlier");
    expect(app.getScreen()).toMatchObject({
      mode: "live",
      status: { offset: "Now" },
      announcement: { message: "Live time." },
    });

    for (let step = 0; step < 96; step += 1) app.adjustStatus("later");
    expect(app.getScreen().status?.offset).toBe("+24:00");
    app.adjustStatus("later");
    expect(app.getScreen()).toMatchObject({
      status: { offset: "−23:45" },
      announcement: {
        message: "Wrapped. 23 hours 45 minutes earlier, 07:47.",
      },
    });

    app.backToLive();
    for (let step = 0; step < 96; step += 1) app.adjustStatus("earlier");
    expect(app.getScreen().status?.offset).toBe("−24:00");
    app.adjustStatus("earlier");
    expect(app.getScreen().status?.offset).toBe("+23:45");
  });

  it("derives pointer updates from gesture-start state and restores on cancel", async () => {
    const { app } = createHarness();
    await app.initialize();

    app.beginStatusScrub();
    app.updateStatusScrub(-1);
    expect(app.getScreen().status?.offset).toBe("−0:15");
    app.updateStatusScrub(-2);
    expect(app.getScreen().status?.offset).toBe("−0:30");
    app.updateStatusScrub(-1);
    expect(app.getScreen().status?.offset).toBe("−0:15");
    app.cancelStatusScrub();
    expect(app.getScreen()).toMatchObject({
      mode: "live",
      announcement: { message: "Live time." },
    });

    app.beginStatusScrub();
    app.updateStatusScrub(1);
    app.endStatusScrub();
    expect(app.getScreen()).toMatchObject({
      mode: "virtual",
      status: { offset: "+0:15" },
    });
  });

  it("catches a fast swipe on live time until the finger travels past the catch point", async () => {
    const { app } = createHarness();
    await app.initialize();

    app.beginStatusScrub();
    app.updateStatusScrub(1);
    expect(app.getScreen().status?.offset).toBe("+0:15");

    app.updateStatusScrub(-4);
    expect(app.getScreen()).toMatchObject({
      mode: "live",
      announcement: { message: "Live time." },
    });

    // A resting or drifting finger stays caught on now indefinitely.
    app.updateStatusScrub(-5);
    expect(app.getScreen().mode).toBe("live");
    app.updateStatusScrub(-6);
    expect(app.getScreen().mode).toBe("live");

    // Deliberate travel beyond the catch point escapes, one step at a time.
    app.updateStatusScrub(-7);
    expect(app.getScreen()).toMatchObject({
      mode: "virtual",
      status: { offset: "−0:15" },
    });

    // Coming back toward the catch point parks on now again.
    app.updateStatusScrub(-6);
    expect(app.getScreen().mode).toBe("live");
    app.endStatusScrub();
  });

  it("keeps the comparison while mutating but never writes Virtual state", async () => {
    const { app, writes } = createHarness();
    await app.initialize();
    app.adjustStatus("later");
    const comparisonInstantMs = app.getScreen().sampledInstantMs;

    expect(app.openDelete("office")).toBe(true);
    await expect(app.confirmDelete()).resolves.toBe(true);

    expect(app.getScreen()).toMatchObject({
      mode: "virtual",
      sampledInstantMs: comparisonInstantMs,
      status: { offset: "+0:15" },
    });
    expect(writes).toHaveLength(1);
    expect(JSON.stringify(writes[0])).not.toMatch(
      /virtual|comparison|liveReference|displayedOrder/i,
    );
  });
});
