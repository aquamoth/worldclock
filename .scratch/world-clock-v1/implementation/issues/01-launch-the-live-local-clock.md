# 01 — Launch the live local clock

Parent: [Create tracer-bullet implementation tasks](../../issues/13-create-tracer-bullet-implementation-tasks.md)

Specification: [World Clock v1 implementation specification](../../spec.md)

Index: [World Clock v1 implementation tickets](../index.md)

**What to build:** A cleanly scaffolded strict-TypeScript Expo/Hermes Android app that launches into a native React Native screen showing the mandatory Local clock at the current instant, its effective UTC offset, the empty-collection guidance, and no seconds. It follows the system timezone and 12/24-hour preference and refreshes at minute boundaries. This is the minimum scaffold and first end-to-end product slice, not a standalone setup ticket.

**Blocked by:** None — can start immediately.

**Status:** complete

**Delivery workflow:** Work directly on `master`; do not create a branch or pull request. Finish green and demoable. Do not implement later-ticket behavior.

## Scoped seams

Expo CNG/app configuration and reproducible build commands; domain clock definition/projection boundary sufficient for Local; application time/device-preference ports and Live screen model; Hermes `Intl` and Expo localization adapters; native React Native clock screen; base external-behavior test harness. Do not introduce persistence, catalog, Virtual time, Redux, WebView, or speculative native modules.

## Acceptance criteria

- [x] A clean checkout can install dependencies, typecheck, test, and build the scaffold with pinned versions and Hermes.
- [x] Android minimum support is API 29 and native generation is reproducible through Expo CNG rather than hand-maintained generated output.
- [x] Cold launch renders one mandatory, nondeletable Local clock, its current effective offset, `Add a timezone to compare times around the world.`, and no selected clocks.
- [x] Local follows the phone timezone and the collection samples one instant per minute tick.
- [x] The display follows system 12/24-hour preference, includes AM/PM only in 12-hour mode, and never shows seconds.
- [x] Local exposes no edit or delete action and the screen is native React Native, not a WebView.
- [x] All tests introduced by this ticket pass and the result is demoable without network access.

## Automated acceptance subset

Injected-clock tests cover one shared sampled instant, minute refresh, timezone/preference re-projection, `00:05`/`12:05`/`13:05` 12/24 formatting, AM/PM rules, no seconds, correct Local offset, empty guidance, and no delete action. Include basic semantic and 48dp target checks at 411×914dp plus clean typecheck/test/build commands.

## Later Pixel 7a checkpoint

Cold-launch the development build and confirm Stockholm Local, 24-hour rendering, current effective offset, empty state, and cutout-safe 411×914dp layout. This checkpoint may be performed in ticket 13 rather than blocking this slice.

## Resolution

Implemented the first native end-to-end slice on pinned Expo SDK 57, React Native 0.86, strict TypeScript, and Hermes. The application boundary samples one instant, projects mandatory Local through an injected offline timezone-rules port, follows Expo-provided timezone and 12/24-hour preferences, refreshes at minute boundaries and foreground activation, and renders only Local plus the required empty guidance.

The TDD suite covers the application boundary, pure time/offset formatting, Stockholm `Intl` winter/summer projection, native semantics, absence of edit/delete controls, and the 411×914dp responsive baseline. `npm ci`, all 14 tests, strict typechecking, Expo dependency validation, all 21 Expo Doctor checks, clean Expo CNG regeneration, and Gradle `assembleDebug` passed. Generated configuration recorded `hermesEnabled=true` and `android.minSdkVersion=29`; generated `android/` remains ignored. The optional Pixel cold-launch checkpoint remains deferred to ticket 13 as allowed above.
