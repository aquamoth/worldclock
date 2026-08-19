# Add a lock-screen widget

Type: grilling
Status: open
Assignee:
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

Open.
