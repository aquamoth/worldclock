# Define the offline clock catalog

Type: grilling
Status: closed
Assignee: Codex
Blocked by: 01

## Question

Which city/country entries count as the bundled common catalog, how are names and search normalized, how are catalog updates handled, and what exact validation and editing rules apply to custom fixed-offset clocks?

## Resolution

### Bundled city catalog

V1 ships an English, offline **clock catalog** with exactly one entry for every canonical region in a pinned IANA `zone1970.tab` release. The release's `zone1970.tab` and `iso3166.tab` are the public-domain inputs; the source release identifier, curated source data, and generated catalog are checked into the repository. The checked-in generated artifact—not whatever timezone identifiers happen to be exposed by the runtime—is the catalog presented by that app release.

Each catalog entry contains:

- an opaque, immutable catalog ID that is not derived again when a label or IANA identifier changes;
- one canonical IANA timezone identifier;
- a display city preserving its conventional diacritics;
- a primary English country/territory label and ISO 3166-1 alpha-2 code;
- all additional countries represented by a multi-country `zone1970.tab` row, so each is searchable;
- explicit search aliases, including an ASCII alias where stripping diacritics changes the display city.

The representative city, primary country, awkward IANA path-derived labels, multi-country metadata, and useful common names are reviewed in the curated source rather than inferred at runtime. This is a representative timezone-region selector, not a claim to be a comprehensive city gazetteer. Different catalog entries may have equivalent timezone rules or effective offsets; catalog ID is city-clock identity, so those entries may coexist while the same catalog entry cannot be selected twice.

The catalog build fails unless schema/source versions are present, IDs and IANA identifiers satisfy the expected one-entry-per-canonical-region coverage, both IDs and IANA identifiers are unique, every country code resolves to an English name, all required display fields are nonempty and single-line, and every IANA identifier is supported by the release's target timezone formatter. Curated aliases are de-duplicated after search normalization. Automated fixtures also exercise catalog parsing and representative DST/non-DST zones under Hermes/Android.

### Display and search

V1 display labels are English-only. Conventional city spelling retains Unicode diacritics; aliases make an ASCII spelling searchable. Country names are English and country codes use uppercase ISO form. There is no runtime localization, transliteration service, fuzzy spelling correction, or network search in v1.

Apply the same deterministic normalizer to the query and indexed city, country-name, country-code, and alias fields: Unicode NFKD; remove combining marks; locale-independent case folding; replace punctuation and whitespace runs with one ASCII space; then trim. Split the normalized query on spaces. A record matches only when every nonempty query term occurs as a substring of at least one normalized indexed field. An empty query shows the full catalog. Rank exact field matches first, then field-prefix matches, token-prefix matches, and other substring matches; break ties by normalized city, normalized primary country, then immutable catalog ID. This makes case, diacritics, punctuation, and term order nonessential while keeping results stable. Search does not match raw IANA identifiers unless they are deliberately added as aliases.

### Updates and persisted selections

Catalog updates ship only with app releases; v1 has no downloaded catalog or background refresh. Each update pins its IANA input release, increments the catalog version when contents change, regenerates and validates the committed artifact, and receives human review for additions, removals, label changes, aliases, and canonical-link changes. Existing immutable catalog IDs are retained across renames and timezone-link changes; removed IDs are never reused.

A selected city clock persists its catalog ID plus the display city, country metadata, and IANA identifier captured when it was selected. On upgrade, existing selections remain usable with those saved values even if the bundled catalog renames or removes the entry; catalog updates affect subsequent selector results only. V1 performs no silent relabeling, deletion, or timezone substitution of existing selections. A later explicit migration may do so, but is outside this ticket.

### Custom fixed-offset clocks

A custom timezone is created and edited through the separate custom-offset path:

- Name input is trimmed at both ends and is required. The stored name must contain 1–40 Unicode extended grapheme clusters and must be single-line and contain no Unicode control characters. Internal characters and spacing are otherwise preserved.
- Offset is selected, not free-typed, from inclusive `UTC−12:00` through `UTC+14:00` in 15-minute steps. Persist signed integer minutes; zero is canonicalized and displayed as `UTC+00:00`, never negative zero.
- A custom clock's duplicate key is its normalized name plus offset minutes. For this identity normalizer, apply Unicode NFKC and locale-independent case folding, trim, and collapse Unicode whitespace runs to one space; punctuation and diacritics remain significant. Reject create or save if another selected custom clock has the same key. City clocks never collide with custom clocks.
- Editing retains the selected clock's stable selection ID, validates the complete proposed value before saving, and commits name and offset atomically; the clock collection then applies its normal automatic ordering. Cancel or system Back discards the draft. Invalid or duplicate input remains in the editor with an inline explanation and does not mutate the stored clock.

These validation rules are enforced at the domain boundary as well as reflected by UI controls, so restored or migrated data cannot bypass them.
