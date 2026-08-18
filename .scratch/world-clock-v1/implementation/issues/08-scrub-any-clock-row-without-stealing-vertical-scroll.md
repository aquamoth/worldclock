# 08 — Scrub any clock row without stealing vertical scroll

Parent: [Create tracer-bullet implementation tasks](../../issues/13-create-tracer-bullet-implementation-tasks.md)

Specification: [World Clock v1 implementation specification](../../spec.md)

Index: [World Clock v1 implementation tickets](../index.md)

**What to build:** Every clock row becomes a direct-manipulation scrub surface using that row's directional quarter-hour wall grid. Users can switch between rows and the status surface while preserving one comparison instant, scroll vertically from a row without changing time, and scrub without the active row moving beneath the pointer.

**Blocked by:** 07 — [Compare time through the status-surface offset grid](07-compare-time-through-the-status-surface-offset-grid.md).

**Status:** closed

**Assignee:** Codex

**Delivery workflow:** Work directly on `master`; do not create a branch or pull request. Finish green and demoable.

## Scoped seams

Row-grid reanchor/wrap domain transitions; gesture-start snapshot and move quantization; platform touch-slop/axis arbitration/cancellation; row gesture-handler integration; held-order/reconcile effect; row keyboard/adjustable actions; decorative chevrons as nonsemantic affordance.

## Acceptance criteria

- [x] Every row time is a scrub/adjustable surface separate from sibling collection actions.
- [x] First movement directionally reanchors the scrubbed row to its previous/next quarter, including moving away from an exact boundary.
- [x] Switching rows reanchors through the new row; switching back to status continues from the resulting virtual offset.
- [x] Pointer right/left, hardware right/left, and accessibility decrement/increment all map to earlier/later as specified.
- [x] Touch slop, tap, cancellation, vertical win, and horizontal axis lock behave deterministically from gesture-start state.
- [x] Vertical row-origin gestures scroll without time change; the active row remains fixed during a continuous pointer scrub and reconciles on end.
- [x] Nonzero row-derived lattices wrap correctly, and decorative chevrons do not enter the accessibility tree.

## Automated acceptance subset

At 07:32 assert row right/left = 07:30/07:45 and −0:02/+0:13; at 07:30 assert preceding/following quarter; row switching and status +0:13→+0:28; +23:58→−23:47 and reverse; approximately 15 minutes/9dp; move-batching invariance; touch slop/tap/cancel/axis arbitration; vertical scroll nonactivation; held/reconciled order; stable focus; and keyboard/accessibility values/announcements.

## Later Pixel 7a checkpoint

Scrub at least three rows, verify quarter-grid feel and switches, perform ten row-origin vertical scrolls with zero false activation, exercise non-quarter wrap, and confirm active-row stability. Defer to ticket 13.

## Resolution

Every row time now shares the native scrub recognizer while retaining its own directional wall-quarter reanchor. Application coordination preserves one live reference/comparison instant, derives pointer movement from gesture-start state, holds chronological order until pointer completion, and restores stable focus after reconciliation. Row and status surfaces share platform touch slop, dominant-axis locking, approximately 9dp quarter steps, keyboard/TalkBack mappings, human-readable values, and accessibility-hidden animated chevrons. Pure grid, application, gesture, and native UI suites cover the automated acceptance subset; Expo prebuild and the Android debug build pass. The physical Pixel checkpoint remains deferred as specified.
