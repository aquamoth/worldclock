# Offline clock catalog sources

The runtime catalog is generated entirely from files checked into this directory. The app never downloads catalog or timezone data.

- `iana/2026c/zone1970.tab`, `iso3166.tab`, and `LICENSE` were extracted from IANA's authoritative `tzdata2026c.tar.gz` release.
- `release.json` pins the official archive URL, retrieval date, release/source/schema/catalog versions, and SHA-256 checksums for the archive and extracted inputs.
- `curated/regions.json` is the reviewed English display metadata keyed by immutable catalog ID and canonical IANA region.
- `identity-ledger.json` records every active or retired ID, its IANA-link history, and the checksum for each accepted catalog version. A content change requires a catalog-version increment; an IANA link change also requires an explicit `identityTransitions` entry in `release.json`.
- `generated/catalog.json` is the deterministic runtime asset. `generated/report.json` records coverage and the generated artifact checksum.

IANA's included license states that its tz code and data are public domain. Regenerate and validate with `npm run catalog:generate`; use `npm run catalog:check` in CI or before committing a catalog change.
