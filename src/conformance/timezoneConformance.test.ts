import { createIntlTimezoneRules } from "../adapters/intlTimezoneRules";
import { runTimezoneConformance } from "./timezoneConformance";

describe("shared timezone conformance corpus", () => {
  it("passes every normative projection using the production Intl adapter", () => {
    expect(runTimezoneConformance(createIntlTimezoneRules())).toEqual({
      schemaVersion: 1,
      projectionCases: 19,
      fixedOffsetCases: 105,
      totalCases: 124,
    });
  });
});
