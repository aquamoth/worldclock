import type { ClockCatalogPort } from "../application/liveClock";
import { clockCatalog, searchClockCatalog } from "../catalog";

export function createBundledClockCatalog(): ClockCatalogPort {
  const byId = new Map(clockCatalog.entries.map((entry) => [entry.id, entry]));
  return {
    search: (query) => searchClockCatalog(clockCatalog.entries, query),
    findById: (catalogId) => byId.get(catalogId),
  };
}
