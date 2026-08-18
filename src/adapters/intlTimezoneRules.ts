import type { TimezoneRules } from "../domain/clockCollection";

const PROJECTION_LOCALE = "en-US-u-ca-gregory-nu-latn";

function readNumericPart(
  parts: readonly Intl.DateTimeFormatPart[],
  type: Intl.DateTimeFormatPartTypes,
): number {
  const value = parts.find((part) => part.type === type)?.value;
  if (value === undefined) {
    throw new Error(`Intl projection omitted ${type}`);
  }
  return Number.parseInt(value, 10);
}

export function createIntlTimezoneRules(): TimezoneRules {
  return {
    project: (instantMs, timeZone, _locale) => {
      const formatter = new Intl.DateTimeFormat(PROJECTION_LOCALE, {
        timeZone,
        calendar: "gregory",
        numberingSystem: "latn",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hourCycle: "h23",
      });
      const parts = formatter.formatToParts(new Date(instantMs));
      const year = readNumericPart(parts, "year");
      const month = readNumericPart(parts, "month");
      const day = readNumericPart(parts, "day");
      const hour = readNumericPart(parts, "hour");
      const minute = readNumericPart(parts, "minute");
      const second = readNumericPart(parts, "second");
      const projectedAsUtc = Date.UTC(
        year,
        month - 1,
        day,
        hour,
        minute,
        second,
      );
      const instantAtWholeSecond = Math.floor(instantMs / 1_000) * 1_000;

      return {
        calendarDate: `${year.toString().padStart(4, "0")}-${month
          .toString()
          .padStart(2, "0")}-${day.toString().padStart(2, "0")}`,
        hour,
        minute,
        effectiveOffsetMinutes: Math.round(
          (projectedAsUtc - instantAtWholeSecond) / 60_000,
        ),
      };
    },
  };
}
