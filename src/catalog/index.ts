import generatedCatalog from "../../catalog/generated/catalog.json";
import { parseClockCatalog } from "./catalog";

export { parseClockCatalog } from "./catalog";
export type {
  CatalogCountry,
  ClockCatalog,
  ClockCatalogEntry,
} from "./catalog";
export { normalizeCatalogSearchText, searchClockCatalog } from "./search";

export const clockCatalog = parseClockCatalog(generatedCatalog);
