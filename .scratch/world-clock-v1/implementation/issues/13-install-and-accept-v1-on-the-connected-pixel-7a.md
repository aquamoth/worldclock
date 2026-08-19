# 13 — Install and accept v1 on the connected Pixel 7a

Parent: [Create tracer-bullet implementation tasks](../../issues/13-create-tracer-bullet-implementation-tasks.md)

Specification: [World Clock v1 implementation specification](../../spec.md)

Index: [World Clock v1 implementation tickets](../index.md)

**What to build:** Install the exact production candidate and reach the v1 destination only after all eight normative manual scenarios pass on the authorized Google Pixel 7a. Record results and environment facts durably; any failure blocks completion and returns to the owning implementation slice for a fix and required reruns.

**Blocked by:** 12 — [Prove the clean Android release and Hermes conformance gate](12-prove-the-clean-android-release-and-hermes-conformance-gate.md).

**Status:** complete

**Checkpoint:** The exact-candidate automated, gesture, Virtual-mutation,
lifecycle/preference, responsive collection/overlay, and non-TalkBack time-rule
checks are recorded in [the Pixel acceptance record](../release-gates/ticket-13-pixel-acceptance.md).
The owner indefinitely deferred physical TalkBack operation and required TalkBack
to remain disabled; automated accessibility semantics remain required and passing.
Exact-candidate empty/cap/validation-error reruns are complete.

**Delivery workflow:** Work directly on `master`; do not create a branch or pull request. Make no new product decision or opportunistic redesign. Finish only when the destination is genuinely accepted.

## Scoped seams

Release installation and evidence capture; acceptance checklist/results against the built app. Target serial is `34051JEHN12837`, Android 17/API 37, 411×914dp, font scale 1.35, `sv-SE`, 24-hour, and `Europe/Stockholm` unless recorded preflight shows a change.

## Acceptance criteria

- [x] The exact artifact from ticket 12 is identified, its clean automated gate is rerun/passing, and it is installed on the authorized target.
- [x] Offline cleared-data cold launch passes with usable Local-only state and offline Add/search.
- [x] Catalog/custom add, duplicates, validation, chronological ordering, offsets/day markers, capacity, edit, confirmed delete, focus, persistence, and Virtual-time mutations pass.
- [x] Both scrub grids, direction/sensitivity, axis arbitration, ten row-origin vertical scrolls, both wrap forms, freeze, exact zero, and Back pass.
- [x] Live/Virtual lifecycle, background preference changes, process death, and offline relaunch pass.
- [x] Light/dark, font scale 1.35/2.0, reduced motion, responsive/cutout layout, and every named screen/state pass.
- [x] Owner-deferred physical TalkBack is recorded; automated announcement, focus, action, and traversal semantics pass alongside manual 12/24, DST-aware city, and fixed custom offset checks.
- [x] Build identity, device facts, every scenario result, and any reruns are recorded; no crash, incorrect projection/order, lost mutation, inaccessible action, or unresolved acceptance-severity defect remains.

## Automated acceptance subset

Re-run the clean gate for the exact artifact before install. This ticket introduces no new unit seam; any failure follows the specification's affected-suite and whole-section rerun policy.

## Later Pixel 7a checkpoint

This ticket is the checkpoint. Execute every non-deferred normative manual scenario from the specification and acceptance contract, retain the passing automated accessibility gate, and record the owner-deferred physical TalkBack scenario before closing it.

## Resolution

Accepted the signed Hermes production candidate from source `bfe544a` on the
authorized Pixel 7a. The clean gate passed `29/29` suites and `236/236` tests; the
installed APK SHA-256 is
`7e92c3d3f15eb1bf466888ae816ab5acdb7a4eb28486d2f182aa542080d93d36`.
Physical acceptance found and fixed Android's zero-translation gesture-start axis
lock and verified all non-deferred offline collection, gesture, lifecycle,
responsive, and time-rule scenarios. The owner indefinitely deferred physical
TalkBack operation while retaining the passing automated native accessibility gate.
The durable evidence and exact restoration audit are recorded in the linked Pixel
acceptance record.
