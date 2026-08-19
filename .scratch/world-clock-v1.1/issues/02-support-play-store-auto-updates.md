# Support Play Store auto-updates

Type: story
Status: open
Assignee:
Blocked by: [Prepare for public release](../../world-clock-v1/issues/14-prepare-for-public-release.md)

## Question

Once World Clock is published on the Play Store, what must the app and its
release process do so an installed build can receive later versions without
sideloading, while remaining an offline app with no telemetry?

## Shape of the work

- The Play Store is the update channel. Do not add Expo OTA/`expo-updates`:
  that would introduce a runtime network dependency the v1 offline contract
  forbids.
- Confirm that signing, `se.trustfall.worldclock`, and `android.versionCode`
  from issue 14 are sufficient for Play to deliver updates to existing installs.
  Increment `versionCode` on every store upload; keep `version` semantic.
- Decide whether silent Play auto-update is enough, or whether the app should
  also use Play In-App Updates to prompt when a newer version is available.
  An in-app prompt is a user-initiated Play check, not background sync, but it
  still needs an owner decision because it is the first on-device Play
  dependency.
- Document the update path in the public-release hygiene so a later 1.1 Play
  upload actually replaces 1.0 on devices that have auto-update enabled.

## Resolution

Open.
