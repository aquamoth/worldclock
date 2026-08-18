import {
  resolvePrimaryCountryName,
  type ClockCatalogEntry,
} from "../catalog";
import {
  projectClockCollection,
  type ClockCollectionProjection,
  type TimezoneRules,
} from "../domain/clockCollection";
import {
  emptySelectedClockSnapshot,
  type SelectedClockSnapshot,
} from "./selectedClockSnapshot";

export interface TimePort {
  now(): number;
  schedule(callback: () => void, delayMs: number): () => void;
}

export interface DevicePreferences {
  readonly timeZone: string;
  readonly locale: string;
  readonly uses24HourClock: boolean;
}

export interface DevicePreferencesPort {
  read(): DevicePreferences;
}

export type TimezoneRulesPort = TimezoneRules;

export interface ClockCatalogPort {
  search(query: string): readonly ClockCatalogEntry[];
  findById(catalogId: string): ClockCatalogEntry | undefined;
}

export interface SelectedClockStoragePort {
  load(): Promise<SelectedClockSnapshot | null>;
  replace(snapshot: SelectedClockSnapshot): Promise<void>;
}

export interface SelectorResultModel {
  readonly catalogId: string;
  readonly city: string;
  readonly countryName: string;
  readonly ianaId: string;
  readonly available: boolean;
}

export interface ClockSelectorModel {
  readonly query: string;
  readonly results: readonly SelectorResultModel[];
  readonly isAdding: boolean;
}

export interface LiveClockScreenModel {
  readonly mode: "live";
  readonly isReady: boolean;
  readonly sampledInstantMs: number;
  readonly clocks: readonly ClockCollectionProjection[];
  readonly emptyGuidance?: "Add a timezone to compare times around the world.";
  readonly selector?: ClockSelectorModel;
  readonly clockRequest?: {
    readonly clockId: string;
    readonly sequence: number;
    readonly scrollIntoView: true;
    readonly focus: true;
  };
}

export interface LiveClockApplication {
  getScreen(): LiveClockScreenModel;
  subscribe(listener: () => void): () => void;
  initialize(): Promise<void>;
  refresh(): void;
  start(): void;
  stop(): void;
  openSelector(): void;
  searchSelector(query: string): void;
  cancelSelector(): void;
  addCity(catalogId: string): Promise<boolean>;
}

export interface LiveClockDependencies {
  readonly time: TimePort;
  readonly devicePreferences: DevicePreferencesPort;
  readonly timezoneRules: TimezoneRulesPort;
  readonly catalog: ClockCatalogPort;
  readonly selectedClockStorage: SelectedClockStoragePort;
}

const EMPTY_GUIDANCE = "Add a timezone to compare times around the world.";

export function createLiveClockApplication(
  dependencies: LiveClockDependencies,
): LiveClockApplication {
  const listeners = new Set<() => void>();
  let snapshot = emptySelectedClockSnapshot();
  let isReady = false;
  let selectorQuery: string | undefined;
  let heldClockOrder: readonly string[] | undefined;
  let isAdding = false;
  let clockRequest: LiveClockScreenModel["clockRequest"];
  let clockRequestSequence = 0;
  let cancelScheduledTick: (() => void) | undefined;
  let initialization: Promise<void> | undefined;

  const selectorResults = (): readonly SelectorResultModel[] => {
    if (selectorQuery === undefined) return [];
    const selectedCatalogIds = new Set(
      snapshot.selectedClocks.map(({ catalogId }) => catalogId),
    );
    return dependencies.catalog.search(selectorQuery).map((entry) => ({
      catalogId: entry.id,
      city: entry.city,
      countryName: resolvePrimaryCountryName(entry),
      ianaId: entry.ianaId,
      available: !selectedCatalogIds.has(entry.id),
    }));
  };

  const sampleScreen = (): LiveClockScreenModel => {
    const sampledInstantMs = dependencies.time.now();
    const preferences = dependencies.devicePreferences.read();
    let clocks = projectClockCollection(
      {
        instantMs: sampledInstantMs,
        localTimeZone: preferences.timeZone,
        locale: preferences.locale,
        hourPreference: preferences.uses24HourClock ? "24-hour" : "12-hour",
        selected: snapshot.selectedClocks,
      },
      dependencies.timezoneRules,
    );

    if (heldClockOrder !== undefined) {
      const heldPosition = new Map(
        heldClockOrder.map((clockId, index) => [clockId, index]),
      );
      clocks = [...clocks].sort(
        (left, right) =>
          (heldPosition.get(left.id) ?? Number.MAX_SAFE_INTEGER) -
          (heldPosition.get(right.id) ?? Number.MAX_SAFE_INTEGER),
      );
    }

    return {
      mode: "live",
      isReady,
      sampledInstantMs,
      clocks,
      ...(snapshot.selectedClocks.length === 0
        ? { emptyGuidance: EMPTY_GUIDANCE }
        : {}),
      ...(selectorQuery === undefined
        ? {}
        : {
            selector: {
              query: selectorQuery,
              results: selectorResults(),
              isAdding,
            },
          }),
      ...(clockRequest === undefined ? {} : { clockRequest }),
    };
  };

  let screen = sampleScreen();

  const notify = (): void => {
    listeners.forEach((listener) => listener());
  };

  const resample = (): void => {
    screen = sampleScreen();
    notify();
  };

  const scheduleNextMinute = (): void => {
    cancelScheduledTick?.();
    const delayMs = 60_000 - (dependencies.time.now() % 60_000);
    cancelScheduledTick = dependencies.time.schedule(() => {
      resample();
      scheduleNextMinute();
    }, delayMs);
  };

  const initialize = (): Promise<void> => {
    initialization ??= dependencies.selectedClockStorage.load().then((loaded) => {
      snapshot = loaded ?? emptySelectedClockSnapshot();
      isReady = true;
      resample();
    });
    return initialization;
  };

  return {
    getScreen: () => screen,
    subscribe: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    initialize,
    refresh: resample,
    start: () => {
      scheduleNextMinute();
      void initialize();
    },
    stop: () => {
      cancelScheduledTick?.();
      cancelScheduledTick = undefined;
    },
    openSelector: () => {
      selectorQuery = "";
      heldClockOrder = screen.clocks.map(({ id }) => id);
      resample();
    },
    searchSelector: (query) => {
      if (selectorQuery === undefined) return;
      selectorQuery = query;
      resample();
    },
    cancelSelector: () => {
      if (selectorQuery === undefined || isAdding) return;
      selectorQuery = undefined;
      heldClockOrder = undefined;
      resample();
    },
    addCity: async (catalogId) => {
      if (selectorQuery === undefined || isAdding) return false;
      if (
        snapshot.selectedClocks.some(
          (selected) => selected.catalogId === catalogId,
        )
      ) {
        return false;
      }
      const entry = dependencies.catalog.findById(catalogId);
      if (entry === undefined) return false;

      isAdding = true;
      resample();
      const addSequence = snapshot.nextAddSequence;
      const selectionId = `selection-${addSequence}-${entry.id}`;
      const candidate: SelectedClockSnapshot = {
        version: 1,
        nextAddSequence: addSequence + 1,
        selectedClocks: [
          ...snapshot.selectedClocks,
          {
            kind: "city",
            selectionId,
            addSequence,
            catalogId: entry.id,
            city: entry.city,
            primaryCountryCode: entry.primaryCountryCode,
            countries: entry.countries.map(({ code, name }) => ({ code, name })),
            ianaId: entry.ianaId,
          },
        ],
      };

      try {
        await dependencies.selectedClockStorage.replace(candidate);
      } catch (error) {
        isAdding = false;
        resample();
        throw error;
      }

      snapshot = candidate;
      isAdding = false;
      selectorQuery = undefined;
      heldClockOrder = undefined;
      clockRequestSequence += 1;
      clockRequest = {
        clockId: selectionId,
        sequence: clockRequestSequence,
        scrollIntoView: true,
        focus: true,
      };
      resample();
      return true;
    },
  };
}
