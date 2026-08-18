import type { ClockCatalogEntry } from "./catalog";

export function normalizeCatalogSearchText(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/\p{M}+/gu, "")
    .toLowerCase()
    .replace(/[\p{P}\s]+/gu, " ")
    .trim();
}

const compareText = (left: string, right: string): number =>
  left < right ? -1 : left > right ? 1 : 0;

const indexedFields = (entry: ClockCatalogEntry): string[] => [
  entry.city,
  ...entry.countries.flatMap(({ code, name }) => [name, code]),
  ...entry.aliases,
].map(normalizeCatalogSearchText);

const rank = (fields: readonly string[], query: string): number => {
  if (fields.some((field) => field === query)) return 0;
  if (fields.some((field) => field.startsWith(query))) return 1;
  if (fields.some((field) => field.split(" ").some((token) => token.startsWith(query)))) {
    return 2;
  }
  return 3;
};

export function searchClockCatalog(
  entries: readonly ClockCatalogEntry[],
  rawQuery: string,
): ClockCatalogEntry[] {
  const query = normalizeCatalogSearchText(rawQuery);
  const terms = query.length === 0 ? [] : query.split(" ");

  return entries
    .map((entry) => ({ entry, fields: indexedFields(entry) }))
    .filter(({ fields }) =>
      terms.every((term) => fields.some((field) => field.includes(term))),
    )
    .sort((left, right) => {
      const rankDifference = rank(left.fields, query) - rank(right.fields, query);
      if (rankDifference !== 0) return rankDifference;

      const cityDifference = compareText(
        normalizeCatalogSearchText(left.entry.city),
        normalizeCatalogSearchText(right.entry.city),
      );
      if (cityDifference !== 0) return cityDifference;

      const primaryCountry = (entry: ClockCatalogEntry): string =>
        entry.countries.find(({ code }) => code === entry.primaryCountryCode)?.name ?? "";
      const countryDifference = compareText(
        normalizeCatalogSearchText(primaryCountry(left.entry)),
        normalizeCatalogSearchText(primaryCountry(right.entry)),
      );
      return countryDifference || compareText(left.entry.id, right.entry.id);
    })
    .map(({ entry }) => entry);
}
