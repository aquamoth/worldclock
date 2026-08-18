import {
  CUSTOM_OFFSET_OPTIONS,
  cityDuplicateKey,
  customDuplicateKey,
  validateCustomTimezoneDraft,
} from "./customTimezone";

describe("custom timezone validation", () => {
  it("accepts every selectable 15-minute offset from UTC−12:00 through UTC+14:00", () => {
    expect(CUSTOM_OFFSET_OPTIONS).toHaveLength(105);
    expect(CUSTOM_OFFSET_OPTIONS[0]).toBe(-720);
    expect(CUSTOM_OFFSET_OPTIONS.at(-1)).toBe(840);
    for (const offsetMinutes of CUSTOM_OFFSET_OPTIONS) {
      expect(
        validateCustomTimezoneDraft({ name: "Reference", offsetMinutes }),
      ).toEqual({ ok: true, value: { name: "Reference", offsetMinutes } });
    }
  });

  it.each([-721, -719, -1, 1, 841, 12.5, Number.NaN, -0])(
    "rejects invalid offset %s",
    (offsetMinutes) => {
      expect(
        validateCustomTimezoneDraft({ name: "Reference", offsetMinutes }),
      ).toEqual({
        ok: false,
        offsetError:
          "Choose an offset from UTC−12:00 through UTC+14:00 in 15-minute steps.",
      });
    },
  );

  it("trims name ends while preserving internal spacing", () => {
    expect(
      validateCustomTimezoneDraft({ name: " \u2003Grandma   time\u00a0", offsetMinutes: 345 }),
    ).toEqual({
      ok: true,
      value: { name: "Grandma   time", offsetMinutes: 345 },
    });
  });

  it.each(["", "   "])("rejects empty name %j", (name) => {
    expect(validateCustomTimezoneDraft({ name, offsetMinutes: 0 })).toEqual({
      ok: false,
      nameError: "Enter a name.",
    });
  });

  it("counts extended grapheme clusters instead of code points", () => {
    expect(
      validateCustomTimezoneDraft({ name: "👨‍👩‍👧‍👦", offsetMinutes: 0 }),
    ).toMatchObject({ ok: true });
    expect(
      validateCustomTimezoneDraft({ name: "a".repeat(40), offsetMinutes: 0 }),
    ).toMatchObject({ ok: true });
    expect(
      validateCustomTimezoneDraft({ name: "a".repeat(41), offsetMinutes: 0 }),
    ).toEqual({
      ok: false,
      nameError: "Name must contain at most 40 characters.",
    });
  });

  it.each(["Line\nbreak", "trailing newline\n", "Tab\tinside", "Null\0inside", "Line\u2028separator"])(
    "rejects multiline or control name %j",
    (name) => {
      expect(validateCustomTimezoneDraft({ name, offsetMinutes: 0 })).toEqual({
        ok: false,
        nameError: "Name must be one line without control characters.",
      });
    },
  );
});

describe("custom timezone duplicate identity", () => {
  it("normalizes NFKC, full case folding, ends, and Unicode whitespace", () => {
    expect(customDuplicateKey("  ＧＲＡＮＤＭＡ　Straße  ", 390)).toBe(
      customDuplicateKey("grandma strasse", 390),
    );
  });

  it("keeps punctuation, diacritics, and offsets significant", () => {
    expect(customDuplicateKey("A-B", 60)).not.toBe(
      customDuplicateKey("A B", 60),
    );
    expect(customDuplicateKey("José", 60)).not.toBe(
      customDuplicateKey("Jose", 60),
    );
    expect(customDuplicateKey("Grandma", 60)).not.toBe(
      customDuplicateKey("Grandma", 75),
    );
  });

  it("keeps city and custom identity namespaces separate", () => {
    expect(customDuplicateKey("city-0001", 0)).not.toBe(
      cityDuplicateKey("city-0001"),
    );
  });
});
