import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

import {
  createCatalogGenerationReport,
  generateClockCatalog,
  serializeClockCatalog,
  type CatalogReleaseMetadata,
  type CuratedCatalogSource,
} from "./catalog/generator";
import {
  reconcileCatalogIdentityLedger,
  serializeCatalogIdentityLedger,
  type CatalogIdentityLedger,
} from "./catalog/identityLedger";

interface ReleaseFile extends CatalogReleaseMetadata {
  readonly files: Readonly<Record<string, string>>;
  readonly identityTransitions: Readonly<Record<string, string>>;
}

const projectPath = (...parts: string[]): string => resolve(process.cwd(), ...parts);
const readText = (...parts: string[]): string => readFileSync(projectPath(...parts), "utf8");
const sha256 = (value: string | Buffer): string =>
  createHash("sha256").update(value).digest("hex");
const parseJson = <Value>(text: string): Value => JSON.parse(text) as Value;

const metadata = parseJson<ReleaseFile>(readText("catalog", "release.json"));
const releaseDirectory = ["catalog", "iana", metadata.ianaRelease];
const sourceFiles = ["zone1970.tab", "iso3166.tab", "LICENSE"] as const;
for (const filename of sourceFiles) {
  const expected = metadata.files?.[filename];
  const actual = sha256(readFileSync(projectPath(...releaseDirectory, filename)));
  if (!expected || expected !== actual) {
    throw new Error(`Pinned IANA source checksum mismatch: ${filename}`);
  }
}

const zone1970Text = readText(...releaseDirectory, "zone1970.tab");
const catalog = generateClockCatalog({
  metadata,
  zone1970Text,
  iso3166Text: readText(...releaseDirectory, "iso3166.tab"),
  curated: parseJson<CuratedCatalogSource>(
    readText("catalog", "curated", "regions.json"),
  ),
});
const catalogText = serializeClockCatalog(catalog);
const sourceRegionCount = zone1970Text
  .split(/\r?\n/u)
  .filter((line) => line.length > 0 && !line.startsWith("#")).length;
const reportText = `${JSON.stringify(
  createCatalogGenerationReport(catalog, sourceRegionCount, sha256(catalogText)),
  null,
  2,
)}\n`;
const ledgerText = serializeCatalogIdentityLedger(
  reconcileCatalogIdentityLedger(
    catalog,
    sha256(catalogText),
    parseJson<CatalogIdentityLedger>(readText("catalog", "identity-ledger.json")),
    metadata.identityTransitions,
  ),
);

const outputs = [
  [projectPath("catalog", "generated", "catalog.json"), catalogText],
  [projectPath("catalog", "generated", "report.json"), reportText],
  [projectPath("catalog", "identity-ledger.json"), ledgerText],
] as const;

if (process.argv.includes("--check")) {
  for (const [path, expected] of outputs) {
    if (readFileSync(path, "utf8") !== expected) {
      throw new Error(`Generated catalog is stale: ${path}`);
    }
  }
  console.log(
    `Catalog is current: ${sourceRegionCount} source regions, ${catalog.entries.length} generated entries.`,
  );
} else {
  for (const [path, contents] of outputs) writeFileSync(path, contents);
  console.log(
    `Generated ${catalog.entries.length} catalog entries from ${sourceRegionCount} source regions.`,
  );
}
