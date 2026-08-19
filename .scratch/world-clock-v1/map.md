# World Clock v1: From product brief to validated Android app

Label: wayfinder:map

## Destination

Reach an implementation-ready v1 product and technical specification, then hand it into tracer-bullet implementation tasks whose completion produces an offline Android world-clock app installed and validated on the connected Pixel 7a.

Status: reached on 2026-08-19. The signed offline Hermes app is installed and its
non-deferred acceptance scenarios pass on the Pixel 7a. The owner indefinitely
deferred physical TalkBack operation; automated native accessibility semantics remain
required and pass.

## Notes

- Use the `grilling` and `domain-modeling` skills for product decisions, `prototype` for interaction questions, and `research` for external facts.
- Work in phase order: finish and approve the specification; create implementation tasks; implement them; install and validate on the connected Pixel 7a.
- Prefer React Native with Expo because the owner knows TypeScript. Native Kotlin is acceptable when evidence shows it materially lowers delivery risk.
- The local clock is mandatory and nondeletable but participates in automatic chronological ordering with selected clocks. New installs otherwise start empty.
- Selected clocks persist and support custom-clock editing/removal; v1 has no manual or configurable ordering. Same-timezone cities may coexist; exact duplicate entries may not.
- Display follows the phone's 12/24-hour preference; 12-hour time includes an AM/PM marker. Seconds are never shown.
- Horizontal scrubbing on any clock moves all clocks through virtual time, within 24 hours before or after now. Virtual time uses a distinct background treatment and an action labelled `Back`; it has no calendar UI or banner.
- City clocks use timezone rules including DST. Custom timezones have a required name and a fixed UTC offset from UTC−12:00 through UTC+14:00 in 15-minute increments.
- Selection is offline and searchable by city or country, with a separate custom-offset path.
- Show the city/custom name and effective `UTC±HH:MM` offset to the right of each digital time.
- Support system light/dark appearance, portrait-first responsive layout, font scaling, and screen readers.
- Automated timezone/UI/accessibility coverage and the non-deferred manual acceptance pass on the connected Pixel 7a are required. Physical TalkBack operation is owner-deferred indefinitely.
- ADB is authorized for the connected Google Pixel 7a (`lynx`), serial `34051JEHN12837`.
- The approved implementation set is indexed at [World Clock v1 implementation tickets](implementation/index.md). Work its ready, unblocked frontier directly on `master`; do not use branches or pull requests.

## Decisions so far

- [Research Expo and offline timezone feasibility](issues/01-research-expo-and-timezone-feasibility.md) — Expo/Hermes is viable for offline v1; own the catalog and preserve a native widget state/domain seam.
- [Choose the application foundation](issues/02-choose-application-foundation.md) — Use strict TypeScript on Expo/Hermes with CNG, API 29+, and isolated domain, application, adapter, and UI boundaries.
- [Define widget-ready boundaries without building a widget](issues/08-define-widget-ready-boundaries.md) — Preserve a versioned selected-clock snapshot and render-neutral clock-projection contract; defer every native widget artifact and policy.
- [Handle extreme day differences](issues/06-handle-extreme-day-differences.md) — Show the actual signed calendar-date delta, including `−2` and `+2`, and omit the marker for zero.
- [Authorize and inventory the target Pixel](issues/09-authorize-and-inventory-the-pixel-7.md) — ADB is authorized; the target is a Pixel 7a on Android 17/API 37 with a 411×914dp Swedish, 24-hour, Europe/Stockholm configuration.
- [Prototype clock scrubbing and virtual-time feedback](issues/03-prototype-clock-scrubbing.md) — Use responsive action-column rows and inverted, 15-minute, wraparound direct scrubbing with chevron affordances and compact virtual-time feedback.
- [Prototype clock ordering around local time](issues/11-prototype-clock-ordering.md) — Automatically order all rows chronologically, including Local; omit manual/configurable ordering and relative-time labels in v1.
- [Lock the clock interaction contract](issues/04-lock-the-clock-interaction-contract.md) — Freeze one shared comparison instant; section scrubs use a relative offset grid while row scrubs directionally reanchor to that row's quarter-hour wall grid.
- [Define clock collection management](issues/07-define-clock-collection-management.md) — Chronologically sort Local plus up to 24 selected clocks; define stable ties, identity-based duplicates, custom editing, confirmed removal, persistence, and Virtual-time mutation behavior.
- [Define the offline clock catalog](issues/05-define-the-offline-clock-catalog.md) — Bundle every canonical IANA representative region with deterministic offline search, release-only updates, and strictly validated fixed-offset clocks.
- [Lock the acceptance contract](issues/10-lock-the-acceptance-contract.md) — Require deterministic domain/Hermes and UI integration gates plus an exact offline, lifecycle, gesture, accessibility, and persistence pass on the connected Pixel 7a.
- [Synthesize the implementation-ready v1 specification](issues/12-synthesize-the-v1-specification.md) — Consolidate the product, React Native architecture, durable state/error/accessibility contracts, and exact acceptance gates into one buildable specification.
- [Create tracer-bullet implementation tasks](issues/13-create-tracer-bullet-implementation-tasks.md) — Publish 13 green, demoable implementation slices from live Local through the clean Hermes gate and final Pixel 7a acceptance.

## Not yet specified

<!-- No remaining fog or implementation frontier: the v1 destination is reached. Physical TalkBack operation remains owner-deferred indefinitely. -->

## Out of scope

- Widget and lock-screen presentation are a later effort. This version should avoid needless architectural obstacles to them, but will neither specify nor implement a widget.
