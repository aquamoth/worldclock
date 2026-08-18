# World Clock v1 implementation specification

Status: implementation-ready

## Problem Statement

People who coordinate across places need to compare the same instant in their phone's timezone and in a small personal collection of named time references. Existing offset-only comparisons become wrong across daylight-saving changes, and a static “current time” view makes near-future planning unnecessarily slow. The experience must remain useful without a network connection, preserve the person's collection, and remain operable with large text and TalkBack.

The repository currently contains decisions, research, and throwaway prototypes but no application scaffold. This specification defines the complete Android v1 behavior, production architecture, durable data contracts, error handling, accessibility contract, and acceptance boundary needed to create implementation tasks without making further product decisions.

## Solution

Build a portrait-first Android world-clock app that always presents one **clock collection**: the mandatory **local clock** plus up to 24 persistent **selected clocks**. A selected clock is either a DST-aware **city timezone** from an English offline **clock catalog** or a named, fixed-offset **custom timezone**. Every row projects one shared instant, shows its time, name, effective UTC offset, and any nonzero **day difference**, and participates in automatic chronological ordering.

The app normally runs in **Live mode**. Horizontal scrubbing on the time-status section or any row enters **Virtual time**, freezes one **comparison instant**, and reprojects every clock together within a cyclic ±24-hour window. The two scrub surfaces intentionally use different 15-minute grids. All collection management remains available in Virtual time without changing the frozen instant.

Production uses strict TypeScript, React Native, Expo CNG, and Hermes on Android 10/API 29 and newer. Timezone rules come from Android/Hermes `Intl`; the app owns a versioned offline catalog and a versioned selected-clock snapshot. The production UI is native React Native UI. Neither approved HTML prototype ships, and no production feature is implemented in a WebView. Repository changes land directly on `master`; this repository does not use pull requests.

## User Stories

1. As an app user, I want to see my phone's local time automatically, so that the app is useful before I add anything.
2. As an app user, I want the local clock to follow the phone's active timezone, so that travel and timezone-setting changes are reflected.
3. As an app user, I want every clock to show the same absolute instant, so that comparisons are trustworthy.
4. As an app user, I want city clocks to follow IANA timezone rules, so that daylight-saving changes are correct.
5. As an app user, I want custom clocks to use a fixed offset, so that I can represent named references that are not cities.
6. As an app user, I want each row to show a large digital time, so that I can scan the collection quickly.
7. As an app user, I want each row to show its city or custom name, so that I know which reference I am reading.
8. As an app user, I want each row to show its effective `UTC±HH:MM` offset, so that the current relationship to UTC is explicit.
9. As an app user, I want selected clocks on another calendar date to show a signed day difference, so that date-line comparisons are unambiguous.
10. As an app user, I want zero day difference omitted, so that ordinary rows remain uncluttered.
11. As an app user, I want `−2`, `−1`, `+1`, and `+2` date differences represented accurately, so that extreme timezone pairs are not flattened.
12. As an app user, I want the clock collection ordered by displayed date and wall time, so that earlier and later local times read chronologically.
13. As an app user, I want the local clock included in chronological ordering, so that it appears at its truthful comparison position.
14. As an app user, I want tied rows to stay deterministic, so that the collection does not jump unpredictably.
15. As an app user, I want times to follow the phone's 12/24-hour preference, so that the app matches my system convention.
16. As a 12-hour-clock user, I want an AM/PM marker, so that times are not ambiguous.
17. As an app user, I want seconds omitted, so that the display stays calm and aligned to minute-level planning.
18. As an app user, I want to open an offline timezone selector, so that adding a clock never depends on connectivity.
19. As an app user, I want an empty search to expose the full clock catalog, so that browsing works without knowing a query.
20. As an app user, I want to search by city, country name, country code, or curated alias, so that I can find a timezone with familiar terms.
21. As an app user, I want search to ignore case, diacritics, punctuation, excess whitespace, and term order, so that ordinary spelling variations work.
22. As an app user, I want search results ranked deterministically, so that repeated searches do not reshuffle.
23. As an app user, I want conventional city spellings and English country labels displayed, so that results are recognizable.
24. As an app user, I want every canonical IANA representative region available offline, so that the selector has predictable global coverage.
25. As an app user, I want different cities that share timezone rules to coexist, so that meaningful named places are not collapsed.
26. As an app user, I want an already-selected catalog city marked unavailable, so that I cannot add the exact same city twice.
27. As an app user, I want a separate custom-timezone path, so that fixed offsets are not confused with cities.
28. As an app user, I want to give a custom timezone a 1–40-grapheme name, so that its meaning is clear.
29. As an app user, I want to choose a custom offset from UTC−12:00 through UTC+14:00 in 15-minute increments, so that supported fixed offsets are valid by construction.
30. As an app user, I want invalid names and duplicate custom clocks explained inline, so that I can correct the draft without losing it.
31. As an app user, I want custom duplicate detection to tolerate Unicode/case/whitespace variations, so that accidental duplicates are rejected.
32. As an app user, I want punctuation and diacritics to remain meaningful in custom identity, so that intentionally distinct names can coexist.
33. As an app user, I want to edit a custom clock in place, so that its stable identity and history are retained.
34. As an app user, I want city clocks immutable, so that their catalog identity and rules cannot drift into an invalid hybrid.
35. As an app user, I want cancel or system Back to discard an add/edit draft, so that exploration does not mutate my collection.
36. As an app user, I want deletion to require a named warning with Cancel and Delete, so that removal is deliberate.
37. As an app user, I want deletion to have no misleading post-confirmation Undo, so that persistence state and UI agree.
38. As an app user, I want the local clock to be nondeletable, so that the comparison reference always exists.
39. As an app user, I want my selected clocks restored after relaunch, so that I do not rebuild the collection.
40. As an app user, I want failed saves to leave the prior collection intact and offer a retryable accessible error, so that storage failures do not corrupt visible state.
41. As an app user, I want repeat mutation taps ignored while a save is pending, so that one action cannot be applied twice.
42. As an app user, I want to compare up to 24 selected clocks, so that the list remains useful and bounded.
43. As an app user at the capacity limit, I want Add to stay visible with a clear maximum message, so that the missing action is explained.
44. As an app user, I want to scrub right for earlier and left for later, so that direct manipulation matches the approved interaction.
45. As an app user, I want scrubbing one surface to move every clock together, so that the comparison instant remains shared.
46. As an app user, I want the time-status surface to adjust a relative 15-minute offset grid, so that I can move predictably from now.
47. As an app user, I want row scrubbing to reanchor directionally to that row's quarter-hour wall grid, so that I can target familiar local quarter hours.
48. As an app user, I want the ±24-hour scrub range to wrap, so that continuous movement does not hit a dead edge.
49. As an app user, I want vertical movement begun on a clock to scroll the list, so that scrubbing does not steal normal navigation.
50. As an app user, I want taps, sub-threshold movement, cancellation, and vertically won gestures not to alter time, so that accidental mode changes are avoided.
51. As an app user, I want Virtual time to freeze after adjustment, so that I can inspect a stable comparison.
52. As an app user, I want a visually distinct Virtual-time screen and compact status section, so that I never mistake a frozen comparison for now.
53. As an app user, I want `Back` to return immediately to the then-current live instant, so that leaving a comparison is one action.
54. As an app user, I want an exact zero virtual offset to resume Live mode, so that a frozen `+0:00` state is never shown.
55. As an app user, I want ordinary background/foreground transitions to preserve Virtual time, so that a brief interruption does not lose my comparison.
56. As an app user, I want a cold launch to start in Live mode while restoring my collection, so that stale comparison state is never mistaken for now.
57. As an app user, I want add, custom edit, and delete to remain available in Virtual time, so that collection changes do not interrupt planning.
58. As an app user, I want collection mutations in Virtual time to preserve the same comparison instant, so that new or changed rows join the existing comparison.
59. As an app user, I want the active row held in place during a pointer scrub, so that it cannot move away from my finger.
60. As a keyboard user, I want arrow controls for scrubbing, so that a pointer is not required.
61. As a TalkBack user, I want each scrub surface exposed as an adjustable control, so that Virtual time is fully operable without dragging.
62. As a TalkBack user, I want concise announcements for entry, changes, wrap, return, mutation, and error outcomes, so that state changes are understandable without repeated row chatter.
63. As a TalkBack user, I want focus preserved across automatic ordering and moved predictably after deletion, so that I do not lose my place.
64. As a TalkBack user, I want every Add, Edit, Delete, and Back action named, so that icon-only controls remain meaningful.
65. As an app user with reduced motion enabled, I want decorative chevron pulsing disabled, so that the affordance does not create unwanted motion.
66. As an app user with large text, I want rows to grow and labels to wrap without collision, so that every required value remains readable.
67. As an app user, I want at least 48×48dp action targets, so that touch interactions remain usable.
68. As an app user, I want light and dark system appearances respected with sufficient contrast, so that the app remains legible.
69. As an app user, I want the app to launch, search, calculate, and restore clocks offline, so that network availability never blocks core behavior.
70. As a maintainer, I want pure clock projection and serializable snapshot contracts, so that a later native widget effort can reuse semantics without coupling to React.
71. As a maintainer, I want catalog inputs, generated data, schema version, and IANA release pinned, so that catalog changes are reviewable and reproducible.
72. As a maintainer, I want deterministic tests at domain, application, adapter, and UI seams, so that timezone and interaction regressions are caught before device acceptance.
73. As a maintainer, I want the exact conformance suite to run under Hermes/Android, so that host-runtime success cannot hide device ICU differences.
74. As a maintainer, I want native changes reproducible through Expo CNG, so that generated Android output is not a hand-maintained source of truth.
75. As a maintainer, I want work to land directly on `master`, so that delivery follows this repository's no-PR workflow.

## Implementation Decisions

### 1. Platform and delivery

- Build Android v1 in strict TypeScript with React Native, the stable Expo SDK selected and pinned when implementation starts, and Hermes. Use Expo Continuous Native Generation; app configuration, config plugins, or local Expo modules reproduce any native changes. Generated Android output is not hand-maintained source. Support Android 10/API 29 and newer; compile and target levels follow the pinned Expo SDK. ([Choose the application foundation](issues/02-choose-application-foundation.md))
- Use a development or release build for production-behavior testing and final acceptance. Expo Go is permitted only for early UI work. The connected acceptance target is the authorized Google Pixel 7a described under Further Notes. ([Choose the application foundation](issues/02-choose-application-foundation.md), [Authorize and inventory the target Pixel](issues/09-authorize-and-inventory-the-pixel-7.md))
- Production is native React Native UI. The two HTML prototypes are throwaway evidence and must not ship, be embedded, or be reimplemented as a WebView. ([Prototype clock scrubbing and virtual-time feedback](issues/03-prototype-clock-scrubbing.md), [Prototype clock ordering around local time](issues/11-prototype-clock-ordering.md), [Define clock collection management](issues/07-define-clock-collection-management.md))
- Changes land directly on `master`; do not create a pull-request workflow for this repository. ([Choose the application foundation](issues/02-choose-application-foundation.md))

### 2. Module boundaries and test seams

- The domain module owns platform-neutral clock definitions, custom validation/identity, fixed-offset arithmetic, day-difference calculation, sort keys, and render-neutral clock projection. It imports neither React nor Expo, never samples the wall clock, and does not read persistence or device preferences.
- The application module owns the clock collection, chronological ordering, Live/Virtual state, overlay/focus coordination, mutations, and use cases. It receives time, device preference, timezone rules, catalog, and persistence through ports.
- The adapter module implements those ports using Hermes `Intl.DateTimeFormat`, `expo-localization`, checked-in catalog JSON, and Async Storage. Platform/runtime behavior does not leak into domain records.
- The UI module renders application projections and dispatches application actions. `react-native-gesture-handler` recognizes gestures; the UI contains no timezone arithmetic, search rules, snapshot parsing, or persistence calls.
- The highest practical behavioral test seam is the application boundary: inject deterministic ports, issue user/application actions, and assert the render-neutral screen model and declared effects. Use lower clock-projection, catalog-generation, snapshot-codec, and Hermes adapter seams only where exhaustive data or runtime conformance cannot be observed efficiently through the application boundary. UI tests assert rendered semantics and outcomes, not component internals. These seams implement the four inward-pointing boundaries and two platform-neutral contracts already chosen. ([Choose the application foundation](issues/02-choose-application-foundation.md), [Define widget-ready boundaries without building a widget](issues/08-define-widget-ready-boundaries.md))

### 3. Clock definitions and projection contract

- A city timezone is rule-bearing: immutable catalog identity, saved display city/country metadata, and canonical IANA identifier. Never persist its effective offset as its rule. A custom timezone contains its user-visible name and signed integer offset minutes.
- Expose one render-neutral projection operation. Inputs are a clock definition, epoch-millisecond instant, current local IANA timezone ID, 12/24-hour preference, and the narrow timezone-rules port. Output is plain data: calendar date, hour/minute fields, optional AM/PM marker, effective `UTC±HH:MM`, and selected-clock day difference relative to the local clock. Labels come from definitions, not timezone calculation.
- The application samples one instant and supplies it to every clock. IANA fields/effective offsets come from the Hermes `Intl` adapter and Android's installed offline ICU/tzdata; fixed offsets use domain arithmetic. DST gaps and overlaps are handled as projections of absolute instants, never by constructing ambiguous wall times.
- Day difference is the signed difference between the selected and local calendar dates at the shared instant. Render the actual nonzero value, including `−2`, `−1`, `+1`, and `+2`; omit zero. Times never show seconds. ([Research Expo and offline timezone feasibility](issues/01-research-expo-and-timezone-feasibility.md), [Define widget-ready boundaries without building a widget](issues/08-define-widget-ready-boundaries.md), [Handle extreme day differences](issues/06-handle-extreme-day-differences.md))

### 4. Offline catalog and search contract

- Check in a curated source and generated English JSON artifact derived from one pinned IANA `zone1970.tab` and `iso3166.tab` release. Include exactly one entry per canonical representative region. Record catalog/schema/source versions and increment the catalog version when contents change.
- Every entry has an opaque immutable catalog ID, canonical IANA ID, conventional display city, primary English country/territory and uppercase ISO code, all additional countries from multi-country rows, and curated aliases including ASCII aliases when diacritic stripping changes the city.
- The build fails for missing versions, incomplete canonical coverage, duplicate IDs/IANA IDs, unknown country codes, empty or multiline fields, unsupported formatter IDs, or aliases duplicated after normalization. Updates are app-release-only and human-reviewed; IDs survive renames/link changes and are never reused.
- Normalize search query and city/country/code/alias fields with NFKD, combining-mark removal, locale-independent case folding, punctuation/whitespace-to-one-ASCII-space, and trim. Every nonempty query token must occur in at least one indexed field. An empty query returns all entries. Rank exact field, field prefix, token prefix, then substring; tie-break by normalized city, primary country, then catalog ID. Do not search raw IANA IDs unless curated as aliases.
- Catalog updates affect future selector results only. A saved city remains usable from its captured metadata if its entry is renamed or removed; never silently relabel, delete, or substitute it. No catalog download, background refresh, runtime localization, transliteration service, fuzzy correction, or network search exists. ([Define the offline clock catalog](issues/05-define-the-offline-clock-catalog.md))

### 5. Selected-clock snapshot and persistence contract

- Persist one plain JSON, versioned `SelectedClockSnapshot` through a port that reads and atomically replaces the entire snapshot. Async Storage is the v1 adapter, not part of the application contract.
- Every selected record has a stable selection ID, city/custom discriminator, and monotonic add-sequence value. A city record also captures catalog ID, display city, country metadata, and IANA ID. A custom record also captures the validated display name and signed integer offset minutes.
- Add sequence—not physical array position—is the durable tie-breaker. Chronological display order is always derived and is never persisted. This is the latest collection decision and supersedes the earlier snapshot text that described array order as display order.
- Do not persist the local clock, current/live reference/comparison instant, Virtual-time state, presentation order, formatted fields, effective offset, day difference, device timezone, locale, 12/24 preference, or theme.
- Validate and migrate every supported older version before returning the current snapshot. Reject malformed records and unknown newer versions visibly without partial recovery, silent rewriting, or data loss. Round-tripped snapshots contain no React/Expo/`Intl` instances, functions, classes, or storage-specific values.
- Each add/edit/delete stages one candidate snapshot, performs one atomic replacement, and commits in-memory success only after the write succeeds. Ignore repeat activation while pending. On failure retain the prior in-memory/stored collection, claim no success, and expose an accessible retryable error. ([Define widget-ready boundaries without building a widget](issues/08-define-widget-ready-boundaries.md), [Define clock collection management](issues/07-define-clock-collection-management.md), [Lock the acceptance contract](issues/10-lock-the-acceptance-contract.md))

### 6. Application state and lifecycle contract

- Live mode continuously projects a sampled current instant and refreshes at minute boundaries. Virtual time stores exactly one live reference instant and one frozen comparison instant. Its signed virtual offset is `comparison instant − live reference instant`, formatted with a Unicode sign and hours/minutes.
- The first accepted scrub captures the live reference once. Further adjustments retain it. If adjustment reaches exact zero, clear the virtual session and resume Live mode; never display frozen `+0:00`.
- Ordinary background/foreground preserves Virtual state but refreshes device timezone, locale, appearance, reduced-motion, and 12/24 preference, then reprojects the same comparison instant. `Back` clears Virtual state and immediately samples current live time. Process death/cold launch restores the snapshot but starts Live.
- Application state also tracks the last stable displayed order, active pointer gesture, open selector/editor/delete overlay, pending mutation, and stable focus target only as transient coordination. Hold order during a continuous pointer gesture and behind an overlay; reconcile afterward. None of this transient state enters the snapshot.
- Live ordering recomputes on minute tick, phone-timezone change, successful mutation, `Back`, and completed Virtual adjustment. Discrete keyboard/accessibility changes may reorder after each action while retaining focus by stable selection ID. If a focused element cannot survive a move, defer that visual move until focus leaves. ([Lock the clock interaction contract](issues/04-lock-the-clock-interaction-contract.md), [Define clock collection management](issues/07-define-clock-collection-management.md))

### 7. Collection, ordering, and mutation contract

- The clock collection contains the mandatory local clock plus 0–24 selected clocks. A new/cleared collection shows Local, `Add a timezone to compare times around the world.`, and `Add timezone`; seed no selected clocks.
- Sort ascending by projected calendar date then minute-of-day at the shared instant. On a primary tie, Local comes first; selected ties use add sequence, then stable ID. This latest owning decision supersedes every earlier “Local first” statement: Local participates in the sort and may move, but remains mandatory and nondeletable. V1 has no manual reorder, stored display order, sort control, or relative-time label.
- Keep `Add timezone` visible below the collection. It opens the offline selector and adds one city or custom timezone per visit. A successful persisted add closes the selector, scrolls the row into view, and focuses it. Cancel changes nothing. At 24 selected clocks, Add remains visible but unavailable with `Maximum of 24 timezones reached`; preserve migrated over-cap data and block adds until below 24.
- City duplicate identity is catalog ID. Different cities sharing an IANA zone may coexist; the same catalog entry may not. Selected city results are unavailable. City clocks cannot be edited.
- Custom names are trimmed, required, single-line, free of Unicode control characters, and 1–40 extended grapheme clusters. Preserve internal characters/spacing. Offsets are selected—not typed—from inclusive UTC−12:00 through UTC+14:00 in 15-minute steps; persist integer minutes and display zero as `UTC+00:00`.
- Custom duplicate identity is NFKC + locale-independent case folding + trim + collapsed Unicode whitespace, paired with offset minutes. Punctuation and diacritics remain significant. Different normalized names may share an offset; one normalized name may occur at different offsets; city/custom identities never collide.
- Custom add/edit validates the complete proposal before committing. Invalid/duplicate input stays in the editor with an inline accessible explanation and mutates nothing. Editing retains stable ID and add sequence, writes once, reorders, and returns focus. Cancel/system Back discards the draft.
- Every selected row exposes `Delete <name>` in a far-right 48dp action column. Use a simple accessible `×` unless the production component library provides a genuinely native-quality trash icon. Delete opens a modal naming the clock and explaining irreversibility, with Cancel and destructive Delete; dialog Back cancels. Confirm writes once, removes once, announces once, offers no Undo, and focuses next displayed row, otherwise previous, otherwise Add.
- Add/edit/delete remain usable in Virtual time. A successful mutation preserves both virtual instants; new/edited rows project and sort at the same comparison instant. ([Prototype clock ordering around local time](issues/11-prototype-clock-ordering.md), [Define clock collection management](issues/07-define-clock-collection-management.md), [Define the offline clock catalog](issues/05-define-the-offline-clock-catalog.md))

### 8. Virtual-time interaction contract

- The compact time-status section and every row time are horizontal scrub surfaces. Use platform touch slop. Horizontal intent wins only when absolute horizontal displacement exceeds absolute vertical displacement; lock the winning axis. Taps, sub-threshold movement, cancellation, and vertically won gestures do not change mode/time and vertical gestures remain list scrolling.
- Once accepted, rightward travel means earlier and leftward travel means later. Derive from gesture-start state, not accumulated move-event rounding. Nominal sensitivity is 15 minutes per approximately 9dp (1.75 minutes/dp), quantized to 15-minute travel after the surface's initial entry/reanchor.
- The status surface uses the offset grid: from Live, first right/left is exactly `−0:15`/`+0:15`; later actions add/subtract exact 15-minute offsets.
- A row uses its wall-clock grid: first accepted movement directionally reanchors that row to `:00`, `:15`, `:30`, or `:45`; `07:32` right/left becomes `07:30`/`07:45`, while an exact boundary moves to the preceding/following quarter. Later row travel stays on that absolute grid. Switching rows reanchors through the new row; switching to status continues from the resulting virtual offset.
- Comparison instants occupy a cyclic 48-hour window from −24 through +24 hours around the captured live reference. Crossing an edge subtracts/adds 48 hours; never clamp, stop, or bounce. Preserve a row-derived nonzero minute remainder across wrapping.
- Hardware right/left arrow means earlier/later. Accessibility decrement/increment means earlier/later and uses the same grid/reanchor/wrap rules. Do not add fixed-step buttons.
- Small decorative chevrons flank and subtly pulse around each time; reduced motion disables the pulse. Virtual time uses a distinct accent-tinted semantic full-screen background in light and dark modes plus a sticky status section showing `Virtual time`, signed offset toward the left, and an icon-only revert control in the aligned action column. The control's accessible name/action is `Back` with a return-to-current-time hint. Do not show visible Back text, precision/range subtitles, a calendar UI, or a banner. ([Prototype clock scrubbing and virtual-time feedback](issues/03-prototype-clock-scrubbing.md), [Lock the clock interaction contract](issues/04-lock-the-clock-interaction-contract.md))

### 9. Presentation and accessibility contract

- Each row shows only digital time at left, city/custom name and effective offset to the right, selected-clock day difference when nonzero, and a selected-row action. Do not show relative labels, ordering explanations, timeline dots, prototype selectors, or discarded controls.
- Layout is portrait-first and responsive without Pixel-specific coordinates or horizontal page scrolling. Rows grow vertically; text wraps without colliding with the time or fixed action column. Maintain at least 48×48dp interactive targets and logical reading order: time, name, effective offset, day difference, action.
- Follow system light/dark appearance, 12/24 preference, font scale, locale changes that affect formatting, and reduced-motion preference. The English catalog/display labels are not runtime-localized. Meet 4.5:1 contrast for normal text and 3:1 for large text/meaningful UI boundaries; Virtual time must have a non-color signal.
- Expose every row/status scrub surface as an adjustable control separate from sibling actions. Value is `Live time` or a human-readable earlier/later virtual offset plus resulting displayed time. Hide chevrons and revert glyph from the accessibility tree while giving their controls semantics.
- Announce Virtual entry, offset/comparison changes, wrap, return, successful removal, validation, and retryable errors politely and once; do not announce all rows on every shared-instant change. Preserve focus by stable identity through sorting/mutation and implement the deletion fallback order already specified. ([Lock the clock interaction contract](issues/04-lock-the-clock-interaction-contract.md), [Define clock collection management](issues/07-define-clock-collection-management.md), [Lock the acceptance contract](issues/10-lock-the-acceptance-contract.md))

### 10. Error contract

- Catalog/schema/source validation is a build failure; never ship partial or runtime-inferred catalog coverage.
- Snapshot load accepts only valid current data or an explicitly supported migration. Unknown-newer or malformed data produces a visible accessible load error and is not overwritten. A transient load/write failure is retryable.
- Add/edit/delete success is withheld until persistence succeeds; pending duplicate activations do nothing; failure preserves prior visible and stored state.
- Form validation is inline and accessible, retains the draft, and never writes. Cancellation is not an error and produces no mutation.
- Offline operation is normal, not an error state. Catalog search, timezone projection, collection management, cold launch, and persistence require no network.
- Any unsupported required IANA identifier, incorrect Hermes fixture, crash, unhandled rejection, wrong projection/order, lost committed mutation, or inaccessible required action blocks acceptance rather than degrading silently. ([Define the offline clock catalog](issues/05-define-the-offline-clock-catalog.md), [Define clock collection management](issues/07-define-clock-collection-management.md), [Lock the acceptance contract](issues/10-lock-the-acceptance-contract.md))

## Testing Decisions

### Test philosophy and seams

- Test externally visible behavior at the highest seam that makes failures precise. Most state/use-case coverage injects time, device preferences, timezone rules, catalog, and persistence into the application boundary and asserts the render-neutral screen model, focus/announcement intents, persistence effects, and resulting state. Do not assert reducer action shapes, React component structure, formatter caches, or Async Storage call internals beyond the declared port contract.
- Pure projection tests exhaust arithmetic/normalization efficiently. Catalog build tests validate generated data. Snapshot codec/adapter contract tests validate durability. React Native component tests validate semantics, layout states, and user-visible transitions. The identical timezone fixture corpus must also run under Hermes/Android because Node-only success is insufficient.
- The repository is docs-only, so there is no local test prior art to copy. Implementation must establish these seams with the scaffold and keep the language-neutral conformance fixtures reusable across pure and Hermes adapter suites. ([Lock the acceptance contract](issues/10-lock-the-acceptance-contract.md))

### Exact timezone and formatting fixtures

The clock-projection suite asserts calendar date, hour/minute, effective offset, and day difference for each row:

| Case | Instant | Local / selected timezone | Required result |
| --- | --- | --- | --- |
| Winter | `2026-01-15T12:00:00Z` | Stockholm / New York | Local `2026-01-15 13:00 UTC+01:00`; selected `07:00 UTC−05:00`; no marker. |
| Summer | `2026-07-15T12:00:00Z` | Stockholm / New York | Local `14:00 UTC+02:00`; selected `08:00 UTC−04:00`; no marker. |
| Spring gap | `2026-03-08T06:59:00Z` then `07:00:00Z` | Stockholm / New York | New York changes `01:59 UTC−05:00` to `03:00 UTC−04:00`; never synthesize `02:xx`. |
| Autumn overlap | `2026-11-01T05:30:00Z` then `06:30:00Z` | Stockholm / New York | Both are `01:30`, first `UTC−04:00`, then `UTC−05:00`, as distinct instants. |
| Fractional | `2026-01-15T12:00:00Z` | Stockholm / Kathmandu | Selected `17:45 UTC+05:45`; no marker. |
| Date line +2 | `2026-01-01T10:30:00Z` | Pago Pago / Kiritimati | Local `2025-12-31 23:30`; selected `2026-01-02 00:30`; `+2`. |
| Date line −2 | `2026-01-01T10:30:00Z` | Kiritimati / Pago Pago | Local `2026-01-02 00:30`; selected `2025-12-31 23:30`; `−2`. |

- Add explicit `−1`, zero, and `+1` day-difference cases; zero omits the marker. Exercise every 15-minute fixed offset from −720 through +840 minutes, explicitly including −12:00, +00:00, +05:45, and +14:00; reject off-grid/out-of-range values and negative zero.
- At `00:05`, `12:05`, and `13:05`, 24-hour mode yields `00:05`, `12:05`, `13:05` without marker; 12-hour mode yields `12:05 AM`, `12:05 PM`, `1:05 PM`. Never render seconds. Preference/locale changes reproject without changing identity, records, or instant.

### Virtual-time, ordering, and lifecycle fixtures

- With relevant wall time `07:32`, status first-right/left yields `−0:15`/`+0:15` and `07:17`/`07:47`; row first-right/left yields `07:30`/`07:45` and `−0:02`/`+0:13`. At `07:30`, row right/left yields `07:15`/`07:45`. After row `+0:13`, status increment yields `+0:28`.
- Assert pointer right/left = earlier/later, accessibility decrement/increment = earlier/later, hardware right/left = earlier/later. At +24:00 a later step wraps to −23:45; at −24:00 an earlier step wraps to +23:45; the row-derived lattice wraps +23:58 to −23:47 and reverses exactly.
- Assert touch slop, axis arbitration, tap, cancellation, move-event batching invariance, held order during pointer scrub, frozen comparison after fake time advances, exact-zero exit, Back, background/foreground re-projection, and cold-launch Live mode.
- At `2026-01-01T10:30:00Z`, order Pago Pago (Dec 31), UTC (Jan 1), Kiritimati (Jan 2). Exact ties put Local first, then selected add sequence, then stable ID. New York sorts before custom UTC−04:30 at `2026-01-15T12:00:00Z`; that custom clock sorts first at `2026-07-15T12:00:00Z`. Verify recomputation triggers, overlay/gesture freezes, and focus retention.

### Catalog, collection, persistence, and UI fixtures

- Validate canonical catalog coverage, uniqueness, countries, aliases, formatter support, versions, and representative DST/non-DST Hermes projections. Search tests cover empty results/full catalog; case, diacritic, punctuation, whitespace, and term order; every-term matching; ranking tiers/ties; `São Paulo`/`sao paulo`; raw-IANA exclusion; and selected-city unavailability.
- Custom tests cover empty/whitespace, 1/40/41 graphemes, multi-code-point graphemes, preserved internal spacing, trimmed ends, newline/control rejection, every allowed offset, NFKC/case/Unicode-whitespace duplicates, and punctuation/diacritic distinctions. Add/edit cancellation or failure mutates nothing.
- Collection tests cover fresh/cleared state, successful add/edit, immutable city, named confirmation, dialog cancellation/Back, confirmed deletion/focus/announcement/no Undo, capacity 0–24, over-cap migration, Virtual-time mutations, and one-write/pending-repeat behavior.
- Snapshot tests round-trip the current version and every supported migration; reject malformed/newer data without rewrite; preserve captured removed-catalog city metadata; and simulate load/write failures proving prior state plus retryable accessible error.
- Responsive/semantic tests run at 320×568dp and 411×914dp, font scales 1.0/1.35/2.0, light/dark, reduced motion, and Live/Virtual states. Assert no essential clipping/overlap/horizontal scroll, 48×48dp targets, logical reading order, adjustable actions, hidden decoration, concise announcements, named actions, and contrast thresholds.

### Manual target acceptance

After all automated gates and an installable production build pass, execute and record the eight normative manual scenarios in [Lock the acceptance contract](issues/10-lock-the-acceptance-contract.md): offline cleared-data cold launch; offline catalog/custom additions and cap; custom edit and confirmed deletion including Virtual-time mutation; both scrub grids/axis/wrap/freeze; background/preference changes/Back/process death; light/dark/font-scale/reduced-motion responsive inspection; complete TalkBack operation; and 12/24, DST/fixed-offset, persistence, and offline relaunch checks.

Acceptance requires a clean production build, every automated suite green from a clean checkout, and every manual scenario passed on the target Pixel 7a. A crash, unhandled rejection, incorrect instant/offset/day difference/order, lost committed mutation, inaccessible required action, or unresolved acceptance-severity defect blocks release. Changed code reruns affected automated and manual cases; timezone-domain, persistence-schema, gesture-state, or shared-UI changes rerun their whole corresponding section.

## Out of Scope

- Android widget or lock-screen presentation, including `AppWidgetProvider`, Glance/`RemoteViews`, native-readable mirror storage, background widget refresh, widget update protocols/layouts, minute schedulers, or Kotlin widget/timezone modules.
- iOS, web, desktop, production WebView UI, or shipping either HTML prototype.
- Network catalog/search, downloaded timezone data, background catalog refresh, cloud sync, accounts, or cross-device synchronization.
- A comprehensive city gazetteer, runtime label localization, transliteration service, fuzzy spelling correction, raw-IANA search unless curated as an alias, or silent migration of saved catalog labels/zones.
- Manual ordering, a sort selector/setting, persisted display order, relative-time labels, ordering explanations, or configurable ordering modes.
- Seconds, calendar/date picking, visible Virtual-time banners, precision/range subtitles, fixed-step buttons, or persistence of Virtual time.
- Editing catalog city clocks, deleting Local, post-deletion Undo, seeding selected clocks, or more than 24 new selected clocks.
- Redux, SQLite, Reanimated, a bundled timezone-rule library, custom Kotlin timezone module, or other architecture added pre-emptively. Escalation requires measured implementation/device evidence and a separately recorded decision.
- Android versions below API 29 and a pull-request delivery workflow.

## Further Notes

- Decision precedence is explicit: [Prototype clock ordering around local time](issues/11-prototype-clock-ordering.md) and [Define clock collection management](issues/07-define-clock-collection-management.md) supersede “Local first” text in the earlier scrubbing prototype/interaction ticket. The collection ticket also supersedes the earlier snapshot suggestion that physical array order is presentation order: display order is derived; add sequence is persisted. [Authorize and inventory the target Pixel](issues/09-authorize-and-inventory-the-pixel-7.md) supersedes older “Pixel 7” shorthand with the actual Pixel 7a target.
- Target acceptance facts: authorized Google Pixel 7a (`lynx`), serial `34051JEHN12837`, Android 17/API 37, security patch `2026-07-05`, 1080×2400 at 420 dpi, current 411×914dp portrait configuration, 60/90Hz modes, centered 118px top cutout, font scale 1.35, `sv-SE`, 24-hour, `Europe/Stockholm` (CEST/UTC+02:00 at inventory).
- Timezone correctness is bounded by the device's installed tzdata. The normative fixtures must pass under the release's Hermes/Android runtime. Escalate to a native `java.time` adapter only if required conformance fails; do not add one speculatively. ([Expo and offline timezone feasibility](research/expo-and-offline-timezone-feasibility.md))
- Primary decisions: [Research Expo and offline timezone feasibility](issues/01-research-expo-and-timezone-feasibility.md), [Choose the application foundation](issues/02-choose-application-foundation.md), [Prototype clock scrubbing and virtual-time feedback](issues/03-prototype-clock-scrubbing.md), [Lock the clock interaction contract](issues/04-lock-the-clock-interaction-contract.md), [Define the offline clock catalog](issues/05-define-the-offline-clock-catalog.md), [Handle extreme day differences](issues/06-handle-extreme-day-differences.md), [Define clock collection management](issues/07-define-clock-collection-management.md), [Define widget-ready boundaries without building a widget](issues/08-define-widget-ready-boundaries.md), [Authorize and inventory the target Pixel](issues/09-authorize-and-inventory-the-pixel-7.md), [Lock the acceptance contract](issues/10-lock-the-acceptance-contract.md), and [Prototype clock ordering around local time](issues/11-prototype-clock-ordering.md).
- The next map task is [Create tracer-bullet implementation tasks](issues/13-create-tracer-bullet-implementation-tasks.md). It decomposes this specification; it must not reinterpret the product decisions above.
