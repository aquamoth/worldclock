import { resolvePrimaryCountryName, type CatalogCountry } from "../catalog";
import {
  projectClock,
  type ClockProjection,
  type HourPreference,
  type ZonedClockFields,
} from "./clock";

export interface CityClockDefinition {
  readonly kind: "city";
  readonly selectionId: string;
  readonly addSequence: number;
  readonly catalogId: string;
  readonly city: string;
  readonly primaryCountryCode: string;
  readonly countries: readonly CatalogCountry[];
  readonly ianaId: string;
}

export interface TimezoneRules {
  project(
    instantMs: number,
    timeZone: string,
    locale: string,
  ): ZonedClockFields;
}

export interface LocalClockProjection extends ClockProjection {
  readonly id: "local";
  readonly kind: "local";
  readonly name: "Local";
  readonly canDelete: false;
}

export interface CityClockProjection extends ClockProjection {
  readonly id: string;
  readonly kind: "city";
  readonly name: string;
  readonly countryName: string;
  readonly canDelete: false;
  readonly dayDifference?: string;
}

export type ClockCollectionProjection =
  | LocalClockProjection
  | CityClockProjection;

type SortableProjection =
  | (LocalClockProjection & { readonly minuteOfDay: number })
  | (CityClockProjection & {
      readonly minuteOfDay: number;
      readonly addSequence: number;
    });

export interface ChronologicalClock {
  readonly id: string;
  readonly kind: "local" | "selected" | "city";
  readonly calendarDate: string;
  readonly minuteOfDay: number;
  readonly addSequence?: number;
}

interface ProjectClockCollectionInput {
  readonly instantMs: number;
  readonly localTimeZone: string;
  readonly locale: string;
  readonly hourPreference: HourPreference;
  readonly selected: readonly CityClockDefinition[];
}

const compareText = (left: string, right: string): number =>
  left < right ? -1 : left > right ? 1 : 0;

export function sortChronologically<T extends ChronologicalClock>(
  clocks: readonly T[],
): T[] {
  return [...clocks].sort((left, right) => {
    const dateDifference = compareText(left.calendarDate, right.calendarDate);
    if (dateDifference !== 0) return dateDifference;

    const minuteDifference = left.minuteOfDay - right.minuteOfDay;
    if (minuteDifference !== 0) return minuteDifference;

    if (left.kind === "local" && right.kind !== "local") return -1;
    if (right.kind === "local" && left.kind !== "local") return 1;

    const sequenceDifference =
      (left.addSequence ?? Number.MAX_SAFE_INTEGER) -
      (right.addSequence ?? Number.MAX_SAFE_INTEGER);
    return sequenceDifference || compareText(left.id, right.id);
  });
}

const dateAsEpochDay = (calendarDate: string): number => {
  const timestamp = Date.parse(`${calendarDate}T00:00:00Z`);
  if (!Number.isFinite(timestamp)) {
    throw new Error(`Invalid projected calendar date: ${calendarDate}`);
  }
  return timestamp / 86_400_000;
};

const formatDayDifference = (
  selectedCalendarDate: string,
  localCalendarDate: string,
): string | undefined => {
  const difference =
    dateAsEpochDay(selectedCalendarDate) - dateAsEpochDay(localCalendarDate);
  if (difference === 0) return undefined;
  return difference < 0 ? `−${Math.abs(difference)}` : `+${difference}`;
};

export function projectClockCollection(
  input: ProjectClockCollectionInput,
  timezoneRules: TimezoneRules,
): ClockCollectionProjection[] {
  const localFields = timezoneRules.project(
    input.instantMs,
    input.localTimeZone,
    input.locale,
  );
  const localProjection = projectClock(localFields, input.hourPreference);
  const local = {
    id: "local" as const,
    kind: "local" as const,
    name: "Local" as const,
    canDelete: false as const,
    minuteOfDay: localFields.hour * 60 + localFields.minute,
    ...localProjection,
  };

  const selected = input.selected.map((definition) => {
    const fields = timezoneRules.project(
      input.instantMs,
      definition.ianaId,
      input.locale,
    );
    const projection = projectClock(fields, input.hourPreference);
    const dayDifference = formatDayDifference(
      fields.calendarDate,
      localFields.calendarDate,
    );

    return {
      id: definition.selectionId,
      kind: "city" as const,
      name: definition.city,
      countryName: resolvePrimaryCountryName(definition),
      canDelete: false as const,
      addSequence: definition.addSequence,
      minuteOfDay: fields.hour * 60 + fields.minute,
      ...projection,
      ...(dayDifference === undefined ? {} : { dayDifference }),
    };
  });

  return sortChronologically<SortableProjection>([local, ...selected]).map(
    (clock): ClockCollectionProjection => {
      if (clock.kind === "local") {
        const { minuteOfDay: _minuteOfDay, ...projection } = clock;
        return projection;
      }
      const {
        addSequence: _addSequence,
        minuteOfDay: _minuteOfDay,
        ...projection
      } = clock;
      return projection;
    },
  );
}
