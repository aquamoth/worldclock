import { runAndroidHermesConformance } from "./runtimeConformance";

describe("Android Hermes conformance entry point", () => {
  it("blocks startup when the release runtime is not Hermes", () => {
    expect(() =>
      runAndroidHermesConformance({
        hermesInternal: undefined,
        record: () => undefined,
      }),
    ).toThrow("Hermes runtime is required");
  });

  it("records the shared corpus identity after it passes", () => {
    const records: string[] = [];
    expect(
      runAndroidHermesConformance({
        hermesInternal: {},
        record: (message) => records.push(message),
      }),
    ).toEqual({
      schemaVersion: 1,
      projectionCases: 19,
      fixedOffsetCases: 105,
      totalCases: 124,
    });
    expect(records).toEqual([
      "WORLD_CLOCK_HERMES_CONFORMANCE_PASS {\"schemaVersion\":1,\"projectionCases\":19,\"fixedOffsetCases\":105,\"totalCases\":124}",
    ]);
  });
});
