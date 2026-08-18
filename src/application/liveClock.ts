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
  cityDuplicateKey,
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

export interface DeleteConfirmationModel {
  readonly selectionId: string;
  readonly name: string;
  readonly isDeleting: boolean;
}

export type FocusRequestModel =
  | {
      readonly clockId: string;
      readonly sequence: number;
      readonly scrollIntoView: boolean;
      readonly focus: true;
    }
  | {
      readonly addTimezone: true;
      readonly sequence: number;
      readonly scrollIntoView: boolean;
      readonly focus: true;
    };

export interface LiveClockScreenModel {
  readonly mode: "live";
  readonly isReady: boolean;
  readonly sampledInstantMs: number;
  readonly clocks: readonly ClockCollectionProjection[];
  readonly emptyGuidance?: "Add a timezone to compare times around the world.";
  readonly addTimezoneUnavailableReason?: "Maximum of 24 timezones reached";
  readonly selector?: ClockSelectorModel;
  readonly customForm?: CustomTimezoneFormModel;
  readonly deleteConfirmation?: DeleteConfirmationModel;
  readonly clockRequest?: FocusRequestModel;
  readonly announcement?: {
    readonly sequence: number;
    readonly message: string;
  };
  readonly persistenceError?: {
    readonly operation: "load" | "write";
    readonly message:
      | "Couldn’t load your timezones."
      | "Couldn’t save changes.";
    readonly retryLabel: "Retry";
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
  openDelete(selectionId: string): boolean;
  cancelDelete(): boolean;
  confirmDelete(): Promise<boolean>;
  retryPersistence(): Promise<boolean>;
}

export interface LiveClockDependencies {
  readonly time: TimePort;
  readonly devicePreferences: DevicePreferencesPort;
  readonly timezoneRules: TimezoneRulesPort;
  readonly catalog: ClockCatalogPort;
  readonly selectedClockStorage: SelectedClockStoragePort;
}

const EMPTY_GUIDANCE = "Add a timezone to compare times around the world.";
const MAX_SELECTED_CLOCKS = 24;

type PersistenceState =
  | { readonly status: "idle" }
  | { readonly status: "load-pending" }
  | { readonly status: "load-failed" }
  | { readonly status: "mutation-pending" }
  | {
      readonly status: "write-failed";
      readonly retry: () => Promise<boolean>;
    };

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
  let deleteConfirmation: DeleteConfirmationModel | undefined;
  let announcement: LiveClockScreenModel["announcement"];
  let announcementSequence = 0;
  let cancelScheduledTick: (() => void) | undefined;
  let initialization: Promise<void> | undefined;
  let persistenceState: PersistenceState = { status: "idle" };

  const selectorResults = (): readonly SelectorResultModel[] => {
    if (selectorQuery === undefined) return [];
    const selectedCatalogIds = new Set(
      snapshot.selectedClocks.flatMap((clock) =>
        clock.kind === "city" ? [cityDuplicateKey(clock.catalogId)] : [],
      ),
    );
    return dependencies.catalog.search(selectorQuery).map((entry) => ({
      catalogId: entry.id,
      city: entry.city,
      countryName: resolvePrimaryCountryName(entry),
      ianaId: entry.ianaId,
      available: !selectedCatalogIds.has(cityDuplicateKey(entry.id)),
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

    const persistenceError: LiveClockScreenModel["persistenceError"] =
      persistenceState.status === "load-failed"
        ? {
            operation: "load",
            message: "Couldn’t load your timezones.",
            retryLabel: "Retry",
          }
        : persistenceState.status === "write-failed"
          ? {
              operation: "write",
              message: "Couldn’t save changes.",
              retryLabel: "Retry",
            }
          : undefined;

    return {
      mode: "live",
      isReady,
      sampledInstantMs,
      clocks,
      ...(snapshot.selectedClocks.length === 0
        ? { emptyGuidance: EMPTY_GUIDANCE }
        : {}),
      ...(snapshot.selectedClocks.length >= MAX_SELECTED_CLOCKS
        ? {
            addTimezoneUnavailableReason:
              "Maximum of 24 timezones reached" as const,
          }
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
      ...(deleteConfirmation === undefined ? {} : { deleteConfirmation }),
      ...(clockRequest === undefined ? {} : { clockRequest }),
      ...(announcement === undefined ? {} : { announcement }),
      ...(persistenceError === undefined ? {} : { persistenceError }),
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
    if (isReady) return Promise.resolve();
    if (persistenceState.status === "load-pending") {
      return initialization ?? Promise.resolve();
    }
    persistenceState = { status: "load-pending" };
    initialization ??= dependencies.selectedClockStorage
      .load()
      .then((loaded) => {
        const previousSnapshot = snapshot;
        snapshot = loaded ?? emptySelectedClockSnapshot();
        isReady = true;
        persistenceState = { status: "idle" };
        try {
          resample();
        } catch (error) {
          snapshot = previousSnapshot;
          isReady = false;
          throw error;
        }
      })
      .catch(() => {
        isReady = false;
        persistenceState = { status: "load-failed" };
        resample();
      })
      .finally(() => {
        initialization = undefined;
      });
    return initialization;
  };

  const commitSnapshot = async (
    candidate: SelectedClockSnapshot,
    setPending: (pending: boolean) => void,
    complete: () => void,
  ): Promise<boolean> => {
    if (persistenceState.status === "mutation-pending") return false;
    persistenceState = { status: "mutation-pending" };
    setPending(true);
    resample();
    try {
      await dependencies.selectedClockStorage.replace(candidate);
    } catch {
      setPending(false);
      persistenceState = {
        status: "write-failed",
        retry: () => commitSnapshot(candidate, setPending, complete),
      };
      resample();
      return false;
    }

    snapshot = candidate;
    setPending(false);
    persistenceState = { status: "idle" };
    complete();
    resample();
    return true;
  };

  const discardWriteRetry = (): void => {
    if (persistenceState.status === "write-failed") {
      persistenceState = { status: "idle" };
    }
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
      if (
        deleteConfirmation !== undefined ||
        !isReady ||
        snapshot.selectedClocks.length >= MAX_SELECTED_CLOCKS
      ) {
        return;
      }
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
      discardWriteRetry();
      selectorQuery = undefined;
      heldClockOrder = undefined;
      resample();
    },
    addCity: async (catalogId) => {
      if (
        selectorQuery === undefined ||
        isAdding ||
        persistenceState.status === "mutation-pending" ||
        snapshot.selectedClocks.length >= MAX_SELECTED_CLOCKS
      ) {
        return false;
      }
      if (
        snapshot.selectedClocks.some(
          (selected) =>
            selected.kind === "city" &&
            cityDuplicateKey(selected.catalogId) === cityDuplicateKey(catalogId),
        )
      ) {
        return false;
      }
      const entry = dependencies.catalog.findById(catalogId);
      if (entry === undefined) return false;

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

      return commitSnapshot(
        candidate,
        (pending) => {
          isAdding = pending;
        },
        () => {
          selectorQuery = undefined;
          heldClockOrder = undefined;
          clockRequestSequence += 1;
          clockRequest = {
            clockId: selectionId,
            sequence: clockRequestSequence,
            scrollIntoView: true,
            focus: true,
          };
        },
      );
    },
    openCustomCreator: () => {
      if (
        selectorQuery === undefined ||
        isAdding ||
        customForm !== undefined ||
        snapshot.selectedClocks.length >= MAX_SELECTED_CLOCKS
      ) {
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
        isAdding ||
        deleteConfirmation !== undefined
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
      discardWriteRetry();
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
      discardWriteRetry();
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
      discardWriteRetry();
      const returnSelectorQuery = customForm.returnSelectorQuery;
      customForm = undefined;
      selectorQuery = returnSelectorQuery;
      if (returnSelectorQuery === undefined) heldClockOrder = undefined;
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

      if (
        customForm.mode === "create" &&
        snapshot.selectedClocks.length >= MAX_SELECTED_CLOCKS
      ) {
        return false;
      }
      return commitSnapshot(
        candidate,
        (pending) => {
          if (customForm !== undefined) {
            customForm = { ...customForm, isSaving: pending };
          }
        },
        () => {
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
        },
      );
    },
    openDelete: (selectionId) => {
      if (
        selectorQuery !== undefined ||
        customForm !== undefined ||
        isAdding ||
        deleteConfirmation !== undefined
      ) {
        return false;
      }
      const selected = snapshot.selectedClocks.find(
        (clock) => clock.selectionId === selectionId,
      );
      if (selected === undefined) return false;

      heldClockOrder = screen.clocks.map(({ id }) => id);
      deleteConfirmation = {
        selectionId,
        name: selected.kind === "city" ? selected.city : selected.name,
        isDeleting: false,
      };
      resample();
      return true;
    },
    cancelDelete: () => {
      if (deleteConfirmation === undefined || deleteConfirmation.isDeleting) {
        return false;
      }
      discardWriteRetry();
      deleteConfirmation = undefined;
      heldClockOrder = undefined;
      resample();
      return true;
    },
    confirmDelete: async () => {
      const confirmation = deleteConfirmation;
      if (confirmation === undefined || confirmation.isDeleting) return false;

      const selectedIndex = snapshot.selectedClocks.findIndex(
        (clock) => clock.selectionId === confirmation.selectionId,
      );
      if (selectedIndex < 0) return false;

      const previousOrder = heldClockOrder ?? screen.clocks.map(({ id }) => id);
      const deletedPosition = previousOrder.indexOf(confirmation.selectionId);
      const remainingOrder = previousOrder.filter(
        (clockId) => clockId !== confirmation.selectionId,
      );
      const candidate: SelectedClockSnapshot = {
        ...snapshot,
        selectedClocks: snapshot.selectedClocks.filter(
          (clock) => clock.selectionId !== confirmation.selectionId,
        ),
      };

      return commitSnapshot(
        candidate,
        (pending) => {
          deleteConfirmation = { ...confirmation, isDeleting: pending };
        },
        () => {
          deleteConfirmation = undefined;
          heldClockOrder = undefined;
          const nextClockId =
            remainingOrder[deletedPosition] ??
            remainingOrder[
              Math.min(deletedPosition - 1, remainingOrder.length - 1)
            ];
          clockRequestSequence += 1;
          clockRequest =
            nextClockId === undefined
              ? {
                  addTimezone: true,
                  sequence: clockRequestSequence,
                  scrollIntoView: false,
                  focus: true,
                }
              : {
                  clockId: nextClockId,
                  sequence: clockRequestSequence,
                  scrollIntoView: false,
                  focus: true,
                };
          announcementSequence += 1;
          announcement = {
            sequence: announcementSequence,
            message: `${confirmation.name} removed.`,
          };
        },
      );
    },
    retryPersistence: async () => {
      if (persistenceState.status === "load-failed") {
        persistenceState = { status: "idle" };
        resample();
        await initialize();
        return isReady;
      }
      if (persistenceState.status !== "write-failed") return false;
      const retry = persistenceState.retry;
      persistenceState = { status: "idle" };
      return retry();
    },
  };
}
