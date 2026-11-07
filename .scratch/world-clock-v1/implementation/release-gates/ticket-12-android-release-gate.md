# Ticket 12 Android release gate

Recorded: 2026-08-19

Status: passed, including the connected Android/Hermes and offline launch checkpoint.

## Candidate identity

- Source commit: `72d0d0ddd25c118407397f499db1a2d40e6d9109`
- Artifact: `.scratch/world-clock-v1/release-artifacts/worldclock-v1-1.0.0-release.apk`
- SHA-256: `af1bf17233594999dc19427be111dce2d8c8da60ccb317af4df432631791a8ce`
- Size: `83,622,035` bytes
- Application ID: `com.mattias.worldclock`
- Version: `versionCode=1`, `versionName=1.0.0`
- Android SDK identity: `minSdk=29`, `targetSdk=36`, `compileSdk=36`
- Signature: APK Signature Scheme v2, one signer

The APK itself is intentionally ignored. Rebuild it from the recorded source commit with the clean gate before installation if the local artifact is unavailable.

## Clean-checkout gate

The passing run cloned the repository without hard links into a new temporary directory and ran:

```sh
repo="$(git rev-parse --show-toplevel)"
git clone --no-hardlinks "$repo" "$gate_checkout"
ANDROID_HOME="${ANDROID_HOME:-$HOME/Android/Sdk}" \
  bash "$gate_checkout/scripts/release/run-clean-android-gate.sh" \
  "$repo/.scratch/world-clock-v1/release-artifacts"
```

`run-clean-android-gate.sh` executed these gates in order:

```sh
npm ci
npm run catalog:generate
git diff --exit-code -- catalog
npm run catalog:check
npm run typecheck
npm test -- --runInBand
npx expo install --check
./node_modules/.bin/expo-doctor
npm run release:cng-check
cd android && NODE_ENV=production ./gradlew assembleRelease
apksigner verify --verbose <candidate>
aapt dump badging <candidate>
```

Results:

- Clean dependency install: passed (`794` packages installed from the lockfile, including exact `expo-doctor@1.20.2`).
- Catalog: `312` source regions and `312` deterministic generated entries.
- TypeScript: passed with no errors.
- Jest: `29/29` suites and `235/235` tests passed.
- Expo dependency check: dependencies up to date.
- Expo Doctor: `21/21` checks passed.
- CNG: two clean generations matched SHA-256 `f46678646a47314b4ee5e7b4e2d032310701236c151ffafc1d206d8e540e867e`; zero tracked native files.
- Production Gradle build: passed (`405` tasks; clean run reported `BUILD SUCCESSFUL in 39s`).
- APK signature and manifest identity: passed.
- Static Hermes packaging check: `libhermesvm.so` is present for arm64-v8a, armeabi-v7a, x86, and x86_64; the production bundle is Hermes bytecode.
- Shared host corpus: `19` named projections plus `105` fixed-offset projections (`124` total) passed through the production projection and Intl adapter.

The clean install reported the repository's existing dependency audit result of 19 findings (7 moderate, 12 high). This was informational and did not change the locked dependency graph.

## Connected Android/Hermes checkpoint

- Serial: `34051JEHN12837` (authorized over USB)
- Device: Google Pixel 7a, product/device `lynx`
- OS: Android 17, API 37
- Installed candidate SHA-256: `af1bf17233594999dc19427be111dce2d8c8da60ccb317af4df432631791a8ce`
- Installed package: `com.mattias.worldclock`, `versionCode=1`, `versionName=1.0.0`, `minSdk=29`, `targetSdk=36`
- Original connectivity: Wi-Fi on; mobile data off
- Offline launch connectivity: Wi-Fi off (`cmd wifi status` reported disabled); mobile data off
- Launch setup: application data cleared, logcat cleared, application force-stopped, launcher activity started
- Hermes evidence: one release-process marker, `WORLD_CLOCK_HERMES_CONFORMANCE_PASS {"schemaVersion":1,"projectionCases":19,"fixedOffsetCases":105,"totalCases":124}`
- Visible offline UI: `World Clock`, `Local`, `Add a timezone to compare times around the world.`, and `+ Add timezone`
- Activity evidence: `com.mattias.worldclock/.MainActivity` was the resumed activity after the smoke interval
- Error scan: zero fatal-exception, application-process crash, unhandled promise/rejection, or React Native JavaScript error signatures in the cleared launch log
- Restoration: cleanup restored Wi-Fi to on and mobile data to off; a subsequent read reported Wi-Fi enabled and connected, with mobile data still off

This checkpoint intentionally covers only exact-candidate installation, Android/Hermes corpus execution, and cleared-data offline launch smoke. Ticket 13 owns the full interactive, responsive, accessibility, lifecycle, mutation, and persistence acceptance pass.

## Ticket 13 superseding candidate

Pixel acceptance exposed an Android gesture-start defect: a real pan begins with zero
translation, while the UI chose and locked an axis at that zero-valued start event.
The fix waits for post-slop travel before choosing the dominant axis and is covered by
a native-handler regression test. Selector cancellation also gained an explicit native
accessibility label, and the clean gate was made independent of host Watchman state.

- Source commit: `bfe544ab7e6c6cb62de8b1929a35a8cbee79a245`
- Artifact: `.scratch/world-clock-v1/release-artifacts/worldclock-v1-1.0.0-release.apk`
- SHA-256: `7e92c3d3f15eb1bf466888ae816ab5acdb7a4eb28486d2f182aa542080d93d36`
- Size: `83,622,031` bytes
- Automated results: catalog `312/312`; TypeScript passed; Jest `29/29`
  suites and `236/236` tests; Expo Doctor `21/21`; CNG SHA-256
  `f46678646a47314b4ee5e7b4e2d032310701236c151ffafc1d206d8e540e867e`
  with zero tracked native files; signed production build passed in `38s`.
- Connected checkpoint: installed with `adb install -r` on serial
  `34051JEHN12837`; release-process logcat emitted exactly one
  `WORLD_CLOCK_HERMES_CONFORMANCE_PASS` marker for all `124` cases during
  the later offline process-death launch; no application crash or unhandled
  rejection signature was found.

This candidate supersedes the earlier artifact identity above for final v1
acceptance. The earlier record remains as the original ticket-12 checkpoint audit
trail.
