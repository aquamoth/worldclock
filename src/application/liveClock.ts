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
  moveRowOffset,
  stepRowOffset,
} from "../domain/rowWallGrid";
import {
  moveStatusOffset,
  stepStatusOffset,
  type VirtualDirection,
} from "../domain/statusOffsetGrid";
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

interface LiveClockScreenBase {
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

type LiveClockStatusState =
  | {
      readonly mode: "live";
      readonly status: {
        readonly label: "Live";
        readonly offset: "Now";
        readonly accessibilityValue: "Live time";
      };
    }
  | {
      readonly mode: "virtual";
      readonly status: {
        readonly label: "Virtual time";
        readonly offset: string;
        readonly offsetMinutes: number;
        readonly offsetAccessibilityLabel: string;
        readonly accessibilityValue: string;
      };
    };

export type LiveClockScreenModel = LiveClockScreenBase & LiveClockStatusState;

export interface LiveClockApplication {
  getScreen(): LiveClockScreenModel;
  subscribe(listener: () => void): () => void;
  initialize(): Promise<void>;
  refresh(): void;
  start(): void;
  enterBackground(): void;
  enterForeground(): void;
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
  adjustStatus(direction: VirtualDirection): void;
  beginStatusScrub(): void;
  updateStatusScrub(signedStepsFromGestureStart: number): void;
  endStatusScrub(): void;
  cancelStatusScrub(): void;
  adjustRow(clockId: string, direction: VirtualDirection): boolean;
  beginRowScrub(clockId: string): boolean;
  updateRowScrub(signedStepsFromGestureStart: number): void;
  endRowScrub(): void;
  cancelRowScrub(): void;
  backToLive(): void;
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

const formatVirtualOffset = (offsetMinutes: number): string => {
  const absolute = Math.abs(offsetMinutes);
  const hours = Math.floor(absolute / 60);
  const minutes = String(absolute % 60).padStart(2, "0");
  return `${offsetMinutes < 0 ? "−" : "+"}${hours}:${minutes}`;
};

const formatOffsetDuration = (offsetMinutes: number): string => {
  const absolute = Math.abs(offsetMinutes);
  const hours = Math.floor(absolute / 60);
  const minutes = absolute % 60;
  return [
    ...(hours === 0 ? [] : [`${hours} ${hours === 1 ? "hour" : "hours"}`]),
    ...(minutes === 0
      ? []
      : [`${minutes} ${minutes === 1 ? "minute" : "minutes"}`]),
  ].join(" ");
};

const formatAccessibleOffset = (offsetMinutes: number, time: string): string => {
  return `${formatOffsetDuration(offsetMinutes)} ${offsetMinutes < 0 ? "earlier" : "later"}, ${time}`;
};

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
  let minuteTicksActive = false;
  let initialization: Promise<void> | undefined;
  let persistenceState: PersistenceState = { status: "idle" };
  let virtualSession:
    | {
        readonly liveReferenceMs: number;
        readonly comparisonInstantMs: number;
        readonly offsetMinutes: number;
      }
    | undefined;
  let statusGesture:
    | {
        readonly startSession: typeof virtualSession;
        readonly liveReferenceMs: number;
        readonly startOffsetMinutes: number;
      }
    | undefined;
  let rowGesture:
    | {
        readonly clockId: string;
        readonly startSession: typeof virtualSession;
        readonly liveReferenceMs: number;
        readonly startOffsetMinutes: number;
        readonly rowWallMinuteOfDay: number;
      }
    | undefined;

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
    const sampledInstantMs =
      virtualSession?.comparisonInstantMs ?? dependencies.time.now();
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

    const localClock = clocks.find(({ kind }) => kind === "local");
    const localTime = localClock?.period
      ? `${localClock.time} ${localClock.period}`
      : (localClock?.time ?? "");
    const statusState: LiveClockStatusState =
      virtualSession === undefined
        ? {
            mode: "live",
            status: {
              label: "Live",
              offset: "Now",
              accessibilityValue: "Live time",
            },
          }
        : {
            mode: "virtual",
            status: {
              label: "Virtual time",
              offset: formatVirtualOffset(virtualSession.offsetMinutes),
              offsetMinutes: virtualSession.offsetMinutes,
              offsetAccessibilityLabel: `${formatOffsetDuration(
                virtualSession.offsetMinutes,
              )} ${virtualSession.offsetMinutes < 0 ? "earlier" : "later"}`,
              accessibilityValue: formatAccessibleOffset(
                virtualSession.offsetMinutes,
                localTime,
              ),
            },
          };

    return {
      ...statusState,
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
    cancelScheduledTick = undefined;
    if (!minuteTicksActive) return;
    const delayMs = 60_000 - (dependencies.time.now() % 60_000);
    cancelScheduledTick = dependencies.time.schedule(() => {
      cancelScheduledTick = undefined;
      if (!minuteTicksActive) return;
      resample();
      scheduleNextMinute();
    }, delayMs);
  };

  const pauseMinuteTicks = (): void => {
    minuteTicksActive = false;
    cancelScheduledTick?.();
    cancelScheduledTick = undefined;
  };

  const enterForeground = (): void => {
    minuteTicksActive = true;
    resample();
    scheduleNextMinute();
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

  const announce = (message: string): void => {
    announcementSequence += 1;
    announcement = { sequence: announcementSequence, message };
  };

  const requestFocus = (
    target: { readonly clockId: string } | { readonly addTimezone: true },
    scrollIntoView: boolean,
  ): void => {
    clockRequestSequence += 1;
    clockRequest = {
      ...target,
      sequence: clockRequestSequence,
      scrollIntoView,
      focus: true,
    };
  };

  const publishVirtualChange = (prefix: string): void => {
    const nextScreen = sampleScreen();
    if (nextScreen.mode !== "virtual") return;
    announce(`${prefix}${nextScreen.status.accessibilityValue}.`);
    screen = {
      ...nextScreen,
      ...(announcement === undefined ? {} : { announcement }),
    };
    notify();
  };

  const applyVirtualOffset = (
    offsetMinutes: number,
    wrapped: boolean,
    liveReferenceMs?: number,
  ): void => {
    const previousOffset = virtualSession?.offsetMinutes ?? 0;
    if (offsetMinutes === previousOffset) return;
    const enteringVirtual = virtualSession === undefined && offsetMinutes !== 0;
    if (offsetMinutes === 0) {
      virtualSession = undefined;
      announce("Live time.");
    } else {
      const reference =
        liveReferenceMs ??
        virtualSession?.liveReferenceMs ??
        dependencies.time.now();
      virtualSession = {
        liveReferenceMs: reference,
        comparisonInstantMs: reference + offsetMinutes * 60_000,
        offsetMinutes,
      };
      const prefix = wrapped
        ? "Wrapped. "
        : enteringVirtual
          ? "Virtual time, "
          : "";
      publishVirtualChange(prefix);
      return;
    }
    resample();
  };

  const restoreScrubStart = (startSession: typeof virtualSession): void => {
    virtualSession = startSession;
    heldClockOrder = undefined;
    if (virtualSession === undefined) {
      announce("Live time.");
      resample();
    } else {
      publishVirtualChange("");
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
      minuteTicksActive = true;
      scheduleNextMinute();
      void initialize();
    },
    enterBackground: pauseMinuteTicks,
    enterForeground,
    stop: pauseMinuteTicks,
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
      requestFocus({ addTimezone: true }, false);
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
          requestFocus({ clockId: selectionId }, true);
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
      const cancelledSelectionId = customForm.selectionId;
      customForm = undefined;
      selectorQuery = returnSelectorQuery;
      if (returnSelectorQuery === undefined) {
        heldClockOrder = undefined;
        if (cancelledSelectionId !== undefined) {
          requestFocus({ clockId: cancelledSelectionId }, false);
        }
      }
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
          requestFocus({ clockId: selectionId }, true);
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
      const cancelledSelectionId = deleteConfirmation.selectionId;
      deleteConfirmation = undefined;
      heldClockOrder = undefined;
      requestFocus({ clockId: cancelledSelectionId }, false);
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
          requestFocus(
            nextClockId === undefined
              ? { addTimezone: true }
              : { clockId: nextClockId },
            false,
          );
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
    adjustStatus: (direction) => {
      const result = stepStatusOffset(
        virtualSession?.offsetMinutes ?? 0,
        direction,
      );
      applyVirtualOffset(result.offsetMinutes, result.wrapped);
    },
    beginStatusScrub: () => {
      if (statusGesture !== undefined || rowGesture !== undefined) return;
      statusGesture = {
        startSession: virtualSession,
        liveReferenceMs:
          virtualSession?.liveReferenceMs ?? dependencies.time.now(),
        startOffsetMinutes: virtualSession?.offsetMinutes ?? 0,
      };
      heldClockOrder = screen.clocks.map(({ id }) => id);
    },
    updateStatusScrub: (signedStepsFromGestureStart) => {
      if (statusGesture === undefined) return;
      const result = moveStatusOffset(
        statusGesture.startOffsetMinutes,
        signedStepsFromGestureStart,
      );
      applyVirtualOffset(
        result.offsetMinutes,
        result.wrapped,
        statusGesture.liveReferenceMs,
      );
    },
    endStatusScrub: () => {
      if (statusGesture === undefined) return;
      statusGesture = undefined;
      heldClockOrder = undefined;
      resample();
    },
    cancelStatusScrub: () => {
      if (statusGesture === undefined) return;
      const startSession = statusGesture.startSession;
      statusGesture = undefined;
      restoreScrubStart(startSession);
    },
    adjustRow: (clockId, direction) => {
      if (statusGesture !== undefined || rowGesture !== undefined) return false;
      const clock = screen.clocks.find(({ id }) => id === clockId);
      if (clock?.wallMinuteOfDay === undefined) return false;
      const result = stepRowOffset(
        virtualSession?.offsetMinutes ?? 0,
        clock.wallMinuteOfDay,
        direction,
      );
      requestFocus({ clockId }, false);
      applyVirtualOffset(result.offsetMinutes, result.wrapped);
      return true;
    },
    beginRowScrub: (clockId) => {
      if (statusGesture !== undefined || rowGesture !== undefined) return false;
      const clock = screen.clocks.find(({ id }) => id === clockId);
      if (clock?.wallMinuteOfDay === undefined) return false;
      rowGesture = {
        clockId,
        startSession: virtualSession,
        liveReferenceMs:
          virtualSession?.liveReferenceMs ?? dependencies.time.now(),
        startOffsetMinutes: virtualSession?.offsetMinutes ?? 0,
        rowWallMinuteOfDay: clock.wallMinuteOfDay,
      };
      heldClockOrder = screen.clocks.map(({ id }) => id);
      return true;
    },
    updateRowScrub: (signedStepsFromGestureStart) => {
      if (rowGesture === undefined) return;
      const result = moveRowOffset(
        rowGesture.startOffsetMinutes,
        rowGesture.rowWallMinuteOfDay,
        signedStepsFromGestureStart,
      );
      applyVirtualOffset(
        result.offsetMinutes,
        result.wrapped,
        rowGesture.liveReferenceMs,
      );
    },
    endRowScrub: () => {
      if (rowGesture === undefined) return;
      const clockId = rowGesture.clockId;
      rowGesture = undefined;
      heldClockOrder = undefined;
      requestFocus({ clockId }, false);
      resample();
    },
    cancelRowScrub: () => {
      if (rowGesture === undefined) return;
      const startSession = rowGesture.startSession;
      rowGesture = undefined;
      restoreScrubStart(startSession);
    },
    backToLive: () => {
      if (virtualSession === undefined) return;
      virtualSession = undefined;
      statusGesture = undefined;
      rowGesture = undefined;
      heldClockOrder = undefined;
      announce("Live time.");
      resample();
    },
  };
}
