# World Clock v1.1: Public product increment

Label: wayfinder:map

## Destination

Specify and implement the next product increment on top of the validated v1
Android app: a user-facing GitHub Pages product site and required in-app privacy
policy entry, Play Store updates, an analog clock-face theme, a lock-screen
widget, and a low-priority investigation of a live launcher icon. Finish the
still-open public-release work that v1 left on the map.

Status: specified-as-open. v1 is closed as a privately validated app; v1.1 is
the development line from this point.

## Notes

- Use the `grilling` and `domain-modeling` skills for product decisions,
  `prototype` for interaction questions, and `research` for external facts.
- Work on a named topic branch. Merge to `master` with `git merge --no-ff`.
  Do not commit feature work directly on `master`. Do not squash. GitHub pull
  requests use "Create a merge commit."
- Keep the v1 selected-clock snapshot and clock-projection contracts intact;
  new surfaces (widget, analog faces, launcher icon) consume those contracts
  rather than inventing a parallel time model.
- Play Store publication remains [Prepare for public release](../world-clock-v1/issues/14-prepare-for-public-release.md).
  Auto-update work is blocked on that ticket.
- The analog theme is a presentation choice, distinct from the existing
  grouped/airy/tiles layout designs.
- Physical TalkBack operation remains owner-deferred indefinitely.

## Decisions so far

- [Auto-revert virtual time when the app is left](issues/08-auto-revert-virtual-time.md) — A virtual-time session ends after more than 60 s in the background (screen lock included); brief app switches keep it; no foreground idle timeout. Implemented on `wayfinder/auto-revert-virtual-time`.
- [Add a lock-screen widget](issues/04-add-a-lock-screen-widget.md) — One resizable RemoteViews/`TextClock` widget (via a local Expo config plugin) for home and lock screen, showing selected clocks only as name/time/day-name columns in collection order; tap opens the app; the app mirrors the versioned snapshot to SharedPreferences and Kotlin `java.time` derives ordering against the shared fixtures. Platform facts in [Android lock-screen widgets](research/android-lock-screen-widgets.md).
- [Design the GitHub Pages product site](issues/06-design-the-github-pages-product-site.md) — Canonical URL `https://aquamoth.github.io/worldclock/` with the policy at `privacy/`; two static dark-glass-styled pages implemented in `docs/`, an in-app Privacy policy link in Settings, homepage references retargeted, and the root `App.tsx`/`conformance/` leftovers folded into `src/`. Pages enablement and the scrub-demo capture remain owner steps.
- [Add an analog clock-face theme](issues/05-add-an-analog-clock-face-theme.md) — App-wide analog/digital clock face, independent of layout design; reduced hour/minute dial with a compact digital caption and digital TalkBack labels.
- [Add an About dialog](issues/01-add-an-about-dialog.md) — Skip the About UI; use a user-facing GitHub Pages site for product identity and expose the required privacy policy directly in-app.

v1.1 inherits the closed v1 decisions in
[World Clock v1](../world-clock-v1/map.md).

## Not yet specified

- [Support Play Store auto-updates](issues/02-support-play-store-auto-updates.md) — Let installed builds update once the app is on the Play Store. Blocked by v1 issue 14.
- [Prototype country-flag row backgrounds](issues/07-prototype-country-flag-row-backgrounds.md) — Can public-domain CIA World Factbook flags sit at ~2% opacity behind each clock row without hurting readability?
- [Research a live launcher icon](issues/03-research-a-live-launcher-icon.md) — Low priority. Can the dress-watch mark move its hands while the app is not running?
- Widget-side time stepping — earlier/later step buttons driving a widget-local, auto-expiring virtual session with the local clock shown as a reference column while active. Deferred from the widget ticket ("tap to open the app for now"); needs on-device verification that lock-screen button taps fire without unlock (see [research](research/android-lock-screen-widgets.md)).
- Scrollable-list widget variant — a `RemoteViewsService` collection so large clock collections are reachable by vertical swipe instead of being cut.
- Analog clock faces on the widget — `AnalogClock` remains remotable (API 31+ timezone support) if the app's analog face should ever extend to the widget.


Inherited from v1:

- [Prepare for public release](../world-clock-v1/issues/14-prepare-for-public-release.md) — Publish v1 on the Play Store as Trustfall AB.

## Out of scope

- Changing the v1 interaction contract (shared instant, virtual-time grids, chronological ordering, offline catalog).
- iOS, web, or a widget-first rewrite of the app.
