import { getCalendars, getLocales } from "expo-localization";

import type { DevicePreferencesPort } from "../application/liveClock";

export function createDevicePreferences(): DevicePreferencesPort {
  return {
    read: () => {
      const calendar = getCalendars()[0];
      const locale = getLocales()[0];
      const resolved = new Intl.DateTimeFormat().resolvedOptions();

      return {
        timeZone: calendar?.timeZone ?? resolved.timeZone,
        locale: locale?.languageTag ?? resolved.locale,
        uses24HourClock: calendar?.uses24hourClock ?? false,
      };
    },
  };
}
