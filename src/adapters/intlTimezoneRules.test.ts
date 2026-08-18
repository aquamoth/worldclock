import { createIntlTimezoneRules } from "./intlTimezoneRules";

describe("Intl timezone rules", () => {
  it("projects the effective Stockholm winter offset without network access", () => {
    const rules = createIntlTimezoneRules();

    expect(
      rules.project(
        Date.parse("2026-01-15T12:00:00Z"),
        "Europe/Stockholm",
        "sv-SE",
      ),
    ).toEqual({
      calendarDate: "2026-01-15",
      hour: 13,
      minute: 0,
      effectiveOffsetMinutes: 60,
    });
  });

  it("projects the effective Stockholm summer offset", () => {
    const rules = createIntlTimezoneRules();

    expect(
      rules.project(
        Date.parse("2026-07-15T12:00:00Z"),
        "Europe/Stockholm",
        "sv-SE",
      ),
    ).toEqual({
      calendarDate: "2026-07-15",
      hour: 14,
      minute: 0,
      effectiveOffsetMinutes: 120,
    });
  });
});
