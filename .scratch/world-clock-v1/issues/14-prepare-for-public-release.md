# Prepare for public release

Type: story
Status: open
Assignee:
Blocked by:

## Question

Take the validated v1 app from a privately installed build to a publicly released
Play Store app published by Trustfall AB, with the web presence, store assets,
identity, and release hygiene that a public product requires.

## Shape of the work

**Publisher identity (done in the manifest, must propagate):**

- The Expo manifest and package.json now declare Trustfall AB
  (https://www.trustfall.se) as publisher, and the Android application ID changed
  from `com.mattias.worldclock` to `se.trustfall.worldclock`. The application ID is
  final the moment the app first reaches the Play Store — confirm it before upload.
- The prior release-gate and Pixel-acceptance evidence is bound to the old
  application ID. Re-run `release:clean-gate`, `release:cng-check`, and the on-device
  acceptance pass on the new ID before publishing; uninstall the old package from the
  Pixel 7a as part of that handoff.

**GitHub Pages product presence (designed separately; work here publishes and references it):**

- User-facing product site rooted at `https://aquamoth.github.io/worldclock/`,
  with the development repository presented as a secondary destination.
- A stable privacy-policy page on that site. The app is fully offline and
  collects nothing, but Google Play requires the policy both in Play Console
  and through a direct, discoverable in-app link.
- The site's information architecture, exact policy URL, content, and visual
  direction are decided in
  [Design the GitHub Pages product site](../../world-clock-v1.1/issues/06-design-the-github-pages-product-site.md).
- Once those URLs are settled, keep them in sync with `app.json`
  (`extra.homepage`), `package.json` (`homepage`), the README, and release
  conformance checks.

**Logotype and store assets:**

- Logotype chosen: draft 6 "Small-Seconds Classic" (`.scratch/branding/drafts/`,
  round 2) — a classic dress-watch dial with a second-timezone subdial at 6.
  Sources and rendered layers live in `assets/icon/` and are wired through
  `app.json` as the adaptive icon (foreground, `#E6E0E9` background, Android 13
  monochrome themed-icon layer) plus the legacy/web icon.
- Still open: Play Store 512×512 hi-res icon, feature graphic, phone screenshots,
  and a small-size polish pass on the mark (e.g. replace the subdial's
  `pathLength` tick trick with real geometry, check index weight at 48dp).

**Release hygiene:**

- Permission audit: the generated manifest currently carries Expo defaults
  (`INTERNET`, `SYSTEM_ALERT_WINDOW`, legacy storage permissions) that the offline
  app does not need. Block the unneeded ones for release builds (e.g.
  `expo-build-properties` blocked permissions) without breaking the dev workflow.
- Signing: decide between keeping the existing local keystore and enrolling in Play
  App Signing with a dedicated upload key; document key custody either way.
- Versioning policy: increment `android.versionCode` on every store upload;
  `version` stays semantic.
- Play Console: Trustfall AB developer account, data-safety form (no data
  collected, no network use), content rating, and Swedish + English store listings.

## Resolution

Open.
