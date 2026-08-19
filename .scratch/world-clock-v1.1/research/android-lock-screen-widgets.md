# Android lock-screen widgets — platform facts (August 2026)

Captured while resolving
[Add a lock-screen widget](../issues/04-add-a-lock-screen-widget.md).

## Availability and eligibility

- Keyguard widgets existed in Android 4.2 (API 17, `widgetCategory="keyguard"`)
  and were removed in Android 5.0.
- The modern return: Pixel Tablet first (Android 15 QPR1 era), then phones in
  **Android 16 QPR2** — beta fall 2025, stable rollout December 2025 on Pixel
  6+ and Pixel Tablet. AOSP carries the feature, so other OEMs can adopt it;
  rollout beyond Pixel is OEM-dependent as of August 2026.
- Eligibility is **opt-out, not opt-in**: every ordinary app widget can be
  placed on the lock screen with no extra declaration. Opting out means
  declaring widget category `not_keyguard` in the appwidget-info XML in an
  `xml-36` resource folder.
- Lock-screen grid is roughly 2×3 cells, up to ~3 widgets per page, multiple
  pages, entered by swiping from the right edge (Settings → Display & touch →
  "Widgets on lock screen").
- Sources: Android Developers Blog "Widgets on lock screen: FAQ" (March 2025,
  https://android-developers.googleblog.com/2025/03/widgets-on-lock-screen-faq.html),
  Android 16 QPR2 release blog, Android Authority coverage.

## Ticking time without app wakeups

- `updatePeriodMillis` floor is 30 minutes (0 disables periodic updates);
  updates are inexact under Doze/App Standby.
- `android.widget.TextClock` (API 17) is a `@RemoteView` that ticks **inside
  the host process** (launcher/SystemUI): zero app wakeups. `setTimeZone` is a
  `@RemotableViewMethod`, so per-column IANA IDs are set with
  `remoteViews.setString(id, "setTimeZone", tz)`. It honors the system
  12/24-hour setting automatically and self-updates on
  TIME_TICK/TIME_CHANGED/TIMEZONE_CHANGED.
- Fixed-offset custom timezones work via `"GMT+06:30"`-style IDs.
- A second `TextClock` with a locale-aware `EEEE` format pattern renders the
  weekday name in that clock's zone and flips itself at that zone's midnight —
  no alarms or app code needed for date-boundary changes.
- `AnalogClock` remains a supported RemoteViews view (API 31 added remotable
  `setTimeZone` and dial/hand customization) if an analog widget face is ever
  wanted.

## Framework and Expo integration

- **Jetpack Glance is unsuitable for clocks**: stable 1.1.1 (1.2.0 at RC as of
  Aug 2026) has no TextClock/ticking composable — every minute change would
  need a scheduled re-render.
- **Expo `expo-widgets` is iOS-only** with no Android roadmap.
- **`react-native-android-widget`** renders React primitives to a static image:
  no TextClock, no ticking, no lock-screen tuning in its config plugin.
- Conclusion: a hand-written Kotlin `AppWidgetProvider` + RemoteViews XML with
  `TextClock`, wired in via a local Expo config plugin, is the right seam for a
  CNG (prebuild) app.

## Data sharing and refresh

- The widget provider runs in the same APK/UID as the app and can directly
  read SharedPreferences/DataStore/files written by the React Native side —
  the canonical mirror pattern.
- Refresh triggers: `AppWidgetManager.updateAppWidget` pushed from app code on
  data changes; system `ACTION_APPWIDGET_UPDATE` on placement, period, and
  boot; manifest receivers for `ACTION_TIMEZONE_CHANGED`, `ACTION_TIME_CHANGED`
  and `ACTION_LOCALE_CHANGED` for re-deriving non-ticking content.
  `ACTION_TIME_TICK` is context-registered-only and unusable from a manifest.

## Interactivity and gestures

- **Widgets receive no touch stream.** The only input reaching app code is a
  tap on a view via `PendingIntent`; vertical swiping is host-side list
  scrolling whose position is never reported. Neither horizontal nor vertical
  *scrub* gestures are implementable — tappable step buttons are the closest
  equivalent.
- On the lock screen, Google's developer FAQ gates only **activity launches**
  behind authentication (unless `android:showWhenLocked="true"`). Broadcast/
  service PendingIntents — the smart-home-toggle/timer-start pattern — are not
  documented as requiring unlock. One consumer article (How-To Geek) claims
  any tap prompts for unlock; the developer-facing wording contradicts this.
  **Verify in-widget button taps on a QPR2 device** before building
  widget-side stepping.
- No lock-screen-specific throttling of RemoteViews updates is documented, and
  there is no redaction/sensitive-content API for lock-screen widgets: content
  is fully visible without unlock (opt-out is the only control). QPR2 added an
  `AppWidgetEvent` engagement API (clicks, scrolls, impressions).
