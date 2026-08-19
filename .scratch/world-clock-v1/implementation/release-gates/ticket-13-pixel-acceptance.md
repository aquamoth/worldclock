# Ticket 13 Pixel 7a acceptance

Recorded: 2026-08-19

Status: in progress; TalkBack first-run onboarding requires a physical activation
gesture before the nonvisual journey can be completed.

## Candidate and device

- Source: `bfe544ab7e6c6cb62de8b1929a35a8cbee79a245`
- APK SHA-256: `7e92c3d3f15eb1bf466888ae816ab5acdb7a4eb28486d2f182aa542080d93d36`
- APK size: `83,622,031` bytes
- Package: `com.mattias.worldclock`, version `1.0.0` (`1`), min/target SDK
  `29/36`, Hermes release runtime
- Device: authorized Google Pixel 7a (`lynx`), serial `34051JEHN12837`,
  Android 17/API 37, 1080×2400 px at density 420 (411×914 dp)
- Baseline: Europe/Stockholm with automatic timezone, `sv-SE`, 24-hour,
  dark appearance, font scale `1.35`, animation scales `1.0`, Wi-Fi on,
  mobile data off, Bitwarden accessibility service enabled, TalkBack disabled.

The clean gate passed catalog `312/312`, TypeScript, Jest `29/29` suites and
`236/236` tests, Expo Doctor `21/21`, reproducible CNG, APK signature/identity,
Hermes packaging, and the production Gradle build. The exact APK above was then
installed with `adb install -r`.

## Acceptance progress

1. **Offline cleared launch — passed before the final gesture-only rebuild; exact
   candidate rerun pending.** Local-only launch, exact empty guidance, offline Add,
   selector/search, and Hermes marker were visible with Wi-Fi and mobile data off.
2. **Catalog/custom collection — passed before the final gesture-only rebuild;
   exact candidate empty/cap rerun pending.** Offline normalized and token-reordered
   search, city/custom additions, unavailable duplicate city, normalized custom
   duplicate validation, stable chronological ordering, offsets/day markers, cap 24,
   edit identity, named confirmation cancel/Back/confirm, and offline persistence were
   exercised. The final candidate separately proved the corrected native selector
   Cancel label.
3. **Virtual mutations — passed on the exact candidate.** A city add, custom rename,
   and confirmed city delete all retained the same frozen `+19:18` comparison and
   pre-existing clock projections.
4. **Gestures — passed on the exact candidate.** Status and three row surfaces proved
   right=earlier, left=later, status offset-grid steps, row wall-quarter reanchors,
   approximate 9dp sensitivity, gesture-start derivation, tap/cancel no-op, active-row
   held order, ten of ten row-origin vertical scrolls with no time change, non-quarter
   wrap, exact `−24:00 → +23:45` and `+24:00 → −23:45`, and exact-zero Live exit.
   This section found and drove the post-slop axis-lock fix in `bfe544a`.
5. **Lifecycle/preferences — passed on the exact candidate.** Live background return
   caught up across a minute. Virtual retained both instants across background and
   foreground. While backgrounded, New York timezone, `en-US`, 12-hour, and light
   changes reprojected the frozen `+19:18` model; restoration reprojected it back.
   Back returned to current Live. Force-stop plus offline cold launch restored the
   committed collection in Live, not transient Virtual state.
6. **Responsive presentation — partially passed on the exact candidate.** Actual
   screenshots and UI trees cover collection top/bottom, selector, custom form,
   confirmation, and Virtual in all four dark/light × font 1.35/2.0 combinations.
   Visual inspection found no cutout collision, action-column overlap, clipped
   essential text, or horizontal page scroll. Reduced-motion was enabled through all
   three zero animation scales and retained static scrub chevrons. Exact-candidate
   empty, cap, and persistence-error surface captures remain pending.
7. **TalkBack — blocked on a physical prerequisite, product journey not yet run.**
   TalkBack 17 opens its first-run/update tutorial and notification-permission prompt.
   ADB can enable the service and move accessibility focus, but injected taps are not
   accepted as TalkBack's activation double-tap. No acceptance result is inferred.
8. **Time/device rules — non-TalkBack portion passed on the exact candidate.** Actual
   UI changed between 24-hour and 12-hour forms. With the phone changed from Stockholm
   to New York, Local became UTC−04:00, the New York IANA city projected UTC−04:00,
   and the custom clock remained fixed at UTC+05:30. The installed Hermes runtime
   emitted one 124-case conformance marker covering named DST/fixed fixtures. Offline
   process-death restoration retained committed clocks.

## Local evidence and restoration

Full UIAutomator trees, screenshots, concise action logs, and logcat are stored in the
ignored local directory `.scratch/world-clock-v1/acceptance-evidence/ticket13/`.
This record intentionally summarizes them without committing device logs or unrelated
device data.

Every temporary network, timezone, locale, 12/24, theme, font, animation,
accessibility-service, touch-exploration, and TalkBack notification-permission change
was restored. The final readback matched the baseline listed above. App collection
data remains the scoped acceptance collection so the TalkBack journey can resume.
