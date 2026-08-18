# Ticket 12 Android release gate

Recorded: 2026-08-18

Status: non-device gate passed; Android/Hermes runtime and offline launch checkpoint pending because `adb devices -l` reported no attached device.

## Candidate identity

- Source commit: `de0d14a2e5f7538cbf447ae3b1aee5271ce6b745`
- Artifact: `.scratch/world-clock-v1/release-artifacts/worldclock-v1-1.0.0-release.apk`
- SHA-256: `7a0d668fd7b27a991233ccaacb752938ca76cc32b3f161491a82ca0657ee401d`
- Size: `83,622,035` bytes
- Application ID: `com.mattias.worldclock`
- Version: `versionCode=1`, `versionName=1.0.0`
- Android SDK identity: `minSdk=29`, `targetSdk=36`, `compileSdk=36`
- Signature: APK Signature Scheme v2, one signer

The APK itself is intentionally ignored. Rebuild it from the recorded source commit with the clean gate before installation if the local artifact is unavailable.

## Clean-checkout gate

The passing run cloned the repository without hard links into a new temporary directory and ran:

```sh
git clone --no-hardlinks /home/mattias/Source/repos/worldclock "$gate_checkout"
ANDROID_HOME=/home/mattias/Android/Sdk \
  bash "$gate_checkout/scripts/release/run-clean-android-gate.sh" \
  /home/mattias/Source/repos/worldclock/.scratch/world-clock-v1/release-artifacts
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
npx expo-doctor
npm run release:cng-check
cd android && NODE_ENV=production ./gradlew assembleRelease
apksigner verify --verbose <candidate>
aapt dump badging <candidate>
```

Results:

- Clean dependency install: passed (`793` packages installed from the lockfile).
- Catalog: `312` source regions and `312` deterministic generated entries.
- TypeScript: passed with no errors.
- Jest: `29/29` suites and `235/235` tests passed.
- Expo dependency check: dependencies up to date.
- Expo Doctor: `21/21` checks passed.
- CNG: two clean generations matched SHA-256 `f46678646a47314b4ee5e7b4e2d032310701236c151ffafc1d206d8e540e867e`; zero tracked native files.
- Production Gradle build: passed (`405` tasks; clean run reported `BUILD SUCCESSFUL in 35s`).
- APK signature and manifest identity: passed.
- Static Hermes packaging check: `libhermesvm.so` is present for arm64-v8a, armeabi-v7a, x86, and x86_64; the production bundle is Hermes bytecode.
- Shared host corpus: `19` named projections plus `105` fixed-offset projections (`124` total) passed through the production projection and Intl adapter.

The clean install reported the repository's existing dependency audit result of 19 findings (7 moderate, 12 high). This was informational and did not change the locked dependency graph.

## Pending connected-device proof

Required before ticket 12 can close:

1. Install this exact SHA-256 candidate on the authorized Pixel.
2. Launch with network connectivity disabled and cleared application data.
3. Observe `WORLD_CLOCK_HERMES_CONFORMANCE_PASS` for schema 1 with 19 named, 105 fixed-offset, and 124 total cases from the release process.
4. Confirm the Local clock UI appears without network access and logcat contains no fatal exception, unhandled rejection, or React Native startup error.
5. Restore the device's original connectivity state.

Latest device discovery command/result:

```text
$ /home/mattias/Android/Sdk/platform-tools/adb devices -l
List of devices attached

```
