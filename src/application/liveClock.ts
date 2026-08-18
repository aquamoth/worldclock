import {
  projectClock,
  type ClockProjection,
  type ZonedClockFields,
} from "../domain/clock";

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

export interface TimezoneRulesPort {
  project(
    instantMs: number,
    timeZone: string,
    locale: string,
  ): ZonedClockFields;
}

export interface LocalClockScreenModel extends ClockProjection {
  readonly id: "local";
  readonly name: "Local";
  readonly canDelete: false;
}

export interface LiveClockScreenModel {
  readonly mode: "live";
  readonly sampledInstantMs: number;
  readonly clocks: readonly [LocalClockScreenModel];
  readonly emptyGuidance: "Add a timezone to compare times around the world.";
}

export interface LiveClockApplication {
  getScreen(): LiveClockScreenModel;
  subscribe(listener: () => void): () => void;
  refresh(): void;
  start(): void;
  stop(): void;
}

interface LiveClockDependencies {
  readonly time: TimePort;
  readonly devicePreferences: DevicePreferencesPort;
  readonly timezoneRules: TimezoneRulesPort;
}

const EMPTY_GUIDANCE = "Add a timezone to compare times around the world.";

export function createLiveClockApplication(
  dependencies: LiveClockDependencies,
): LiveClockApplication {
  const listeners = new Set<() => void>();
  let cancelScheduledTick: (() => void) | undefined;

  const sampleScreen = (): LiveClockScreenModel => {
    const sampledInstantMs = dependencies.time.now();
    const preferences = dependencies.devicePreferences.read();
    const fields = dependencies.timezoneRules.project(
      sampledInstantMs,
      preferences.timeZone,
      preferences.locale,
    );
    const projection = projectClock(
      fields,
      preferences.uses24HourClock ? "24-hour" : "12-hour",
    );

    return {
      mode: "live",
      sampledInstantMs,
      clocks: [
        {
          id: "local",
          name: "Local",
          canDelete: false,
          ...projection,
        },
      ],
      emptyGuidance: EMPTY_GUIDANCE,
    };
  };

  let screen = sampleScreen();

  const notify = (): void => {
    listeners.forEach((listener) => listener());
  };

  const scheduleNextMinute = (): void => {
    cancelScheduledTick?.();
    const delayMs = 60_000 - (dependencies.time.now() % 60_000);
    cancelScheduledTick = dependencies.time.schedule(() => {
      screen = sampleScreen();
      notify();
      scheduleNextMinute();
    }, delayMs);
  };

  return {
    getScreen: () => screen,
    subscribe: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    refresh: () => {
      screen = sampleScreen();
      notify();
    },
    start: scheduleNextMinute,
    stop: () => {
      cancelScheduledTick?.();
      cancelScheduledTick = undefined;
    },
  };
}
