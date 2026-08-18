import type { SelectedClockSnapshot } from "./selectedClockSnapshot";
import { createLiveClockApplication } from "./liveClock";

const initialSnapshot: SelectedClockSnapshot = {
  version: 1,
  nextAddSequence: 2,
  selectedClocks: [
    {
      kind: "city",
      selectionId: "new-york",
      addSequence: 0,
      catalogId: "city-new-york",
      city: "New York",
      primaryCountryCode: "US",
      countries: [{ code: "US", name: "United States" }],
      ianaId: "America/New_York",
    },
    {
      kind: "custom",
      selectionId: "office",
      addSequence: 1,
      name: "Office",
      offsetMinutes: 180,
    },
  ],
};

const createHarness = ({
  writeGate,
  rejectWrite,
}: {
  writeGate?: Promise<void>;
  rejectWrite?: Error;
} = {}) => {
  const writes: SelectedClockSnapshot[] = [];
  let stored = initialSnapshot;
  let newYorkHour = 7;
  const app = createLiveClockApplication({
    time: {
      now: () => Date.parse("2026-01-15T12:00:00Z"),
      schedule: () => () => undefined,
    },
    devicePreferences: {
      read: () => ({
        timeZone: "Europe/Stockholm",
        locale: "en-US",
        uses24HourClock: true,
      }),
    },
    timezoneRules: {
      project: (_instantMs, timeZone) =>
        timeZone === "America/New_York"
          ? {
              calendarDate: "2026-01-15",
              hour: newYorkHour,
              minute: 0,
              effectiveOffsetMinutes: -300,
            }
          : {
              calendarDate: "2026-01-15",
              hour: 13,
              minute: 0,
              effectiveOffsetMinutes: 60,
            },
    },
    catalog: { search: () => [], findById: () => undefined },
    selectedClockStorage: {
      load: async () => stored,
      replace: async (snapshot) => {
        writes.push(snapshot);
        if (rejectWrite !== undefined) throw rejectWrite;
        await writeGate;
        stored = snapshot;
      },
    },
  });
  return {
    app,
    writes,
    stored: () => stored,
    setNewYorkHour: (hour: number) => {
      newYorkHour = hour;
    },
  };
};

describe("selected-clock deletion", () => {
  it("opens a named confirmation only for selected clocks and Cancel changes nothing", async () => {
    const { app, writes, stored } = createHarness();
    await app.initialize();

    expect(app.openDelete("local")).toBe(false);
    expect(app.openDelete("missing")).toBe(false);
    expect(app.openDelete("new-york")).toBe(true);
    expect(app.getScreen().deleteConfirmation).toEqual({
      selectionId: "new-york",
      name: "New York",
      isDeleting: false,
    });

    expect(app.cancelDelete()).toBe(true);
    expect(app.getScreen().deleteConfirmation).toBeUndefined();
    expect(app.getScreen().clocks.map(({ id }) => id)).toEqual([
      "new-york",
      "local",
      "office",
    ]);
    expect(writes).toHaveLength(0);
    expect(stored()).toEqual(initialSnapshot);
  });

  it("removes only after one atomic write, ignores repeats, announces once, and focuses the next row", async () => {
    let releaseWrite: (() => void) | undefined;
    const writeGate = new Promise<void>((resolve) => {
      releaseWrite = resolve;
    });
    const { app, writes, stored } = createHarness({ writeGate });
    await app.initialize();
    app.openDelete("new-york");

    const firstDelete = app.confirmDelete();
    const repeatedDelete = app.confirmDelete();
    await Promise.resolve();

    expect(writes).toHaveLength(1);
    expect(app.getScreen().deleteConfirmation?.isDeleting).toBe(true);
    expect(app.getScreen().clocks.map(({ id }) => id)).toContain("new-york");
    expect(app.cancelDelete()).toBe(false);
    await expect(repeatedDelete).resolves.toBe(false);

    releaseWrite?.();
    await expect(firstDelete).resolves.toBe(true);

    expect(stored().selectedClocks.map(({ selectionId }) => selectionId)).toEqual([
      "office",
    ]);
    expect(app.getScreen().clocks.map(({ id }) => id)).toEqual([
      "local",
      "office",
    ]);
    expect(app.getScreen().deleteConfirmation).toBeUndefined();
    expect(app.getScreen().clockRequest).toEqual({
      clockId: "local",
      sequence: 1,
      scrollIntoView: false,
      focus: true,
    });
    expect(app.getScreen().announcement).toEqual({
      sequence: 1,
      message: "New York removed.",
    });

    app.refresh();
    expect(app.getScreen().announcement?.sequence).toBe(1);
    expect(writes).toHaveLength(1);
  });

  it("focuses the previous displayed row when no next row remains", async () => {
    const { app } = createHarness();
    await app.initialize();
    app.openDelete("office");

    await expect(app.confirmDelete()).resolves.toBe(true);

    expect(app.getScreen().clockRequest).toMatchObject({
      clockId: "local",
      scrollIntoView: false,
      focus: true,
    });
  });

  it("freezes chronological order behind confirmation and reconciles when it closes", async () => {
    const { app, setNewYorkHour } = createHarness();
    await app.initialize();
    app.openDelete("office");

    setNewYorkHour(14);
    app.refresh();
    expect(app.getScreen().clocks.map(({ id }) => id)).toEqual([
      "new-york",
      "local",
      "office",
    ]);

    app.cancelDelete();
    expect(app.getScreen().clocks.map(({ id }) => id)).toEqual([
      "local",
      "new-york",
      "office",
    ]);
  });

  it("keeps the confirmation and prior collection when the atomic write fails", async () => {
    const failure = new Error("storage unavailable");
    const { app, writes, stored } = createHarness({ rejectWrite: failure });
    await app.initialize();
    app.openDelete("new-york");

    await expect(app.confirmDelete()).resolves.toBe(false);

    expect(writes).toHaveLength(1);
    expect(stored()).toEqual(initialSnapshot);
    expect(app.getScreen().clocks.map(({ id }) => id)).toContain("new-york");
    expect(app.getScreen().deleteConfirmation).toEqual({
      selectionId: "new-york",
      name: "New York",
      isDeleting: false,
    });
    expect(app.getScreen().announcement).toBeUndefined();
    expect(app.getScreen().persistenceError).toMatchObject({
      operation: "write",
      retryLabel: "Retry",
    });
  });
});
