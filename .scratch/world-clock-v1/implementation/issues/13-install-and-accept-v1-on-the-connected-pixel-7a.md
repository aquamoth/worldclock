# 13 — Install and accept v1 on the connected Pixel 7a

Parent: [Create tracer-bullet implementation tasks](../../issues/13-create-tracer-bullet-implementation-tasks.md)

Specification: [World Clock v1 implementation specification](../../spec.md)

Index: [World Clock v1 implementation tickets](../index.md)

**What to build:** Install the exact production candidate and reach the v1 destination only after all eight normative manual scenarios pass on the authorized Google Pixel 7a. Record results and environment facts durably; any failure blocks completion and returns to the owning implementation slice for a fix and required reruns.

**Blocked by:** 12 — [Prove the clean Android release and Hermes conformance gate](12-prove-the-clean-android-release-and-hermes-conformance-gate.md).

**Status:** in-progress (claimed by `/root/impl_01_live_local`)

**Delivery workflow:** Work directly on `master`; do not create a branch or pull request. Make no new product decision or opportunistic redesign. Finish only when the destination is genuinely accepted.

## Scoped seams

Release installation and evidence capture; acceptance checklist/results against the built app. Target serial is `34051JEHN12837`, Android 17/API 37, 411×914dp, font scale 1.35, `sv-SE`, 24-hour, and `Europe/Stockholm` unless recorded preflight shows a change.

## Acceptance criteria

- [ ] The exact artifact from ticket 12 is identified, its clean automated gate is rerun/passing, and it is installed on the authorized target.
- [ ] Offline cleared-data cold launch passes with usable Local-only state and offline Add/search.
- [ ] Catalog/custom add, duplicates, validation, chronological ordering, offsets/day markers, capacity, edit, confirmed delete, focus, persistence, and Virtual-time mutations pass.
- [ ] Both scrub grids, direction/sensitivity, axis arbitration, ten row-origin vertical scrolls, both wrap forms, freeze, exact zero, and Back pass.
- [ ] Live/Virtual lifecycle, background preference changes, process death, and offline relaunch pass.
- [ ] Light/dark, font scale 1.35/2.0, reduced motion, responsive/cutout layout, and every named screen/state pass.
- [ ] The complete TalkBack journey and 12/24, DST-aware city, fixed custom offset, announcement, focus, and action semantics pass.
- [ ] Build identity, device facts, every scenario result, and any reruns are recorded; no crash, incorrect projection/order, lost mutation, inaccessible action, or unresolved acceptance-severity defect remains.

## Automated acceptance subset

Re-run the clean gate for the exact artifact before install. This ticket introduces no new unit seam; any failure follows the specification's affected-suite and whole-section rerun policy.

## Later Pixel 7a checkpoint

This ticket is the checkpoint. Execute all eight normative manual scenarios from the specification and acceptance contract and record every item pass before closing it.
