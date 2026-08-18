import type { ClockCatalogEntry } from "../catalog";
import { createLiveClockApplication } from "./liveClock";
import type { SelectedClockSnapshot } from "./selectedClockSnapshot";

const newYork: ClockCatalogEntry = {
  id: "city-new-york",
  ianaId: "America/New_York",
  city: "New York",
  primaryCountryCode: "US",
  countries: [{ code: "US", name: "United States" }],
  aliases: ["NYC"],
};

const detroit: ClockCatalogEntry = {
  ...newYork,
  id: "city-detroit",
  city: "Detroit",
  aliases: [],
};

const projectionByZone = {
  "Europe/Stockholm": {
    calendarDate: "2026-01-15",
    hour: 13,
    minute: 0,
    effectiveOffsetMinutes: 60,
  },
  "America/New_York": {
    calendarDate: "2026-01-15",
    hour: 7,
    minute: 0,
    effectiveOffsetMinutes: -300,
  },
} as const;

const createHarness = (
  initial: SelectedClockSnapshot | null = null,
  catalogEntries: readonly ClockCatalogEntry[] = [newYork, detroit],
  commitGate?: Promise<void>,
) => {
  let stored = initial;
  const writes: SelectedClockSnapshot[] = [];
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
        projectionByZone[timeZone as keyof typeof projectionByZone],
    },
    catalog: {
      search: (query) =>
        catalogEntries.filter(({ city }) =>
          city.toLocaleLowerCase().includes(query.toLocaleLowerCase()),
        ),
      findById: (catalogId) =>
        catalogEntries.find(({ id }) => id === catalogId),
    },
    selectedClockStorage: {
      load: async () => stored,
      replace: async (snapshot) => {
        writes.push(snapshot);
        await commitGate;
        stored = snapshot;
      },
    },
  });

  return { app, writes, stored: () => stored };
};

describe("offline city clocks", () => {
  it("adds one searched city only after one atomic write, then closes and focuses it", async () => {
    const { app, writes } = createHarness();
    await app.initialize();

    app.openSelector();
    app.searchSelector("new york");
    expect(app.getScreen().selector?.results).toEqual([
      expect.objectContaining({
        catalogId: "city-new-york",
        city: "New York",
        countryName: "United States",
        available: true,
      }),
    ]);

    await expect(app.addCity("city-new-york")).resolves.toBe(true);

    expect(writes).toHaveLength(1);
    expect(writes[0]).toEqual({
      version: 1,
      nextAddSequence: 1,
      selectedClocks: [
        {
          kind: "city",
          selectionId: "selection-0-city-new-york",
          addSequence: 0,
          catalogId: "city-new-york",
          city: "New York",
          primaryCountryCode: "US",
          countries: [{ code: "US", name: "United States" }],
          ianaId: "America/New_York",
        },
      ],
    });
    expect(app.getScreen().selector).toBeUndefined();
    expect(app.getScreen().clocks.map(({ id }) => id)).toEqual([
      "selection-0-city-new-york",
      "local",
    ]);
    expect(app.getScreen().clocks[0]).toMatchObject({
      name: "New York",
      time: "07:00",
      effectiveOffset: "UTC−05:00",
    });
    expect(app.getScreen().clockRequest).toEqual({
      clockId: "selection-0-city-new-york",
      sequence: 1,
      scrollIntoView: true,
      focus: true,
    });
    await expect(app.addCity("city-detroit")).resolves.toBe(false);
    expect(writes).toHaveLength(1);
  });

  it("does not expose an added city until the atomic write succeeds", async () => {
    let releaseWrite: (() => void) | undefined;
    const commitGate = new Promise<void>((resolve) => {
      releaseWrite = resolve;
    });
    const { app, writes } = createHarness(null, [newYork], commitGate);
    await app.initialize();
    app.openSelector();

    const adding = app.addCity("city-new-york");
    await Promise.resolve();

    expect(writes).toHaveLength(1);
    expect(app.getScreen().clocks).toHaveLength(1);
    expect(app.getScreen().selector).toMatchObject({ isAdding: true });

    app.cancelSelector();
    expect(app.getScreen().selector).toMatchObject({ isAdding: true });

    releaseWrite?.();
    await adding;
    expect(app.getScreen().clocks).toHaveLength(2);
  });

  it("marks an exact catalog duplicate unavailable but permits a distinct city sharing its IANA zone", async () => {
    const { app, writes } = createHarness();
    await app.initialize();
    app.openSelector();
    await app.addCity("city-new-york");

    app.openSelector();
    expect(app.getScreen().selector?.results).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ catalogId: "city-new-york", available: false }),
        expect.objectContaining({ catalogId: "city-detroit", available: true }),
      ]),
    );
    await expect(app.addCity("city-new-york")).resolves.toBe(false);
    await expect(app.addCity("city-detroit")).resolves.toBe(true);

    expect(writes).toHaveLength(2);
    expect(app.getScreen().clocks.map(({ name }) => name)).toEqual([
      "New York",
      "Detroit",
      "Local",
    ]);
  });

  it("cancels the selector without writing", async () => {
    const { app, writes } = createHarness();
    await app.initialize();
    app.openSelector();
    app.searchSelector("new");

    app.cancelSelector();

    expect(app.getScreen().selector).toBeUndefined();
    expect(writes).toEqual([]);
  });

  it("restores captured city metadata even after the catalog entry is removed", async () => {
    const captured: SelectedClockSnapshot = {
      version: 1,
      nextAddSequence: 8,
      selectedClocks: [
        {
          kind: "city",
          selectionId: "saved-new-york",
          addSequence: 7,
          catalogId: "retired-catalog-entry",
          city: "Captured New York",
          primaryCountryCode: "US",
          countries: [{ code: "US", name: "Captured United States" }],
          ianaId: "America/New_York",
        },
      ],
    };
    const { app } = createHarness(captured, []);

    await app.initialize();

    expect(app.getScreen().clocks[0]).toMatchObject({
      id: "saved-new-york",
      name: "Captured New York",
      countryName: "Captured United States",
      time: "07:00",
    });
  });

  it("holds displayed order behind the selector and reconciles after cancel", async () => {
    let season: "winter" | "summer" = "winter";
    const saved: SelectedClockSnapshot = {
      version: 1,
      nextAddSequence: 2,
      selectedClocks: [
        {
          kind: "city",
          selectionId: "new-york",
          addSequence: 0,
          catalogId: "new-york",
          city: "New York",
          primaryCountryCode: "US",
          countries: [{ code: "US", name: "United States" }],
          ianaId: "America/New_York",
        },
        {
          kind: "city",
          selectionId: "panama",
          addSequence: 1,
          catalogId: "panama",
          city: "Panama",
          primaryCountryCode: "PA",
          countries: [{ code: "PA", name: "Panama" }],
          ianaId: "America/Panama",
        },
      ],
    };
    const app = createLiveClockApplication({
      time: {
        now: () => Date.parse("2026-01-15T12:00:00Z"),
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
        project: (_instant, zone) => ({
          calendarDate: "2026-01-15",
          hour:
            zone === "UTC"
              ? 12
              : zone === "America/Panama" || season === "winter"
                ? 7
                : 8,
          minute: 0,
          effectiveOffsetMinutes:
            zone === "UTC"
              ? 0
              : zone === "America/Panama" || season === "winter"
                ? -300
                : -240,
        }),
      },
      catalog: { search: () => [], findById: () => undefined },
      selectedClockStorage: {
        load: async () => saved,
        replace: async () => undefined,
      },
    });
    await app.initialize();
    expect(app.getScreen().clocks.map(({ id }) => id)).toEqual([
      "new-york",
      "panama",
      "local",
    ]);

    app.openSelector();
    season = "summer";
    app.refresh();
    expect(app.getScreen().clocks.map(({ id }) => id)).toEqual([
      "new-york",
      "panama",
      "local",
    ]);

    app.cancelSelector();
    expect(app.getScreen().clocks.map(({ id }) => id)).toEqual([
      "panama",
      "new-york",
      "local",
    ]);
  });

  it("uses only injected offline ports while browsing and adding", async () => {
    const fetchSpy = jest.spyOn(global, "fetch");
    const { app } = createHarness();
    await app.initialize();
    app.openSelector();
    app.searchSelector("New York");
    await app.addCity("city-new-york");

    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });
});
