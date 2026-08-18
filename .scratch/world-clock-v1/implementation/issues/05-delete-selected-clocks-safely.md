# 05 — Delete selected clocks safely

Parent: [Create tracer-bullet implementation tasks](../../issues/13-create-tracer-bullet-implementation-tasks.md)

Specification: [World Clock v1 implementation specification](../../spec.md)

Index: [World Clock v1 implementation tickets](../index.md)

**What to build:** Every selected row can be removed only through a named, irreversible confirmation. Cancel/dialog Back preserve the clock; confirmed Delete persists once, removes once, announces once, and moves focus predictably. Local remains mandatory and has no delete action or path.

**Blocked by:** 03 — [Add, project, and restore offline city clocks](03-add-project-and-restore-offline-city-clocks.md).

**Status:** ready-for-agent

**Delivery workflow:** Work directly on `master`; do not create a branch or pull request. Finish green and demoable.

## Scoped seams

Delete use case/effect contract; atomic snapshot replacement; selected-row action column; accessible confirmation modal; announcement and stable-focus fallback coordination. Use the simple accessible `×` unless a native-quality trash icon already exists.

## Acceptance criteria

- [ ] Every selected row has a far-right, at least 48dp `Delete <name>` action; Local has no delete action.
- [ ] Delete opens a modal naming the clock, explaining irreversibility, and offering Cancel and destructive Delete.
- [ ] Cancel and system dialog Back close the modal without visible or stored mutation.
- [ ] Confirm performs one atomic write, removes exactly once, announces the named removal once, and offers no Undo.
- [ ] Repeat activation while pending is ignored.
- [ ] Focus moves to the next displayed row, otherwise previous row, otherwise `Add timezone`; stable render identity survives reconciliation.
- [ ] The full slice remains green and demoable with city clocks.

## Automated acceptance subset

Cover accessible `Delete <name>`, 48dp selected action/no Local action, named modal and destructive semantics, Cancel/dialog Back nonmutation, pending-repeat guard, successful one-write removal/no Undo/single announcement, next/previous/Add focus fallbacks, stable render keys, and chronological reconciliation only after the overlay closes.

## Later Pixel 7a checkpoint

Exercise Cancel, system dialog Back, confirmed removal, focus fallback, and absence of Undo with touch and later TalkBack. Defer to tickets 11 and 13.
