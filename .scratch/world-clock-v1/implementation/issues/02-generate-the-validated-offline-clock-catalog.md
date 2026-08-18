# 02 — Generate the validated offline clock catalog

Parent: [Create tracer-bullet implementation tasks](../../issues/13-create-tracer-bullet-implementation-tasks.md)

Specification: [World Clock v1 implementation specification](../../spec.md)

Index: [World Clock v1 implementation tickets](../index.md)

**What to build:** A pinned, reproducible, English offline clock catalog containing exactly one entry per canonical region in one IANA `zone1970.tab` release, ready for app consumption. This is the one necessary enabling/data-prefactor slice; it remains green and independently verifiable through its generator and validation report.

**Blocked by:** 01 — [Launch the live local clock](01-launch-the-live-local-clock.md).

**Status:** claimed

**Assignee:** Codex

**Delivery workflow:** Work directly on `master`; do not create a branch or pull request. Finish green and independently verifiable. Do not add selector UI or selected clocks.

## Scoped seams

Checked-in IANA/ISO source inputs and release metadata; curated city/country/alias source; deterministic generator; versioned generated JSON contract; catalog parser/validator and search normalizer/ranker.

## Acceptance criteria

- [ ] One pinned IANA release, `zone1970.tab`, `iso3166.tab`, source/schema/catalog versions, curated source, and generated JSON are checked in reproducibly.
- [ ] The generated artifact contains exactly one entry for every canonical representative region and no extra runtime-inferred entries.
- [ ] Every entry has immutable catalog identity, unique canonical IANA ID, reviewed city/country metadata, uppercase ISO code, multi-country data, and normalized unique aliases.
- [ ] Regeneration is deterministic and fails on incomplete coverage, duplicate identity, unknown country, invalid display field, unsupported formatter ID, missing version, or normalized alias collision.
- [ ] Search normalization/ranking follows the approved deterministic offline contract and raw IANA IDs match only when deliberately aliased.
- [ ] The slice adds no network search, runtime localization, selector UI, selected clocks, or application persistence.
- [ ] All generator/parser/search tests pass from a clean checkout.

## Automated acceptance subset

Validate source/schema/catalog versions; canonical coverage; unique catalog/IANA IDs; country resolution and multi-country metadata; nonempty single-line fields; formatter support; alias uniqueness; deterministic no-diff regeneration; empty-query completeness; exact/field-prefix/token-prefix/substring ranking and city/country/ID tie-breaks; case/diacritic/punctuation/whitespace/term-order fixtures including `São Paulo`; and raw-IANA exclusion unless aliased.

## Later Pixel 7a checkpoint

None separately. Ticket 03 consumes the artifact offline, while tickets 12 and 13 validate required identifiers under Hermes/Android and on the target.
