# Add a lock-screen widget

Type: grilling
Status: closed
Assignee: Mattias Åslund
Blocked by:

## Question

What lock-screen widget should World Clock offer, and which native seams must
it use, so a user can read the local clock and selected clocks on the lock
screen without pulling widget design into the React UI or breaking the v1
snapshot and projection contracts?

## Shape of the work

- v1 already reserved the path:
  [Define widget-ready boundaries without building a widget](../../world-clock-v1/issues/08-define-widget-ready-boundaries.md).
  Consume the versioned selected-clock snapshot and the render-neutral clock
  projection. Do not make the widget read Async Storage, React state, or
  formatted UI strings.
- The destination is a widget the user can add to the lock screen. Decide
  whether the same provider also offers a home-screen widget (likely, because
  Android widget providers usually serve both) or lock-screen only.
- Native implementation: Expo CNG remains the extension point. Choosing Glance
  versus `RemoteViews`/`AppWidgetProvider`, lock-screen availability by API
  level, and how often the widget may refresh belongs in this ticket. v1
  research already noted that periodic widget updates cannot be scheduled more
  often than 30 minutes, so a minute-accurate face needs a platform-supported
  clock text or an equivalent native ticker — not a JavaScript wakeup.
- Product questions to freeze before implementation: which clocks appear
  (local only, local plus a subset, the full collection), whether virtual time
  is in or out of scope for the widget, 12/24-hour and light/dark, and what
  happens when the collection is empty.
- Out of scope until this ticket says otherwise: a lock-screen *activity*,
  complications on Wear OS, and changing collection management in the app to
  suit the widget.

## Resolution

Build one resizable Android app widget, placeable on the home screen and the
lock screen alike. Platform facts are captured in
[Android lock-screen widgets](../research/android-lock-screen-widgets.md);
the decisive ones: lock-screen eligibility is automatic on Android 16 QPR2+
(no declaration needed; older devices simply get a home-screen widget, minSdk
29 unchanged), and `TextClock` ticks time *and* localized day names inside the
host process with zero app wakeups.

### Product

- The widget shows **selected clocks only** — never the local clock, which
  both surfaces already display in their own chrome.
- Layout mirrors the built-in launcher world-clock widget it replaces: columns
  of small clock name, large ticking time, localized day name below,
  transparent background with system-themed text. The day name is the widget's
  stand-in for the app's ±N day-difference marker (same information, native
  idiom).
- As many columns as the user-chosen widget size fits, in chronological
  collection order; overflow is cut silently. Battery comes first: no alarms,
  no schedulers, staleness is acceptable wherever `TextClock` doesn't already
  keep content live by itself.
- Empty collection shows a call-to-action ("No clocks yet — tap to add"), not
  a lone local clock.
- Tapping anywhere opens the app. No other interaction in this increment —
  widget-side time stepping is deferred (see map fog).
- 12/24-hour, language, and light/dark all follow the system, which is also
  what the app resolves to today.
- Virtual time never appears on the widget in this increment; the widget is
  always live mode.

### Native seams

- Classic Kotlin `AppWidgetProvider` + RemoteViews XML — not Glance and not
  `react-native-android-widget`, neither of which can tick — wired in via a
  local Expo config plugin so Expo CNG remains the reproducible extension
  point.
- Time and day name are `TextClock` views (day name via a locale-aware `EEEE`
  pattern) with per-column `setTimeZone`; custom timezones use
  `"GMT±HH:MM"` IDs. Both tick and roll dates in the host process.
- The app writes a **snapshot mirror** — a native-readable copy (default
  SharedPreferences) of the current-version selected-clock snapshot, source
  data only — on every snapshot save, then pushes
  `AppWidgetManager.updateAppWidget`. Manifest receivers for
  timezone/locale/time changes cover re-derivation while the app is closed.
- The widget derives chronological ordering natively with `java.time`,
  validated against the existing conformance fixtures
  (`src/conformance/timezone-projection-fixtures.json`). The v1 snapshot and
  projection contracts stay intact; the widget never reads Async Storage,
  React state, or formatted UI strings.

### Consequences elsewhere on the map

- New ticket: [Auto-revert virtual time when the app is left](08-auto-revert-virtual-time.md)
  — app behavior surfaced by this discussion, independent of the widget.
- New fog: widget-side time stepping (earlier/later step buttons, widget-local
  auto-expiring session with the local clock shown as reference while active;
  lock-screen button taps need on-device verification) and a scrollable-list
  widget variant for large collections.
