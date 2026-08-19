# Auto-revert virtual time when the app is left

Type: task
Status: closed
Assignee: Mattias Åslund
Blocked by:

## Question

Implement the auto-revert rule decided while resolving
[Add a lock-screen widget](04-add-a-lock-screen-widget.md): a virtual-time
session (either anchoring) ends automatically when the app has been in the
background — including screen lock — for more than about 60 seconds, snapping
back to live mode. Brief app switches within that grace period keep the
session. There is **no** foreground idle timeout: a user actively looking at a
comparison keeps it indefinitely.

This is an app behavior change, independent of the widget. It touches the
virtual-time session lifecycle only; the shared-instant, anchoring, and scrub
semantics of the v1 interaction contract are unchanged.

## Resolution

Implemented on branch `wayfinder/auto-revert-virtual-time`.

- `src/application/liveClock.ts`: `enterBackground()` records when the app
  left the foreground; `enterForeground()` ends any virtual session when the
  stay exceeded `VIRTUAL_TIME_BACKGROUND_GRACE_MS` (60 000 ms), clearing
  gesture state like `backToLive` and announcing "Live time.". The timestamp
  is cleared on every foreground so a stale value can never end a later
  session. Screen lock is covered because the `observeAppLifecycle` adapter
  maps every non-active `AppState` to `enterBackground`.
- `src/application/lifecycleVirtualTime.test.ts`: new tests for revert after
  more than the grace, survival at exactly the grace, and stale-timestamp
  safety; the preference-reprojection test now backgrounds for 45 seconds
  instead of 4.5 hours.
- App death ends the session inherently (React state). No foreground idle
  timeout was added, per the decided rule.
