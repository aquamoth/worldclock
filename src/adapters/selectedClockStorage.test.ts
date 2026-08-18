import AsyncStorage from "@react-native-async-storage/async-storage";

import type { SelectedClockSnapshot } from "../application/selectedClockSnapshot";
import { createAsyncSelectedClockStorage } from "./selectedClockStorage";

jest.mock("@react-native-async-storage/async-storage", () => ({
  __esModule: true,
  default: {
    getItem: jest.fn(),
    setItem: jest.fn(),
  },
}));

const snapshot: SelectedClockSnapshot = {
  version: 1,
  nextAddSequence: 1,
  selectedClocks: [
    {
      kind: "city",
      selectionId: "selection-0-city-0276",
      addSequence: 0,
      catalogId: "city-0276",
      city: "New York",
      primaryCountryCode: "US",
      countries: [{ code: "US", name: "United States" }],
      ianaId: "America/New_York",
    },
  ],
};

describe("AsyncStorage selected-clock adapter", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("atomically replaces and reloads the one versioned snapshot value", async () => {
    const storage = createAsyncSelectedClockStorage();
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(snapshot));

    await storage.replace(snapshot);
    await expect(storage.load()).resolves.toEqual(snapshot);

    expect(AsyncStorage.setItem).toHaveBeenCalledWith(
      "worldclock.selected-clocks",
      JSON.stringify(snapshot),
    );
    expect(AsyncStorage.getItem).toHaveBeenCalledWith(
      "worldclock.selected-clocks",
    );
  });

  it("treats a missing value as a fresh collection", async () => {
    const storage = createAsyncSelectedClockStorage();
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);

    await expect(storage.load()).resolves.toBeNull();
  });
});
