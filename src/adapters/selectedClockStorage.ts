import AsyncStorage from "@react-native-async-storage/async-storage";

import type { SelectedClockStoragePort } from "../application/liveClock";
import {
  decodeSelectedClockSnapshot,
  encodeSelectedClockSnapshot,
} from "../application/selectedClockSnapshot";

const SELECTED_CLOCKS_KEY = "worldclock.selected-clocks";

export function createAsyncSelectedClockStorage(): SelectedClockStoragePort {
  return {
    load: async () => {
      const raw = await AsyncStorage.getItem(SELECTED_CLOCKS_KEY);
      return raw === null ? null : decodeSelectedClockSnapshot(raw);
    },
    replace: async (snapshot) => {
      await AsyncStorage.setItem(
        SELECTED_CLOCKS_KEY,
        encodeSelectedClockSnapshot(snapshot),
      );
    },
  };
}
