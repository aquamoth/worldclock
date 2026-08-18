# 02 — Generate the validated offline clock catalog

Parent: [Create tracer-bullet implementation tasks](../../issues/13-create-tracer-bullet-implementation-tasks.md)

Specification: [World Clock v1 implementation specification](../../spec.md)

Index: [World Clock v1 implementation tickets](../index.md)

**What to build:** A pinned, reproducible, English offline clock catalog containing exactly one entry per canonical region in one IANA `zone1970.tab` release, ready for app consumption. This is the one necessary enabling/data-prefactor slice; it remains green and independently verifiable through its generator and validation report.

**Blocked by:** 01 — [Launch the live local clock](01-launch-the-live-local-clock.md).

**Status:** complete

**Assignee:** Codex

**Delivery workflow:** Work directly on `master`; do not create a branch or pull request. Finish green and independently verifiable. Do not add selector UI or selected clocks.

## Scoped seams

Checked-in IANA/ISO source inputs and release metadata; curated city/country/alias source; deterministic generator; versioned generated JSON contract; catalog parser/validator and search normalizer/ranker.

## Acceptance criteria

- [x] One pinned IANA release, `zone1970.tab`, `iso3166.tab`, source/schema/catalog versions, curated source, and generated JSON are checked in reproducibly.
- [x] The generated artifact contains exactly one entry for every canonical representative region and no extra runtime-inferred entries.
- [x] Every entry has immutable catalog identity, unique canonical IANA ID, reviewed city/country metadata, uppercase ISO code, multi-country data, and normalized unique aliases.
- [x] Regeneration is deterministic and fails on incomplete coverage, duplicate identity, unknown country, invalid display field, unsupported formatter ID, missing version, or normalized alias collision.
- [x] Search normalization/ranking follows the approved deterministic offline contract and raw IANA IDs match only when deliberately aliased.
- [x] The slice adds no network search, runtime localization, selector UI, selected clocks, or application persistence.
- [x] All generator/parser/search tests pass from a clean checkout.

## Automated acceptance subset

Validate source/schema/catalog versions; canonical coverage; unique catalog/IANA IDs; country resolution and multi-country metadata; nonempty single-line fields; formatter support; alias uniqueness; deterministic no-diff regeneration; empty-query completeness; exact/field-prefix/token-prefix/substring ranking and city/country/ID tie-breaks; case/diacritic/punctuation/whitespace/term-order fixtures including `São Paulo`; and raw-IANA exclusion unless aliased.

## Later Pixel 7a checkpoint

None separately. Ticket 03 consumes the artifact offline, while tickets 12 and 13 validate required identifiers under Hermes/Android and on the target.

## Resolution

Pinned authoritative IANA tzdata release `2026c` with its public-domain license, official archive URL, archive/input SHA-256 checksums, release metadata, and all 312 canonical `zone1970.tab` regions. A reviewed 312-entry English curation source generates a deterministic, versioned 312-entry runtime JSON artifact and coverage/checksum report. An identity ledger enforces catalog-version bumps, immutable IDs, explicit IANA-link transitions, retirement, and non-reuse across future releases.

The public parser/validator rejects malformed versions and entries, incomplete or duplicate identities, unsupported formatter IDs, invalid countries/display fields, missing ASCII aliases, and normalized alias collisions. Offline search implements NFKD, combining-mark removal, Unicode-data-backed full case folding, punctuation/whitespace normalization, every-term matching, order-independent exact/field-prefix/token-prefix/substring ranking, stable city/country/ID ties, and deliberate-alias-only IANA matching.

Verification passed: deterministic regeneration/check (`312` source regions → `312` entries), 37 focused catalog tests, all 53 repository tests, strict TypeScript, all 21 Expo Doctor checks, Gradle `assembleDebug`, and an Android Hermes bundle export. The final two-axis review against `962c3bb6b1f394b060c7191d3bdfc5712e4d906c` found no remaining Standards or Spec issues. No selector UI, selected-clock behavior, persistence, runtime networking/localization, or later-ticket work was added.
