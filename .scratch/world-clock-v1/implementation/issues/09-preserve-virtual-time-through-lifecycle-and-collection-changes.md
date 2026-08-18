# 09 — Preserve Virtual time through lifecycle and collection changes

Parent: [Create tracer-bullet implementation tasks](../../issues/13-create-tracer-bullet-implementation-tasks.md)

Specification: [World Clock v1 implementation specification](../../spec.md)

Index: [World Clock v1 implementation tickets](../index.md)

**What to build:** Virtual time survives ordinary background/foreground transitions and remains the same comparison while device preferences reproject. Add, custom edit, and confirmed delete remain available without changing the virtual instants. Process death/cold launch restores only committed clocks and starts Live.

**Blocked by:** 06 — [Make collection persistence and capacity failure-safe](06-make-collection-persistence-and-capacity-failure-safe.md); 08 — [Scrub any clock row without stealing vertical scroll](08-scrub-any-clock-row-without-stealing-vertical-scroll.md).

**Status:** complete

**Delivery workflow:** Work directly on `master`; do not create a branch or pull request. Finish green and demoable.

## Scoped seams

App-lifecycle/device-preference adapter events; application re-projection without instant mutation; Virtual-aware selector/editor/delete flows; transient/persisted boundary; order/focus reconciliation after mutation/overlay; minute-tick pause/resume behavior.

## Acceptance criteria

- [x] Live mode catches up to current time after background/foreground.
- [x] Virtual mode retains live-reference/comparison instants while timezone, locale, theme, and 12/24 changes reproject those instants.
- [x] Add, custom edit, and confirmed delete remain available in Virtual time and successful writes do not alter either virtual instant.
- [x] New or edited rows project/sort at the frozen comparison; cancelled/failed mutations preserve collection and instants.
- [x] Overlays hold visible order and reconcile on close with stable focus.
- [x] Back resumes then-current Live time.
- [x] Process death/cold launch restores committed selected clocks in Live and restores no Virtual/device/derived transient data.

## Automated acceptance subset

Cover Live foreground catch-up; Virtual preference/timezone/locale/theme re-projection without instant mutation; successful and failed/cancelled city/custom add/edit/delete in Virtual; overlay-held order; Back; minute-tick behavior; process recreation/cold launch restoring snapshot in Live; and serialized exclusion of Virtual/theme/preferences/derived fields.

## Later Pixel 7a checkpoint

Background both modes, change timezone/12/24/theme/locale while backgrounded, mutate the collection in Virtual time, Back, then force-stop/cold-launch and verify restoration in Live. Defer to ticket 13.

## Resolution

Added a native app-lifecycle adapter and race-safe minute scheduler so backgrounding pauses ticks and foregrounding immediately reprojects current Live time or the unchanged Virtual comparison. Device timezone, locale, hour preference, and appearance changes re-render from current device state without changing either Virtual instant. City/custom add, custom edit, and confirmed delete now have end-to-end Virtual success, cancellation, and persistence-failure coverage; overlays retain visible order and return stable focus as chronological order reconciles.

Process-recreation coverage proves only the committed versioned selected-clock snapshot returns and every cold launch begins Live, excluding Virtual, device-preference, appearance, order, and derived projection data. TypeScript, 203 automated tests, catalog validation, Expo dependency/doctor checks, and the Android debug build pass. Independent standards and specification reviews found no remaining material issue. Physical Pixel acceptance remains deferred to ticket 13.
