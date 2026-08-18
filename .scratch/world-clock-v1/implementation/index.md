# World Clock v1 implementation tickets

Status: approved

Parent: [Create tracer-bullet implementation tasks](../issues/13-create-tracer-bullet-implementation-tasks.md)

Specification: [World Clock v1 implementation specification](../spec.md)

Approved breakdown: [Implementation-ticket breakdown](../implementation-tickets-draft.md)

All tickets are single-session tracer-bullet slices. Work directly on `master`; do not create a branch or pull request. Keep the repository green and the delivered behavior demoable at the end of every ticket. Claim a ready ticket before work and take only tickets whose blockers are complete.

## Dependency order

| ID | Ticket | Blocked by |
| --- | --- | --- |
| 01 | [Launch the live local clock](issues/01-launch-the-live-local-clock.md) | None |
| 02 | [Generate the validated offline clock catalog](issues/02-generate-the-validated-offline-clock-catalog.md) | 01 |
| 03 | [Add, project, and restore offline city clocks](issues/03-add-project-and-restore-offline-city-clocks.md) | 02 |
| 04 | [Create and edit custom timezones](issues/04-create-and-edit-custom-timezones.md) | 03 |
| 05 | [Delete selected clocks safely](issues/05-delete-selected-clocks-safely.md) | 03 |
| 06 | [Make collection persistence and capacity failure-safe](issues/06-make-collection-persistence-and-capacity-failure-safe.md) | 04, 05 |
| 07 | [Compare time through the status-surface offset grid](issues/07-compare-time-through-the-status-surface-offset-grid.md) | 03 |
| 08 | [Scrub any clock row without stealing vertical scroll](issues/08-scrub-any-clock-row-without-stealing-vertical-scroll.md) | 07 |
| 09 | [Preserve Virtual time through lifecycle and collection changes](issues/09-preserve-virtual-time-through-lifecycle-and-collection-changes.md) | 06, 08 |
| 10 | [Finish responsive light/dark and reduced-motion presentation](issues/10-finish-responsive-light-dark-and-reduced-motion-presentation.md) | 04, 05, 06, 08 |
| 11 | [Complete the TalkBack and stable-focus journey](issues/11-complete-the-talkback-and-stable-focus-journey.md) | 09, 10 |
| 12 | [Prove the clean Android release and Hermes conformance gate](issues/12-prove-the-clean-android-release-and-hermes-conformance-gate.md) | 11 |
| 13 | [Install and accept v1 on the connected Pixel 7a](issues/13-install-and-accept-v1-on-the-connected-pixel-7a.md) | 12 |

## Current frontier

[04 — Create and edit custom timezones](issues/04-create-and-edit-custom-timezones.md), [05 — Delete selected clocks safely](issues/05-delete-selected-clocks-safely.md), and [07 — Compare time through the status-surface offset grid](issues/07-compare-time-through-the-status-surface-offset-grid.md) are now the independent frontier after completion of [03 — Add, project, and restore offline city clocks](issues/03-add-project-and-restore-offline-city-clocks.md). Follow the dependency table for later joins.
