import {
  resolvePrimaryCountryName,
  type ClockCatalogEntry,
} from "../catalog";
import {
  projectClockCollection,
  type ClockCollectionProjection,
  type CustomClockDefinition,
  type TimezoneRules,
} from "../domain/clockCollection";
import {
  CUSTOM_OFFSET_OPTIONS,
  customDuplicateKey,
  validateCustomTimezoneDraft,
} from "../domain/customTimezone";
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

export interface CustomTimezoneFormModel {
  readonly mode: "create" | "edit";
  readonly name: string;
  readonly offsetMinutes: number;
  readonly offsetOptions: readonly number[];
  readonly isSaving: boolean;
  readonly nameError?: string;
  readonly offsetError?: string;
  readonly duplicateError?: string;
}

export interface LiveClockScreenModel {
  readonly mode: "live";
  readonly isReady: boolean;
  readonly sampledInstantMs: number;
  readonly clocks: readonly ClockCollectionProjection[];
  readonly emptyGuidance?: "Add a timezone to compare times around the world.";
  readonly selector?: ClockSelectorModel;
  readonly customForm?: CustomTimezoneFormModel;
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
  openCustomCreator(): boolean;
  openCustomEditor(selectionId: string): boolean;
  updateCustomName(name: string): void;
  selectCustomOffset(offsetMinutes: number): void;
  cancelCustomForm(): void;
  saveCustom(): Promise<boolean>;
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
  let customForm:
    | {
        mode: "create" | "edit";
        selectionId?: string;
        name: string;
        offsetMinutes: number;
        returnSelectorQuery?: string;
        isSaving: boolean;
        nameError?: string | undefined;
        offsetError?: string | undefined;
        duplicateError?: string | undefined;
      }
    | undefined;
  let clockRequest: LiveClockScreenModel["clockRequest"];
  let clockRequestSequence = 0;
  let cancelScheduledTick: (() => void) | undefined;
  let initialization: Promise<void> | undefined;

  const selectorResults = (): readonly SelectorResultModel[] => {
    if (selectorQuery === undefined) return [];
    const selectedCatalogIds = new Set(
      snapshot.selectedClocks.flatMap((clock) =>
        clock.kind === "city" ? [clock.catalogId] : [],
      ),
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
      ...(customForm === undefined
        ? {}
        : {
            customForm: {
              mode: customForm.mode,
              name: customForm.name,
              offsetMinutes: customForm.offsetMinutes,
              offsetOptions: CUSTOM_OFFSET_OPTIONS,
              isSaving: customForm.isSaving,
              ...(customForm.nameError === undefined
                ? {}
                : { nameError: customForm.nameError }),
              ...(customForm.offsetError === undefined
                ? {}
                : { offsetError: customForm.offsetError }),
              ...(customForm.duplicateError === undefined
                ? {}
                : { duplicateError: customForm.duplicateError }),
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
          (selected) =>
            selected.kind === "city" && selected.catalogId === catalogId,
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
    openCustomCreator: () => {
      if (selectorQuery === undefined || isAdding || customForm !== undefined) {
        return false;
      }
      const returnSelectorQuery = selectorQuery;
      selectorQuery = undefined;
      customForm = {
        mode: "create",
        name: "",
        offsetMinutes: 0,
        returnSelectorQuery,
        isSaving: false,
      };
      resample();
      return true;
    },
    openCustomEditor: (selectionId) => {
      if (
        selectorQuery !== undefined ||
        customForm !== undefined ||
        isAdding
      ) {
        return false;
      }
      const selected = snapshot.selectedClocks.find(
        (clock): clock is CustomClockDefinition =>
          clock.kind === "custom" && clock.selectionId === selectionId,
      );
      if (selected === undefined) return false;
      heldClockOrder = screen.clocks.map(({ id }) => id);
      customForm = {
        mode: "edit",
        selectionId,
        name: selected.name,
        offsetMinutes: selected.offsetMinutes,
        isSaving: false,
      };
      resample();
      return true;
    },
    updateCustomName: (name) => {
      if (customForm === undefined || customForm.isSaving) return;
      customForm = {
        ...customForm,
        name,
        nameError: undefined,
        duplicateError: undefined,
      };
      resample();
    },
    selectCustomOffset: (offsetMinutes) => {
      if (customForm === undefined || customForm.isSaving) return;
      customForm = {
        ...customForm,
        offsetMinutes,
        offsetError: undefined,
        duplicateError: undefined,
      };
      resample();
    },
    cancelCustomForm: () => {
      if (customForm === undefined || customForm.isSaving) return;
      const returnSelectorQuery = customForm.returnSelectorQuery;
      customForm = undefined;
      selectorQuery = returnSelectorQuery;
      heldClockOrder = undefined;
      resample();
    },
    saveCustom: async () => {
      if (customForm === undefined || customForm.isSaving) return false;
      const validation = validateCustomTimezoneDraft({
        name: customForm.name,
        offsetMinutes: customForm.offsetMinutes,
      });
      if (!validation.ok) {
        customForm = {
          ...customForm,
          nameError: validation.nameError,
          offsetError: validation.offsetError,
          duplicateError: undefined,
        };
        resample();
        return false;
      }

      const duplicateKey = customDuplicateKey(
        validation.value.name,
        validation.value.offsetMinutes,
      );
      const isDuplicate = snapshot.selectedClocks.some(
        (clock) =>
          clock.kind === "custom" &&
          clock.selectionId !== customForm?.selectionId &&
          customDuplicateKey(clock.name, clock.offsetMinutes) === duplicateKey,
      );
      if (isDuplicate) {
        customForm = {
          ...customForm,
          nameError: undefined,
          offsetError: undefined,
          duplicateError:
            "A custom timezone with this name and offset already exists.",
        };
        resample();
        return false;
      }

      const editingId = customForm.selectionId;
      const addSequence = snapshot.nextAddSequence;
      const selectionId = editingId ?? `selection-${addSequence}-custom`;
      const selectedClocks =
        customForm.mode === "create"
          ? [
              ...snapshot.selectedClocks,
              {
                kind: "custom" as const,
                selectionId,
                addSequence,
                name: validation.value.name,
                offsetMinutes: validation.value.offsetMinutes,
              },
            ]
          : snapshot.selectedClocks.map((clock) =>
              clock.selectionId === editingId && clock.kind === "custom"
                ? {
                    ...clock,
                    name: validation.value.name,
                    offsetMinutes: validation.value.offsetMinutes,
                  }
                : clock,
            );
      const candidate: SelectedClockSnapshot = {
        version: 1,
        nextAddSequence:
          customForm.mode === "create" ? addSequence + 1 : addSequence,
        selectedClocks,
      };

      customForm = { ...customForm, isSaving: true };
      resample();
      try {
        await dependencies.selectedClockStorage.replace(candidate);
      } catch (error) {
        customForm = { ...customForm, isSaving: false };
        resample();
        throw error;
      }
      snapshot = candidate;
      customForm = undefined;
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
