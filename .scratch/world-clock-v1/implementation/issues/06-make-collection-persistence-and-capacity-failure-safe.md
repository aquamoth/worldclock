# 06 — Make collection persistence and capacity failure-safe

Parent: [Create tracer-bullet implementation tasks](../../issues/13-create-tracer-bullet-implementation-tasks.md)

Specification: [World Clock v1 implementation specification](../../spec.md)

Index: [World Clock v1 implementation tickets](../index.md)

**What to build:** The complete city/custom collection behaves safely at capacity and under persistence corruption or failure. At 24 selected clocks Add remains visible but unavailable with the required explanation; over-cap migrated data is preserved. Malformed/newer snapshots and transient reads/writes never silently overwrite or partially mutate user data and expose accessible retry paths.

**Blocked by:** 04 — [Create and edit custom timezones](04-create-and-edit-custom-timezones.md); 05 — [Delete selected clocks safely](05-delete-selected-clocks-safely.md).

**Status:** claimed

**Assignee:** Codex

**Delivery workflow:** Work directly on `master`; do not create a branch or pull request. Finish green and demoable.

## Scoped seams

Snapshot version validation and supported-migration registry; application hydration/error/retry states; staged mutation/pending guard shared by add/edit/delete; capacity policy; accessible load/write errors and disabled Add state. Add sequence is authoritative and presentation order remains derived.

## Acceptance criteria

- [ ] Zero through 24 selected clocks are supported; at 24, Add stays visible but unavailable with `Maximum of 24 timezones reached`, while edit/delete remain available.
- [ ] Valid migrated data above the cap is preserved and new adds remain blocked until the count drops below 24.
- [ ] Current snapshots round-trip as plain JSON and exclude Local, presentation order, current/virtual instants, formatted/derived fields, timezone, locale, 12/24 preference, and theme.
- [ ] Every declared older version migrates before use; malformed/current-invalid/unknown-newer data is rejected visibly without rewrite or partial recovery.
- [ ] Failed reads/writes expose accessible retry; failed add/edit/delete preserves prior visible and stored state and claims no success.
- [ ] Repeated activation during a pending write is ignored across all mutation types.
- [ ] Cold launch restores only committed records/add sequence and starts with no transient state.

## Automated acceptance subset

Cover 0–24 capacity, exact maximum copy, edit/delete at cap, over-cap preservation, current JSON round-trip and exclusions, every declared migration, malformed/newer rejection without rewrite, read/write failure and retry, prior state after each failed mutation, no success signal, pending-repeat guard, and committed-only cold-launch restoration.

## Later Pixel 7a checkpoint

Confirm cap messaging and that committed clocks survive offline force-stop/relaunch. Fault injection remains automated; TalkBack rechecks error semantics in ticket 11.
