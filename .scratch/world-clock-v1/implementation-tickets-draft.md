# Approved World Clock v1 implementation-ticket breakdown

Status: approved and published

The owner approved this breakdown exactly as drafted. The published set is indexed at [World Clock v1 implementation tickets](implementation/index.md). Every ticket lands directly on `master`; none creates a branch or pull request. The approved [implementation specification](spec.md) remains authoritative.

## Approved breakdown

### 1. Launch the live local clock

**Blocked by:** None — can start immediately.

**What it delivers:** A cleanly scaffolded strict-TypeScript Expo/Hermes Android app that launches into a native React Native screen showing the mandatory Local clock at the current instant, its effective UTC offset, the empty-collection guidance, and no seconds. It follows the system timezone and 12/24-hour preference and refreshes at minute boundaries. This is the minimum scaffold and first end-to-end product slice, not a standalone setup ticket.

**Scoped seams:** Expo CNG/app configuration and reproducible build commands; domain clock definition/projection boundary sufficient for Local; application time/device-preference ports and Live screen model; Hermes `Intl` and Expo localization adapters; native React Native clock screen; base external-behavior test harness. Do not introduce persistence, catalog, Virtual time, Redux, WebView, or speculative native modules.

**Automated acceptance subset:** Clean install/start and strict typecheck/test/build commands; API 29 minimum and Hermes configuration; injected-clock tests proving one shared sampled instant, minute refresh, timezone/preference re-projection, `00:05`/`12:05`/`13:05` 12/24 formatting, AM/PM only in 12-hour mode, no seconds, correct Local offset, empty guidance, and no delete action; basic semantic and 48dp target checks at 411×914dp.

**Later Pixel 7a checkpoint:** Cold-launch the development build and confirm Stockholm Local, 24-hour rendering, current effective offset, empty state, and cutout-safe 411×914dp layout. This checkpoint may be performed during ticket 13 rather than blocking this slice.

### 2. Generate the validated offline clock catalog

**Blocked by:** 1 — Launch the live local clock.

**What it delivers:** A pinned, reproducible, English offline clock catalog containing exactly one entry per canonical region in one IANA `zone1970.tab` release, ready for app consumption. This is the one necessary enabling/data-prefactor slice; it remains green and independently verifiable through its generator and validation report.

**Scoped seams:** Checked-in IANA/ISO source inputs and release metadata; curated city/country/alias source; deterministic generator; versioned generated JSON contract; catalog parser/validator and search normalizer/ranker. It does not add selector UI or selected clocks.

**Automated acceptance subset:** Source/schema/catalog version presence; complete one-per-canonical-region coverage; immutable/unique catalog and IANA IDs; country resolution, multi-country metadata, nonempty single-line display fields, formatter support, and normalized-alias uniqueness; deterministic regeneration with no diff; empty-query/full-catalog behavior; exact/field-prefix/token-prefix/substring ranking and city/country/ID ties; case/diacritic/punctuation/whitespace/term-order fixtures including `São Paulo`; raw IANA exclusion unless aliased.

**Later Pixel 7a checkpoint:** None as a separate manual action; ticket 3 consumes this artifact offline and the release/Hermes tickets validate its required IANA IDs on Android.

### 3. Add, project, and restore offline city clocks

**Blocked by:** 2 — Generate the validated offline clock catalog.

**What it delivers:** From the live app, a user can open the offline selector, browse/search, add one city timezone, see it projected with effective offset/day difference in the chronologically ordered clock collection, and relaunch offline with the committed city restored. Additional distinct cities—including cities sharing rules—can coexist; an already-selected catalog entry is unavailable.

**Scoped seams:** Clock-catalog port and generated JSON adapter; selector screen and result semantics; city projection through the timezone-rules port; application add/use-case and chronological screen model; versioned selected-clock snapshot/codec and atomic persistence port with Async Storage adapter; stable IDs/add sequence; focus/scroll effect after add. Keep catalog cities immutable and exclude custom/edit/delete/capacity policy from this slice.

**Automated acceptance subset:** Exact winter/summer, DST gap/overlap, Kathmandu fractional offset, date-line `−2`/`+2`, companion `−1`/zero/`+1`, effective offset, and no-seconds fixtures through pure projection; chronological date/minute sorting, Local-first-on-tie, add-sequence/stable-ID ties, and New York versus fixed-offset DST reorder; offline search/result ranking and selected-city unavailability; same-IANA/different-catalog coexistence; successful one-write add, captured city metadata, JSON round-trip, relaunch restore, removed/renamed-catalog selection survival, selector cancel, overlay-held order, focus/scroll outcome, and no network access.

**Later Pixel 7a checkpoint:** In airplane/offline conditions, search with spelling variants, add ordinary/DST/fractional/date-line cities, confirm offsets/day markers/chronological placement and duplicate unavailability, then relaunch and confirm restoration. The complete run is deferred to ticket 13.

### 4. Create and edit custom timezones

**Blocked by:** 3 — Add, project, and restore offline city clocks.

**What it delivers:** A user can take a separate custom path, create a named fixed-offset selected clock, and later edit its name/offset in place. Valid changes persist once, keep stable identity/add sequence, reorder/focus the row, and remain correct offline; cancel or invalid/duplicate drafts change nothing.

**Scoped seams:** Custom definition, grapheme/name validation, identity normalization, fixed-offset arithmetic/formatting, and duplicate detection in the domain; custom create/edit application use cases and snapshot records; shared validated form/offset selector; inline accessible errors and focus effects. Do not add city editing.

**Automated acceptance subset:** Every 15-minute offset from −720 through +840 and explicit −12:00/+00:00/+05:45/+14:00 cases; off-grid/out-of-range/negative-zero rejection; empty/whitespace, 1/40/41 graphemes, multi-code-point graphemes, trim/preserve-internal-spacing, newline/control tests; NFKC/case/Unicode-whitespace duplicate identity with punctuation/diacritics significant; city/custom identity separation; atomic valid add/edit with one write, stable ID/add sequence, reorder/focus; cancel/system Back/invalid/duplicate retains draft and stored state; no edit action for city rows.

**Later Pixel 7a checkpoint:** Create a fractional custom timezone, provoke and hear duplicate/invalid inline errors, edit and cancel drafts, and confirm fixed offset/persistence and stable focus. Deferred to tickets 11/13.

### 5. Delete selected clocks safely

**Blocked by:** 3 — Add, project, and restore offline city clocks.

**What it delivers:** Every selected row can be removed only through a named, irreversible confirmation. Cancel/dialog Back preserve the clock; confirmed Delete persists once, removes once, announces once, and moves focus predictably. Local remains mandatory and has no delete action or path.

**Scoped seams:** Delete use case/effect contract; atomic snapshot replacement; selected-row action column; accessible confirmation modal; announcement and stable focus fallback coordination. Use the simple accessible `×` unless a native-quality trash icon already exists.

**Automated acceptance subset:** `Delete <name>` labeling; 48dp selected action and no Local action; named warning with Cancel/destructive Delete; dialog Back/cancel/no mutation; pending repeat ignored; successful one-write removal/no Undo/single announcement; focus to next, previous, then Add fallback; stable render keys and chronological reconciliation after overlay closes.

**Later Pixel 7a checkpoint:** Exercise cancel, system dialog Back, confirmed removal, focus fallback, and absence of Undo with touch and later TalkBack. Deferred to tickets 11/13.

### 6. Make collection persistence and capacity failure-safe

**Blocked by:** 4 — Create and edit custom timezones; 5 — Delete selected clocks safely.

**What it delivers:** The complete city/custom collection behaves safely at capacity and under persistence corruption or failure. At 24 selected clocks Add remains visible but unavailable with the required explanation; over-cap migrated data is preserved. Malformed/newer snapshots and transient reads/writes never silently overwrite or partially mutate user data and expose accessible retry paths.

**Scoped seams:** Snapshot version validation and supported migration registry; application hydration/error/retry states; staged mutation/pending guard shared by add/edit/delete; capacity policy; accessible load/write errors and disabled Add state. Add sequence remains authoritative and presentation order remains derived.

**Automated acceptance subset:** 0–24 capacity, exact maximum copy, edits/deletes still available at cap, over-cap preservation/add block until below cap; current JSON contract round-trip without derived/platform values; every declared older migration; malformed/current-invalid/unknown-newer rejection without rewrite; read/write failure and retry; prior in-memory/stored state after failed add/edit/delete; no claimed success and ignored repeat activation; cold launch restores committed selections but no transient state.

**Later Pixel 7a checkpoint:** Confirm cap messaging and that committed clocks survive offline force-stop/relaunch. Storage-fault injection remains automated; user-facing error semantics are rechecked with TalkBack in ticket 11.

### 7. Compare time through the status-surface offset grid

**Blocked by:** 3 — Add, project, and restore offline city clocks.

**What it delivers:** A user can horizontally scrub the compact time-status surface to enter Virtual time, move every clock together on the relative 15-minute offset grid within the cyclic ±24-hour window, inspect a frozen comparison, and use Back or exact zero to resume current Live mode.

**Scoped seams:** Live/Virtual application state with live reference/comparison instants; offset-grid transition and wrap domain logic; status-surface gesture adapter; sticky Virtual status/background treatment; Back action; keyboard and adjustable-action mapping for this surface; transient state excluded from persistence.

**Automated acceptance subset:** At 07:32 first right/left = −0:15/+0:15 and 07:17/07:47; later exact 15-minute steps; right/left and keyboard/accessibility direction mappings; +24:00→−23:45 and −24:00→+23:45 wrap; frozen comparison after fake time advances; every row shares the comparison instant; Back samples then-current live time; exact zero exits without +0:00; status semantics/announcements; no fixed-step controls, calendar UI, banner, or persisted Virtual state.

**Later Pixel 7a checkpoint:** Confirm sensitivity/direction, shared freeze, both wrap edges, distinct Virtual treatment/sticky Back alignment, and exact-zero/Back return. Deferred to ticket 13.

### 8. Scrub any clock row without stealing vertical scroll

**Blocked by:** 7 — Compare time through the status-surface offset grid.

**What it delivers:** Every clock row becomes a direct-manipulation scrub surface using that row's directional quarter-hour wall grid. Users can switch between rows and the status surface while preserving one comparison instant, scroll vertically from a row without changing time, and scrub without the active row moving beneath the pointer.

**Scoped seams:** Row-grid reanchor/wrap domain transitions; gesture-start snapshot and move quantization; platform touch-slop/axis arbitration/cancellation; row gesture-handler integration; held-order/reconcile effect; row keyboard/adjustable actions; decorative chevrons as nonsemantic affordance.

**Automated acceptance subset:** At 07:32 row right/left = 07:30/07:45 and −0:02/+0:13; at 07:30 move to preceding/following quarter; switch row reanchor and then status +0:13→+0:28; nonzero lattice +23:58→−23:47 and reverse; 15 minutes per approximately 9dp; gesture-start/move-batching invariance; touch slop, tap, cancellation, horizontal/vertical axis win/lock; vertical scrolling no Virtual change; held order then reconciliation; stable focus; hardware/accessibility mappings and row value announcements.

**Later Pixel 7a checkpoint:** Scrub at least three rows, verify quarter-grid feel and switches, perform ten row-origin vertical scrolls with zero false activation, exercise non-quarter wrap, and confirm active-row stability. Deferred to ticket 13.

### 9. Preserve Virtual time through lifecycle and collection changes

**Blocked by:** 6 — Make collection persistence and capacity failure-safe; 8 — Scrub any clock row without stealing vertical scroll.

**What it delivers:** Virtual time survives ordinary background/foreground transitions and remains the same comparison while device preferences reproject. Add, custom edit, and confirmed delete remain available without changing the virtual instants. Process death/cold launch restores only committed clocks and starts Live.

**Scoped seams:** App-lifecycle/device-preference adapter events; application re-projection without instant mutation; Virtual-aware selector/editor/delete flows; transient/persisted boundary; order/focus reconciliation after mutation/overlay; minute tick pause/resume behavior.

**Automated acceptance subset:** Live foreground catches up; Virtual foreground keeps live reference/comparison while timezone/locale/theme/12-hour preference changes reproject; successful city/custom add, edit, and delete preserve both instants and sort new projections; failed/cancelled mutations preserve collection and instants; overlays hold order; Back resumes then-current Live; process recreation/cold launch restores snapshot in Live with no serialized Virtual/theme/preferences/derived fields.

**Later Pixel 7a checkpoint:** Background both modes, change timezone/12/24/theme/locale while backgrounded, mutate the collection in Virtual time, Back, then force-stop/cold-launch and verify restoration in Live. Deferred to ticket 13.

### 10. Finish responsive light/dark and reduced-motion presentation

**Blocked by:** 4 — Create and edit custom timezones; 5 — Delete selected clocks safely; 6 — Make collection persistence and capacity failure-safe; 8 — Scrub any clock row without stealing vertical scroll.

**What it delivers:** The full clock, selector, custom form, confirmation, empty/cap/error, and Virtual-time surfaces remain readable and operable in compact/target viewports, large text, system light/dark appearance, and reduced motion. Required content wraps rather than overlapping or horizontally scrolling.

**Scoped seams:** Shared semantic theme/tokens; responsive row/action-column and overlay layouts; typography/wrapping; reduced-motion adapter; chevron animation; contrast verification. This is cross-surface UI completion after the underlying vertical behaviors exist, not a redesign or WebView port.

**Automated acceptance subset:** Component/render checks at 320×568dp and 411×914dp with font scales 1.0/1.35/2.0 in light/dark and Live/Virtual; no essential clipping, collision, cutout issue, or horizontal page scroll; fixed 48dp action column/targets; required reading order; Virtual non-color signal; 4.5:1 normal text and 3:1 large text/UI boundary contrast; reduced motion stops pulsing without removing chevrons; no prototype-only controls/labels.

**Later Pixel 7a checkpoint:** Inspect every named surface at font scales 1.35/2.0, light/dark, and reduced motion on the 411×914dp cutout display. Deferred to ticket 13.

### 11. Complete the TalkBack and stable-focus journey

**Blocked by:** 9 — Preserve Virtual time through lifecycle and collection changes; 10 — Finish responsive light/dark and reduced-motion presentation.

**What it delivers:** A TalkBack user can traverse, understand, add, validate, edit, delete, chronologically follow, scrub through both grids, wrap, and return to Live without sight or focus loss. Decorative glyphs remain silent and state announcements are concise rather than multiplying across rows.

**Scoped seams:** Accessible roles/names/values/hints/actions for all existing surfaces; announcement coordinator; stable-ID focus restoration/deferred reorder behavior; overlay focus entry/return; semantic reading order. Feature behavior remains owned by earlier slices.

**Automated acceptance subset:** Full semantic traversal order; Local/selected distinction; time/name/offset/day difference; named Add/Edit/Delete/Back; row/status adjustable values and increment/decrement; hidden chevrons/revert glyph; polite single entry/change/wrap/Back/mutation/error announcements; no per-row shared-update chatter; focus through DST/timezone reorder, add/edit/delete and overlay close; deletion fallbacks; keyboard arrow parity; all required flows operable without pointer-only steps.

**Later Pixel 7a checkpoint:** Execute the complete TalkBack scenario from acceptance ticket 10, including search, validation, edit, confirmation, both scrub surfaces, wrap, focus retention, errors, and Back. Deferred to ticket 13.

### 12. Prove the clean Android release and Hermes conformance gate

**Blocked by:** 11 — Complete the TalkBack and stable-focus journey.

**What it delivers:** A reproducible installable Android production candidate from a clean checkout with every automated suite green and the language-neutral timezone corpus passing under the release's Hermes/Android runtime. This catches device-ICU and CNG/build differences before the manual acceptance session.

**Scoped seams:** Clean dependency/install/typecheck/test/catalog-generation/build pipeline; production Expo CNG configuration; Hermes conformance runner sharing the normative fixtures; release artifact identity and automated result record. Do not add speculative Kotlin/timezone libraries; a conformance failure blocks and triggers a separately recorded decision.

**Automated acceptance subset:** Clean production build; all domain/application/catalog/snapshot/component/integration suites; deterministic catalog regeneration; exact winter/summer, DST gap/overlap, fractional/date-line/day-difference/fixed-offset/12-hour fixtures under Hermes; no network dependency; no crash or unhandled rejection in automated launch smoke; generated native output reproducible and not hand-maintained.

**Later Pixel 7a checkpoint:** Install/launch smoke the exact candidate and record its identity only; the full device pass is ticket 13.

### 13. Install and accept v1 on the connected Pixel 7a

**Blocked by:** 12 — Prove the clean Android release and Hermes conformance gate.

**What it delivers:** The exact production candidate is installed and the v1 destination is reached only after all eight normative manual scenarios pass on the authorized Google Pixel 7a. Results and environment facts are recorded durably; any failure blocks completion and returns to the owning implementation slice for a fix and required reruns.

**Scoped seams:** Release installation and evidence capture; acceptance checklist/results against the built app; no new product behavior or opportunistic redesign. Target serial is `34051JEHN12837`, Android 17/API 37, 411×914dp, font scale 1.35, `sv-SE`, 24-hour, `Europe/Stockholm` unless the recorded preflight shows a change.

**Automated acceptance subset:** Re-run the clean gate for the exact artifact before install. No new unit seam is introduced; failures require the spec's affected-suite and whole-section rerun policy.

**Later Pixel 7a checkpoint:** This is the checkpoint: offline cleared-data cold launch; catalog/custom add and cap; edit/confirmed delete/Virtual mutation; both grids/axis/wrap/freeze; lifecycle/preferences/Back/process death; light/dark/font-scale/reduced-motion layout; complete TalkBack flow; 12/24, DST/fixed offset, persistence, and offline relaunch. Every item must be recorded pass with no acceptance-severity defect.

## Proposed dependency frontier

- Start: 1.
- After 1: 2.
- After 2: 3.
- After 3: 4, 5, and 7 can proceed independently.
- After 4 and 5: 6.
- After 7: 8.
- After 6 and 8: 9; after 4, 5, 6, and 8: 10.
- After 9 and 10: 11.
- Then 12, then 13.

## Owner quiz

1. Does this 13-ticket granularity feel right—especially the larger city-clock slice 3—or is it too coarse or too fine for one fresh agent session per ticket?
2. Are the blocking edges correct, including the parallel frontier after ticket 3 and the join of persistence plus row scrubbing before lifecycle/Virtual-mutation ticket 9?
3. Should any tickets be merged or split further—for example splitting city projection/persistence from selector search, or merging the responsive and TalkBack completion tickets?
