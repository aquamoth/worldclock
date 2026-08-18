# Prototype clock ordering around local time

Type: prototype
Status: closed
Assignee: Codex (collection_management)
Blocked by:

## Question

Which ordering model most clearly lets the owner see selected-clock times before and after the phone's current local time: the current local-clock-first, manually ordered collection; a permanently first local clock with automatically ordered selected clocks; or chronological ordering in which the local clock may move? Should automatic and manual ordering coexist behind a visible configuration affordance in v1, or should v1 commit to one model?

The prototype must make the conflict with the settled local-clock-first rule explicit rather than silently overriding it. Compare the models with representative city and custom timezones whose local dates/times are earlier than, equal to, and later than the phone's, including a pair spanning the International Date Line. Define what chronological ordering means at the same instant, demonstrate whether rows can move as effective UTC offsets change across daylight-saving transitions, and show how add, delete, and any manual-reorder controls behave under each model.

Validate the useful variants hands-on at the authorized Pixel 7a's recorded viewport and font scale. Record whether automatic ordering replaces manual ordering, coexists as a configurable mode, or is rejected; whether the local clock remains permanently first; the stable tie-breaker for equal effective times; and the intended behavior when an ordering change would move a focused or actively scrubbed row. Keep the artifact throwaway and non-persistent; collection policy remains owned by “Define clock collection management.”

## Prototype

- Artifact: [Chronological clock-ordering prototype](../prototypes/clock-ordering-prototype.html) — a self-contained, non-persistent throwaway HTML artifact; production remains React Native and must not embed it as a WebView.
- The initial four-way comparison was opened on the authorized Pixel 7a and rejected. The owner selected its fully chronological model, including the local clock, then directed the artifact toward one clean view and ended further prototype iteration before a final corrected device pass.

## Resolution

V1 automatically orders every clock row—including the local clock—by its displayed calendar date and wall time at the shared instant. This deliberately supersedes the earlier local-clock-first presentation rule. The local clock remains mandatory and nondeletable even though its position can move. V1 has one ordering model: do not expose manual reordering, an ordering selector, or an ordering setting. Exact-tie behavior and collection mutations remain for [Define clock collection management](07-define-clock-collection-management.md).

The authoritative interaction behavior remains [Lock the clock interaction contract](04-lock-the-clock-interaction-contract.md): the time-status surface adjusts the frozen virtual offset in exact 15-minute steps, while a timezone-row scrub directionally snaps that row to its quarter-hour wall-clock grid; both use right-for-earlier, left-for-later, the ±24-hour wrap, and vertical-scroll arbitration. The ordering prototype does not replace that contract.

Show only the already-required time, name, effective UTC offset, and selected-clock day difference. Do not show ordering explanations, prototype selectors or controls, decorative timeline dots, or relative labels such as “6h before local.” A future optional display setting may reconsider relative labels, but they are not configurable or visible in v1.

Selected rows retain a far-right delete action that opens the approved warning confirmation dialog; use a simple `×` unless the React Native implementation supplies a genuinely native-quality accessible trash icon. Keep `Add timezone` visible. The HTML artifact is evidence only, not production code or a WebView implementation.
