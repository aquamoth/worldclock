# 03 — Add, project, and restore offline city clocks

Parent: [Create tracer-bullet implementation tasks](../../issues/13-create-tracer-bullet-implementation-tasks.md)

Specification: [World Clock v1 implementation specification](../../spec.md)

Index: [World Clock v1 implementation tickets](../index.md)

**What to build:** From the live app, a user can open the offline selector, browse/search, add one city timezone, see it projected with effective offset/day difference in the chronologically ordered clock collection, and relaunch offline with the committed city restored. Additional distinct cities—including cities sharing rules—can coexist; an already-selected catalog entry is unavailable.

**Blocked by:** 02 — [Generate the validated offline clock catalog](02-generate-the-validated-offline-clock-catalog.md).

**Status:** ready-for-agent

**Delivery workflow:** Work directly on `master`; do not create a branch or pull request. Finish green and demoable. Keep catalog cities immutable and leave custom/edit/delete/capacity behavior to later tickets.

## Scoped seams

Clock-catalog port and generated JSON adapter; selector screen and result semantics; city projection through the timezone-rules port; application add use case and chronological screen model; versioned selected-clock snapshot/codec and atomic persistence port with Async Storage adapter; stable IDs/add sequence; focus/scroll effect after add.

## Acceptance criteria

- [ ] `Add timezone` opens an entirely offline catalog whose empty and searched results follow the approved ranking.
- [ ] One city is added per visit only after one successful atomic snapshot write; cancel changes nothing.
- [ ] The new city closes the selector, appears at its chronological position with time/name/effective offset/day difference, scrolls into view, and receives accessibility focus.
- [ ] The exact same catalog ID cannot be added twice; distinct catalog entries sharing one IANA zone may coexist.
- [ ] Local participates in chronological sorting, ties use Local/add-sequence/stable-ID order, and date-line/DST changes can reorder correctly.
- [ ] Relaunch offline restores committed city identity and captured display/country/IANA metadata, even when a later catalog renames or removes that entry.
- [ ] Chronological display order and all derived/device/transient fields remain absent from the snapshot.
- [ ] The UI and tests remain green and demoable offline.

## Automated acceptance subset

Run exact winter/summer, New York DST gap/overlap, Kathmandu fractional, date-line `−2`/`+2`, companion `−1`/zero/`+1`, effective-offset, and no-seconds fixtures through pure projection. Cover chronological date/minute sorting, all tie-breaks, New York versus fixed UTC−04:30 DST reorder, search and selected-city unavailability, same-IANA coexistence, one-write add, JSON round-trip/relaunch, removed-catalog survival, selector cancel, overlay-held order, focus/scroll outcome, and absence of network calls.

## Later Pixel 7a checkpoint

Offline, search with spelling variants; add ordinary, DST, fractional, and date-line cities; confirm offsets/day markers/chronological placement and duplicate unavailability; relaunch and confirm restoration. Defer the normative run to ticket 13.
