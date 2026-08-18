# Expo and offline timezone feasibility

Researched 2026-08-18 from primary specifications and first-party platform documentation.

## Conclusion

React Native with Expo is a viable and low-risk foundation for the Android v1. The app can perform offline IANA-zone conversion with DST-aware platform data, bundle its own searchable city/country catalog, handle horizontal scrubbing on the native UI thread, persist a small clock collection locally, and follow Android's 12/24-hour preference without writing Kotlin for v1.

The important architectural constraint is that the operating system owns timezone **rules**, while the app must own its user-facing **catalog** and persisted clock-selection model. A later Android widget is feasible from an Expo project, but it is a native Android component rather than a React Native view; v1 should keep timezone calculation and stored clock records independent of React components and define a native-readable persistence/export seam.

## Capability matrix

| Concern | React Native / Expo option | Native Android option | Finding and limitation |
| --- | --- | --- | --- |
| Offline IANA conversion and DST | Hermes `Intl.DateTimeFormat` with a named `timeZone`; compute all rows from one instant | `java.time.ZoneId`, `ZonedDateTime`, and `DateTimeFormatter` | Both are viable offline. ECMA-402 requires time-zone-aware implementations to use IANA TZDB identifiers and data. Hermes implements `Intl` using OS ICU, while Android ships tzdata/ICU data. Correctness is therefore bounded by the target device's installed timezone-data version. Do not store a city's current numeric offset as its rule. |
| Fixed offsets | Normalize the specified offset in app domain code and add it to the shared instant | `ZoneOffset` / offset-based `ZoneId` | Straightforward and independent of DST. Persist integer offset minutes, not a synthetic IANA ID. The required −12:00…+14:00 range at 15-minute increments is representable. |
| City/country catalog | Bundle versioned JSON or a SQLite asset in the binary | Bundle a raw resource or database | Expo supports static assets, including SQLite databases. IANA `zone1970.tab` provides country codes, representative coordinates, zone IDs, and limited disambiguating comments; `iso3166.tab` maps codes to English country/territory labels. This is a timezone-selection seed, not a comprehensive city gazetteer. The product must curate and version the exact searchable city list rather than treating the runtime's available zone IDs as UX data. |
| Gestures | `react-native-gesture-handler`; optionally Reanimated for visual updates | Android gesture APIs | Expo currently includes Gesture Handler and documents it as native-thread gesture recognition. It is suitable for deterministic horizontal scrubbing; keep the derived virtual instant in domain state and throttle/quantize display work if device profiling shows churn. |
| Persistence | Async Storage for a small non-secret ordered collection; SQLite if catalog/query needs justify it | SharedPreferences, DataStore, Room, or SQLite | Expo describes Async Storage as persistent, unencrypted key-value storage suited to small app state, and SQLite as persistent across restarts. Selected clocks/order fit Async Storage. Catalog size/search characteristics can independently drive JSON versus SQLite. |
| System 12/24-hour choice | `expo-localization` `useCalendars()` or `getCalendars()` exposes `uses24hourClock`; the hook updates when OS settings change | `DateFormat.is24HourFormat(context)` / `getTimeFormat(context)` | Fully supported. On Android, Expo says locale/calendar preferences can change without an app restart; a hook rerenders, or imperative callers should refresh on foreground. Use explicit `hour12` formatting based on this preference so 12-hour output includes `AM`/`PM`. |
| Later Android widget | Add Kotlin/native resources through a local Expo module and config plugin, using a development build / prebuild | `AppWidgetProvider` + `RemoteViews`, or Jetpack Glance | Feasible, but not inside Expo Go and not by rendering the React tree. Expo supports Kotlin local modules and config plugins that modify generated native projects. Android widgets run as `RemoteViews`; Glance produces `RemoteViews` and has its own restricted composables. |

## Timezone correctness model

Use an epoch-millisecond instant as the single source of truth. For "now," sample the instant once per tick and format that same value for every selected zone. For scrubbing, derive one virtual instant by adding the scrub delta, then format it for every zone. This avoids constructing ambiguous local wall times at DST transitions.

For each IANA clock, create or cache formatters keyed by zone and 12/24-hour mode, and derive:

- local hour/minute from the requested IANA `timeZone`;
- local calendar date from that same instant and zone, for the signed day delta;
- effective numeric offset at that instant, rather than a stored or current-only offset.

`Intl.DateTimeFormat` is the preferred v1 boundary because ECMA-402 requires a time-zone-aware implementation to use IANA TZDB data, and React Native's Hermes has native `Intl` support. The native equivalent is `ZoneId`: Android documents that its default regional IDs come from IANA TZDB and that `DateTimeFormatter` can convert an instant using the requested zone before formatting.

There are two operational caveats:

1. Android's installed tzdata is offline and updateable, but a device that has not received a recent timezone module/system update can be stale after a government changes a rule. Android 10+ uses an APEX Time Zone Data module; all stock devices also ship a base copy in `/system`.
2. React Native documentation warns that JavaScript runtimes can differ. Automated DST fixtures must run under the same Hermes/Android runtime used by the release, and the Pixel 7 acceptance pass should include zones on both sides of upcoming or recent transitions. A Node-only test is useful for domain logic but is not sufficient evidence for device ICU behavior.

No network service is required for conversion. An app-bundled timezone library would provide a pinned, app-controlled tzdb version, but it adds bundle/update ownership and is unnecessary for v1 unless device tests uncover missing/incorrect required zones or the product requires rule updates independent of Android updates.

## Catalog implications

The timezone catalog should be a separate, versioned asset whose records have stable app IDs and fields such as display city, country code/name, IANA zone ID, and normalized search aliases. IANA's `zone1970.tab` deliberately has one row for areas whose civil timestamps have agreed since 1970; when an area spans countries it uses a principal, often most-populous, city. Its scope therefore does not answer which "common cities" the product wants to expose.

Viable catalog sources/options are:

- Generate a minimal representative-zone catalog from the public-domain IANA `zone1970.tab` plus `iso3166.tab`, then curate display names and aliases in-repo.
- Bundle a separately licensed city gazetteer mapped to IANA zones if product coverage requires many cities. That is a product/data choice for “Define the offline clock catalog,” not a runtime blocker.

At build time, validate every catalog zone ID against the supported formatter/runtime and reject duplicate app IDs. At runtime, exact duplicate prevention should use canonical catalog identity (or normalized IANA zone plus catalog city identity according to the product decision), not the current UTC offset, because different zones can temporarily share an offset and later diverge.

## Gesture and persistence implications

`react-native-gesture-handler` is supported by current Expo and executes recognition on the native thread. It can own the pan gesture while shared virtual-time state drives all rows. The implementation should still provide an accessibility action or non-gesture control because a pan-only contract is not screen-reader complete; the exact interaction belongs to the prototype ticket.

Async Storage is adequate for the expected ordered list of selected clocks because it is persistent, local, unencrypted, and intended for small preferences/app state. Persist a schema version and discriminated records:

- IANA clock: stable selection ID, display name, country metadata, IANA zone ID;
- fixed-offset clock: stable selection ID, required custom name, integer offset minutes.

Do not persist derived time, current offset, day delta, or 12/24-hour choice. Recompute those from the instant and live device preference. If a future widget cannot safely consume the chosen JavaScript store directly, expose an explicit native-readable snapshot rather than coupling widget code to React component or Async Storage internals.

## Widget path

Android explicitly treats clocks as information-widget use cases. A later implementation can use a traditional `AppWidgetProvider`/`RemoteViews` layout or Kotlin Jetpack Glance. Expo does not prevent this: development builds allow custom native code, local Expo modules place Kotlin in the project, and config plugins can add manifest entries and native resources during prebuild.

Traditional `RemoteViews` has a useful clock-specific path: `TextClock` is an allowed widget view, accepts a timezone ID, honors the system 12/24-hour setting, and supports separate 12- and 24-hour patterns. This can keep displayed wall time current without waking JavaScript every minute. Glance is also viable, but Android states that it is restricted by AppWidget/RemoteViews limitations and is not interoperable with ordinary Compose UI.

Widget constraints should shape seams, not v1 UI:

- Widgets only support touch and vertical swipe; the app's horizontal scrubbing interaction will not carry over.
- `updatePeriodMillis` is not delivered more often than every 30 minutes, and Android advises against waking the app every minute. Prefer system `TextClock` for continuously changing clock text where its layout is sufficient, plus event-driven refreshes for selection/configuration changes.
- The widget lives in a host process and needs durable state; in-memory JavaScript state is not a sharing strategy.
- Native manifest/resources and code must be reproducibly added through the Expo CNG/config-plugin workflow, or the project must intentionally own generated native projects.

These constraints support keeping the v1 foundation in Expo while establishing pure clock-record/time-calculation interfaces and an owned persistence boundary. They do not justify building the widget in v1.

## Recommendation for the foundation decision

Proceed with React Native + Expo + Hermes for v1, using:

- platform-backed `Intl.DateTimeFormat` for IANA/DST conversion;
- app-domain integer arithmetic for fixed offsets;
- `expo-localization` for live 12/24-hour preference;
- `react-native-gesture-handler` for scrubbing;
- Async Storage for the small ordered selection, with the catalog bundled separately as JSON initially unless measured search/catalog size favors SQLite;
- a pure TypeScript clock domain that accepts an instant and clock definition and returns display fields, without importing React;
- a persistence adapter whose schema can later be mirrored/read by native Android widget code.

Gate this choice with a short on-device feasibility test in implementation: verify representative IANA IDs, winter/summer offsets, DST gaps/overlaps, signed date deltas, `uses24hourClock` setting changes, and scrub performance on the Pixel 7. Escalate to a native `java.time` Expo module only if Hermes/device tests fail required cases; current platform evidence does not require that complexity up front.

## Primary sources

- [ECMA-402: Use of the IANA Time Zone Database](https://tc39.es/ecma402/#sec-time-zone-identifiers)
- [React Native: JavaScript Environment](https://reactnative.dev/docs/javascript-environment)
- [React Native: Hermes as the Default](https://reactnative.dev/blog/2022/07/08/hermes-as-the-default)
- [Android `ZoneId`](https://developer.android.com/reference/java/time/ZoneId)
- [Android `DateTimeFormatter`](https://developer.android.com/reference/java/time/format/DateTimeFormatter)
- [Android Open Source Project: Time zone rules](https://source.android.com/docs/core/permissions/timezone-rules)
- [IANA tzdb `zone1970.tab`](https://github.com/eggert/tz/blob/main/zone1970.tab)
- [IANA tzdb `iso3166.tab`](https://github.com/eggert/tz/blob/main/iso3166.tab)
- [Expo: Assets](https://docs.expo.dev/develop/user-interface/assets/)
- [Expo: Localization API](https://docs.expo.dev/versions/latest/sdk/localization/)
- [Expo: react-native-gesture-handler](https://docs.expo.dev/versions/latest/sdk/gesture-handler/)
- [Expo: Store data](https://docs.expo.dev/develop/user-interface/store-data/)
- [Expo: Add custom native code](https://docs.expo.dev/workflow/customizing/)
- [Expo: Config plugins](https://docs.expo.dev/config-plugins/introduction/)
- [Android `DateFormat.is24HourFormat`](https://developer.android.com/reference/android/text/format/DateFormat#is24HourFormat(android.content.Context))
- [Android app widgets overview](https://developer.android.com/develop/ui/views/appwidgets/overview)
- [Android advanced widget updates](https://developer.android.com/develop/ui/views/appwidgets/advanced)
- [Android `RemoteViews`](https://developer.android.com/reference/android/widget/RemoteViews)
- [Android `TextClock`](https://developer.android.com/reference/android/widget/TextClock)
- [Android Jetpack Glance](https://developer.android.com/develop/ui/compose/glance)
