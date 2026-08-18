import { resolvePrimaryCountryName, type CatalogCountry } from "../catalog";
import {
  projectClock,
  type ClockProjection,
  type HourPreference,
  type ZonedClockFields,
} from "./clock";
import { isCustomOffsetMinutes } from "./customTimezone";

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

export interface CustomClockDefinition {
  readonly kind: "custom";
  readonly selectionId: string;
  readonly addSequence: number;
  readonly name: string;
  readonly offsetMinutes: number;
}

export type SelectedClockDefinition =
  | CityClockDefinition
  | CustomClockDefinition;

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
  readonly canDelete: true;
  readonly dayDifference?: string;
}

export interface CustomClockProjection extends ClockProjection {
  readonly id: string;
  readonly kind: "custom";
  readonly name: string;
  readonly canDelete: true;
  readonly canEdit: true;
  readonly dayDifference?: string;
}

export type ClockCollectionProjection =
  | LocalClockProjection
  | CityClockProjection
  | CustomClockProjection;

type SortableProjection =
  | (LocalClockProjection & { readonly minuteOfDay: number })
  | (CityClockProjection & {
      readonly minuteOfDay: number;
      readonly addSequence: number;
    })
  | (CustomClockProjection & {
      readonly minuteOfDay: number;
      readonly addSequence: number;
    });

export interface ChronologicalClock {
  readonly id: string;
  readonly kind: "local" | "selected" | "city" | "custom";
  readonly calendarDate: string;
  readonly minuteOfDay: number;
  readonly addSequence?: number;
}

interface ProjectClockCollectionInput {
  readonly instantMs: number;
  readonly localTimeZone: string;
  readonly locale: string;
  readonly hourPreference: HourPreference;
  readonly selected: readonly SelectedClockDefinition[];
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

  const selected = input.selected.map((definition): Exclude<SortableProjection, LocalClockProjection & { readonly minuteOfDay: number }> => {
    if (definition.kind === "custom") {
      if (!isCustomOffsetMinutes(definition.offsetMinutes)) {
        throw new Error(`Invalid custom UTC offset: ${definition.offsetMinutes}`);
      }
      const fixedDate = new Date(
        input.instantMs + definition.offsetMinutes * 60_000,
      );
      const fields: ZonedClockFields = {
        calendarDate: fixedDate.toISOString().slice(0, 10),
        hour: fixedDate.getUTCHours(),
        minute: fixedDate.getUTCMinutes(),
        effectiveOffsetMinutes: definition.offsetMinutes,
      };
      const projection = projectClock(fields, input.hourPreference);
      const dayDifference = formatDayDifference(
        fields.calendarDate,
        localFields.calendarDate,
      );
      return {
        id: definition.selectionId,
        kind: "custom",
        name: definition.name,
        canDelete: true,
        canEdit: true,
        addSequence: definition.addSequence,
        minuteOfDay: fields.hour * 60 + fields.minute,
        ...projection,
        ...(dayDifference === undefined ? {} : { dayDifference }),
      };
    }

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
      canDelete: true as const,
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
