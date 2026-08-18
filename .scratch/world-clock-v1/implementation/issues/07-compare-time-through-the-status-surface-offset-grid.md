# 07 — Compare time through the status-surface offset grid

Parent: [Create tracer-bullet implementation tasks](../../issues/13-create-tracer-bullet-implementation-tasks.md)

Specification: [World Clock v1 implementation specification](../../spec.md)

Index: [World Clock v1 implementation tickets](../index.md)

**What to build:** A user can horizontally scrub the compact time-status surface to enter Virtual time, move every clock together on the relative 15-minute offset grid within the cyclic ±24-hour window, inspect a frozen comparison, and use Back or exact zero to resume current Live mode.

**Blocked by:** 03 — [Add, project, and restore offline city clocks](03-add-project-and-restore-offline-city-clocks.md).

**Status:** ready-for-agent

**Delivery workflow:** Work directly on `master`; do not create a branch or pull request. Finish green and demoable. Do not implement row scrubbing yet.

## Scoped seams

Live/Virtual application state with live-reference/comparison instants; offset-grid transition and wrap domain logic; status-surface gesture adapter; sticky Virtual status/background treatment; Back action; keyboard and adjustable-action mapping for this surface; transient state excluded from persistence.

## Acceptance criteria

- [ ] An accepted status scrub captures one live reference and moves every row through one shared frozen comparison instant.
- [ ] Right means earlier and left means later; first movement from Live is exactly −0:15/+0:15 and later status movements use exact 15-minute steps.
- [ ] The allowed window is cyclic from −24:00 through +24:00 and wraps rather than clamping, stopping, or bouncing.
- [ ] Virtual mode has a distinct semantic full-screen treatment and sticky status showing `Virtual time`, signed offset, and icon-only accessible Back in the aligned action column.
- [ ] Back samples then-current Live time; exact zero exits Live without frozen `+0:00`; Virtual state is not persisted.
- [ ] Hardware and adjustable actions expose the approved earlier/later semantics without fixed-step UI controls.
- [ ] The slice adds no row scrubbing, calendar UI, banner, visible Back text, or range/precision subtitle.

## Automated acceptance subset

At 07:32 assert first right/left = −0:15/+0:15 and 07:17/07:47; later exact steps; pointer, hardware, and accessibility mappings; +24:00→−23:45 and −24:00→+23:45; frozen comparison after fake time advances; every row sharing one instant; Back/current-time resumption; exact-zero exit; status semantics/announcements; and absence of forbidden UI/persistence.

## Later Pixel 7a checkpoint

Confirm sensitivity/direction, shared freeze, both wrap edges, distinct Virtual treatment/sticky Back alignment, and exact-zero/Back return. Defer to ticket 13.
