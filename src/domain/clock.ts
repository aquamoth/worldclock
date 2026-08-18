export type HourPreference = "12-hour" | "24-hour";

export interface ZonedClockFields {
  readonly calendarDate: string;
  readonly hour: number;
  readonly minute: number;
  readonly effectiveOffsetMinutes: number;
}

export interface ClockProjection {
  readonly calendarDate: string;
  readonly time: string;
  readonly period?: "AM" | "PM";
  readonly effectiveOffset: string;
}

const twoDigits = (value: number): string => value.toString().padStart(2, "0");

export function formatEffectiveOffset(offsetMinutes: number): string {
  const sign = offsetMinutes < 0 ? "−" : "+";
  const absoluteMinutes = Math.abs(offsetMinutes);
  return `UTC${sign}${twoDigits(Math.floor(absoluteMinutes / 60))}:${twoDigits(
    absoluteMinutes % 60,
  )}`;
}

export function projectClock(
  fields: ZonedClockFields,
  hourPreference: HourPreference,
): ClockProjection {
  const minute = twoDigits(fields.minute);

  if (hourPreference === "24-hour") {
    return {
      calendarDate: fields.calendarDate,
      time: `${twoDigits(fields.hour)}:${minute}`,
      effectiveOffset: formatEffectiveOffset(fields.effectiveOffsetMinutes),
    };
  }

  const period = fields.hour < 12 ? "AM" : "PM";
  const hour = fields.hour % 12 || 12;
  return {
    calendarDate: fields.calendarDate,
    time: `${hour}:${minute}`,
    period,
    effectiveOffset: formatEffectiveOffset(fields.effectiveOffsetMinutes),
  };
}
