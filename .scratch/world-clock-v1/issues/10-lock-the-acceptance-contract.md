# Lock the acceptance contract

Type: grilling
Status: closed
Assignee: Codex
Blocked by: 04, 05, 06, 07, 08, 09

## Question

What exact automated and Pixel 7a acceptance scenarios, timezone/DST fixtures, accessibility checks, lifecycle cases, and pass criteria must implementation tasks satisfy before the app is considered fully working?

## Resolution

V1 is accepted only when every automated gate and every later manual Pixel 7a scenario below passes. A failure is not waived because the same behavior works in another environment. Tests use injected instants and device-preference ports; they never depend on the wall clock, network, test execution order, or the host timezone. Expected timezone results must also pass through the Hermes adapter used by the Android app, not only a host JavaScript runtime.

### Automated domain and adapter fixtures

The render-neutral clock-projection conformance suite must cover these exact instants and expectations. Each case verifies calendar date, hour/minute, effective offset, and day difference relative to the named local timezone; city cases use IANA rules and custom cases use integer-minute arithmetic.

| Case | Instant | Local / selected timezone | Required result |
| --- | --- | --- | --- |
| Ordinary winter | `2026-01-15T12:00:00Z` | `Europe/Stockholm` / `America/New_York` | Local `2026-01-15 13:00 UTC+01:00`; selected `07:00 UTC−05:00`; no day marker. |
| Ordinary summer | `2026-07-15T12:00:00Z` | `Europe/Stockholm` / `America/New_York` | Local `14:00 UTC+02:00`; selected `08:00 UTC−04:00`; no day marker. |
| DST spring gap | `2026-03-08T06:59:00Z`, then `07:00:00Z` | `Europe/Stockholm` / `America/New_York` | New York advances from `01:59 UTC−05:00` to `03:00 UTC−04:00`; `02:xx` is never synthesized. |
| DST autumn overlap | `2026-11-01T05:30:00Z`, then `06:30:00Z` | `Europe/Stockholm` / `America/New_York` | Both project to `01:30`, first at `UTC−04:00`, then at `UTC−05:00`; the two absolute instants remain distinct. |
| Non-DST fractional zone | `2026-01-15T12:00:00Z` | `Europe/Stockholm` / `Asia/Kathmandu` | Selected `17:45 UTC+05:45`; no day marker. |
| Date-line `+2` | `2026-01-01T10:30:00Z` | `Pacific/Pago_Pago` / `Pacific/Kiritimati` | Local `2025-12-31 23:30`; selected `2026-01-02 00:30`; marker `+2`. |
| Date-line `−2` | `2026-01-01T10:30:00Z` | `Pacific/Kiritimati` / `Pacific/Pago_Pago` | Local `2026-01-02 00:30`; selected `2025-12-31 23:30`; marker `−2`. |

Companion cases at instants yielding `−1`, zero, and `+1` prove the signed calendar-date calculation and that zero omits the marker. Fixed-offset cases cover every 15-minute value from `−720` through `+840`, with explicit assertions for `UTC−12:00`, `UTC+00:00`, `UTC+05:45`, and `UTC+14:00`; zero never formats as negative zero. Invalid off-grid and out-of-range offsets are rejected. The same projection fixtures run against the pure domain contract and the Hermes/Android timezone-rules adapter, allowing differences only when a fixture explicitly documents a different installed tzdata release.

At `00:05`, `12:05`, and `13:05`, 24-hour mode renders `00:05`, `12:05`, and `13:05` without a marker; 12-hour mode renders `12:05 AM`, `12:05 PM`, and `1:05 PM` with an AM/PM marker. Neither mode exposes seconds. A preference or locale change reprojects existing rows without changing their identities, selected records, or shared instant.

### Automated virtual-time and lifecycle contract

Use a live reference instant whose relevant wall time is `07:32` to exercise both intentional grids:

- On the time-status **offset grid**, the first accepted right/left actions yield exactly `−0:15` / `+0:15`, hence `07:17` / `07:47`. Every later status adjustment changes the existing virtual offset by exactly 15 minutes.
- On a row's **wall-clock grid**, first right yields `07:30` and offset `−0:02`; first left yields `07:45` and offset `+0:13`. From exactly `07:30`, first right/left selects `07:15` / `07:45`, never the current quarter. Reanchoring from another row uses that row's displayed quarter-hour grid, updates one shared absolute comparison instant for all rows, and returning to the status surface continues from the resulting offset; for example, a status increment after `+0:13` yields `+0:28`.
- Right means earlier and left means later for pointer gestures; accessibility decrement/increment mean earlier/later; hardware right/left arrows mean earlier/later as already specified. All paths use the same state transition and preserve the appropriate grid.
- Exact edges are reachable: later from `+24:00` wraps to `−23:45`, and earlier from `−24:00` wraps to `+23:45`. A row-derived `−0:02` lattice wraps from `+23:58` to `−23:47`; its reverse wraps back. No path clamps or bounces.
- Before touch slop, on a tap, on cancellation, or when vertical intent wins first, mode and time do not change. Once horizontal intent wins it remains locked for that gesture. Calculations derive from gesture-start state, so different move-event batching produces the same result. The displayed row order stays fixed during a continuous pointer gesture and reconciles on gesture end.
- The comparison instant freezes after a completed adjustment: advancing the fake wall clock by five minutes leaves every virtual projection and the signed offset unchanged. Background/foreground preserves the live reference and comparison instants while reprojecting changed timezone, locale, theme, or 12/24 preference. `Back` clears both, samples current time, and resumes live mode. Reaching exact zero does the same without showing `+0:00`.
- A process-recreation/cold-launch fixture restores the selected-clock snapshot but always starts live. Virtual time, local clock, derived order, formatted values, device preferences, and theme are absent from serialized state.

Component tests expose row and status scrub surfaces as adjustable controls with useful live/virtual values. They cover accessibility increment/decrement, inverted hardware arrows, polite single announcements for entry/change/wrap/Back, hidden decorative chevrons/glyphs, reduced-motion disabling of the pulse, and independent semantics for sibling Delete/Back actions.

### Automated collection, ordering, catalog, and persistence contract

- Chronological sorting uses displayed calendar date then minute-of-day at the shared instant. At `2026-01-01T10:30:00Z`, Pago Pago sorts on `2025-12-31`, UTC on `2026-01-01`, and Kiritimati on `2026-01-02`. For exact ties, Local precedes selected clocks; selected clocks retain add-sequence order and finally stable-ID order. A fixture with New York and a custom `UTC−04:30` proves DST can reverse their order: New York sorts first at `2026-01-15T12:00:00Z`, while the custom clock sorts first at `2026-07-15T12:00:00Z`.
- Reordering is recomputed on minute ticks, phone-timezone changes, mutations, `Back`, and completed adjustments. Stable IDs preserve logical focus. Pointer scrubs defer movement until gesture end; discrete accessibility/keyboard adjustments retain focus after each reorder. An open selector/editor/dialog freezes the visible list and reconciles when closed.
- A fresh store renders only the mandatory, nondeletable local clock, the exact empty-state guidance, and `Add timezone`. A successful add writes once, closes the selector, scrolls to the chronologically placed row, and focuses it. The same catalog ID cannot be added twice, while different catalog entries sharing rules may coexist. Custom and city identities never collide.
- The catalog-generation test pins source and schema versions; proves exactly one entry per canonical `zone1970.tab` region; validates unique immutable IDs and IANA IDs, country metadata, formatter support, nonempty single-line labels, and normalized-alias uniqueness; and runs representative DST/non-DST entries through Hermes. The app performs no catalog network access.
- Search fixtures prove empty-query completeness; case, diacritic, punctuation, whitespace, and term-order normalization; all-term matching across city/country/code/alias fields; and deterministic exact-field, field-prefix, token-prefix, then substring ranking with city/country/ID tie-breaks. `São Paulo`, `sao paulo`, and reversed country/city terms resolve the same fixture. Raw IANA IDs do not match unless explicitly aliased. Already-selected cities are visibly and accessibly unavailable.
- Custom-name tests cover empty/whitespace-only, 1 and 40 extended grapheme clusters, rejection at 41, preserved internal spacing, trimmed ends, multi-code-point graphemes, newline, and Unicode control characters. Duplicate tests prove NFKC, locale-independent case folding, trimming, and collapsed Unicode whitespace; punctuation and diacritics remain identity-significant. Create/edit reject duplicates without mutation. The offset selector exposes all and only the inclusive 15-minute range. Cancel/system Back discard drafts; a valid edit atomically retains stable ID and add sequence and then reorders/focuses the row.
- City clocks have no edit action. Every selected row has `Delete <name>`; Local never does. Delete always names the clock in a modal with Cancel and destructive Delete. Cancel/dialog Back do nothing. Confirm writes once, removes once, announces once, and focuses next row, otherwise previous, otherwise `Add timezone`; there is no Undo.
- Zero through 24 selected clocks are supported. At 24, Add remains visible but unavailable with `Maximum of 24 timezones reached`; edit/delete remain available. An over-cap migrated snapshot is preserved and blocks adds until below 24.
- Current-version snapshots round-trip as plain JSON and contain only version, stable selected records, IDs, and monotonic add sequences. Migration fixtures cover every supported older version. Malformed records and unknown newer versions fail visibly without silent rewriting or partial recovery. Each add/edit/delete issues one atomic replacement write; pending repeat activation is ignored. A failed write leaves the prior in-memory and stored collection intact, reports an accessible retryable error, and claims no success. Relaunch restores committed selections and sequence values, including saved city metadata no longer present in a newer catalog.

Responsive component snapshots and interaction tests run at minimum at `320×568dp` and the target `411×914dp`, with font scales `1.0`, `1.35`, and `2.0`, in light and dark themes. Rows may grow and labels may wrap, but time, text, day marker, and the fixed action column must not overlap, clip essential content, or create horizontal page scrolling. Logical reading order is time, name, effective offset, day difference, action. Every interactive target is at least `48×48dp`. Theme tests meet WCAG contrast of 4.5:1 for normal text, 3:1 for large text and meaningful UI boundaries, and retain a non-color virtual-time signal.

### Later manual pass on the connected Pixel 7a

Run this only after an installable development/release build and all automated gates pass. Record build identity and results against the authorized Google Pixel 7a (`lynx`), serial `34051JEHN12837`, Android 17/API 37, `1080×2400` at 420 dpi (`411×914dp`), centered top cutout, system font scale 1.35, locale `sv-SE`, 24-hour preference, and `Europe/Stockholm`. Re-run any item affected if those facts change.

1. With app data cleared and network unavailable, cold-launch the installed build. It must reach the usable local-only empty state without a request, spinner, crash, or network error; Local reflects Stockholm and `Add timezone` works entirely offline.
2. Search offline using case/diacritic/punctuation/term-order variants, add representative ordinary, DST, fractional-offset, and date-line city clocks, then add a custom clock. An added city becomes unavailable; a duplicate custom save remains in the form with an announced inline error. Verify chronological placement, effective offsets, day markers, the 24-clock cap, and that Local can move but cannot be edited or deleted.
3. Edit a custom clock and verify stable focus at its new chronological position. Cancel another edit. Delete a selected clock, verifying the named warning, Cancel/dialog Back, confirmed deletion, focus movement, and the absence of Undo. Repeat add/edit/delete while in Virtual time and confirm the frozen instant does not change.
4. On both the sticky status surface and at least three rows, verify right-for-earlier, left-for-later, quarter-grid versus offset-grid behavior, approximately one 15-minute step per 9dp, both wrap edges including a non-quarter offset, and exact-zero exit. In at least ten vertical drags begun over row scrub targets, the list must scroll without entering/changing Virtual time. Taps and aborted gestures must not change time. The active row must not move under the finger and must reorder correctly on release.
5. Leave the app backgrounded long enough for live time to advance, then return: Live mode catches up. Repeat in Virtual time: every clock remains at the frozen instant. Change timezone, 12/24 preference, theme, and locale while backgrounded; on return the frozen instant remains while projections/preferences update. `Back` resumes current live time. Force-stop from Virtual time and cold-launch: committed clocks restore, but the app starts live.
6. In both system light and dark appearances and at font scales 1.35 and 2.0, inspect the full collection, selector, custom form, confirmation dialog, empty/cap/error states, and Virtual-time treatment in portrait. Nothing overlaps the cutout or action column, essential text is not clipped, wrapping remains readable, targets remain usable, and there is no horizontal page scrolling. Reduced-motion mode stops chevron pulsing without removing the scrub affordance.
7. With TalkBack enabled, traverse the whole screen in logical order; identify Local versus selected clocks, each displayed time/offset/day difference, Add, Edit, Delete, and Back; operate both scrub surfaces through adjustable actions; hear concise entry/change/wrap/return and mutation/error announcements; retain focus through ordering changes; and complete add, validation, edit, confirmed delete, and Back without sight. No decorative glyph receives focus and no action is unlabeled.
8. Switch between 24-hour and 12-hour system preferences and verify immediate rendering with no seconds and an AM/PM marker only in 12-hour mode. Verify city offsets across a real DST-aware zone and custom offsets remain fixed. Relaunch again while offline to prove the last committed collection survives.

### Gate

Acceptance requires a clean production build, all deterministic/domain/component/integration/Hermes tests passing from a clean checkout, and every manual step recorded as pass on the target Pixel 7a. There may be no crash, unhandled rejection, incorrect instant/offset/day marker/order, lost committed mutation, inaccessible required action, or unresolved acceptance-severity defect. Any failure blocks completion until fixed and rerun; changed code reruns its affected automated suites and manual scenarios, while timezone-domain, persistence-schema, gesture-state, or shared UI changes rerun their entire corresponding section.
