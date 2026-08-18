# Define clock collection management

Type: grilling
Status: closed
Assignee: Codex
Blocked by: 11

## Question

What exact add, duplicate-prevention, reorder, edit, remove, empty-state, and reasonable-capacity behavior should the specification define for selected clocks?

## Resolution

### Owner-set contract

The clock collection contains the mandatory local clock plus zero or more selected clocks. Render every row in ascending chronological order by its displayed calendar date and wall time at the current shared instant: now in Live mode, or the frozen comparison instant in Virtual time. The local clock participates in that order, so it is not pinned first; it remains mandatory and nondeletable. V1 has no manual reorder control, stored display order, sort selector, or configurable sorting mode.

Rows show only the required digital time, city/custom name, effective UTC offset, and selected-clock day difference. Do not show relative labels such as “6h before local.” Production is React Native; the ordering prototype is evidence only and must never ship in a WebView.

Keep the visible `Add timezone` action below the collection. Each selected row has a far-right delete action; the `Back` action in the sticky Virtual-time status section uses the same action-column alignment. Use a simple accessible `×` unless the production component library supplies a genuinely native-quality trash icon. Either visual has the accessible label `Delete <name>`.

Deleting always opens a modal warning naming the clock and explaining that deletion cannot be undone, with `Cancel` and destructive `Delete` actions. Cancel and the system dialog-back action leave the collection unchanged. Confirmed deletion has no post-confirmation Undo. The local clock never exposes delete.

### Delegated implementation defaults

The owner delegated the remaining collection policy while AFK. Use these lowest-risk defaults:

**Ordering and stability**

- Build the primary sort key from the displayed local calendar date and minute-of-day at the shared instant, not from raw UTC offset alone. This keeps International Date Line cases chronological and automatically reflects effective DST offsets.
- For equal primary keys, place the local clock before tied selected clocks; order tied selected clocks by their persistent add sequence, then by stable selection ID as a final corruption/migration fallback. Editing retains the sequence; deleting and later re-adding creates a new sequence. This deterministic tie order is not user-configurable.
- Recompute after each Live-mode minute tick, phone-timezone change, add/edit/delete, return from `Back`, and completed Virtual-time adjustment. Hold the rendered order fixed during a continuous pointer scrub so the touched row cannot move under the finger, then apply the final chronological order on gesture end. Discrete keyboard or accessibility adjustments may reorder after each action but must retain focus by stable selection ID.
- Preserve focus on its stable clock/action when a DST or phone-timezone change reorders rows. If the platform cannot preserve that focused element across a move, defer the visual move until focus leaves that row. Freeze the list behind an open selector, editor, or delete dialog and reconcile order when the overlay closes.

**Add and exact duplicates**

- Activating `Add timezone` opens the offline selector. Add one city or custom timezone per visit; a successful save persists it, closes the selector, scrolls its chronologically placed row into view, and moves accessibility focus to that row. Cancel changes nothing.
- A city clock's duplicate identity is its stable canonical catalog-entry ID—not its current offset or IANA zone alone. Thus the same catalog city cannot be added twice, while different cities sharing one IANA zone may coexist.
- A custom clock's duplicate identity is its normalized name plus integer offset minutes. Normalize the identity name with Unicode NFKC, trimmed leading/trailing whitespace, collapsed internal whitespace, and locale-independent case folding. Custom clocks with different normalized names may share an offset, and the same normalized name may be used at different offsets. City and custom identities never collide with each other.
- Mark an already-selected city unavailable in the selector. Reject a duplicate custom save or edit in place with an accessible validation message; do not mutate either existing clock.

**Edit**

- Catalog city clocks are immutable in v1; changing one means deleting it and adding another. A custom clock's visible name/offset area is an `Edit <name>` action that opens the same validated custom form used for creation. Saving changes the existing stable selection ID in place, retains its add sequence, persists once, and returns focus to that row at its new chronological position. Cancel or validation failure changes nothing.
- As the delegated mode default, Add, edit, and delete remain visible and available in Virtual time: `Back` occupies the status section's aligned action cell but does not replace selected-row delete actions. A successful mutation does not exit Virtual time or alter its live reference/comparison instant; every resulting row projects and sorts against that same frozen instant.

**Capacity and empty state**

- Permit at most 24 selected clocks, excluding the local clock. At the cap, keep `Add timezone` visible but unavailable and show `Maximum of 24 timezones reached`; edit and delete remain available. If migrated data ever exceeds the cap, preserve it and block new adds until the count drops below 24.
- On a new or cleared collection, show the local clock plus `Add a timezone to compare times around the world.` and the normal `Add timezone` action. Seed no selected clocks.

**Persistence, errors, and focus after removal**

- Persist one versioned replacement snapshot containing only selected-clock records, stable selection IDs, and monotonic add-sequence values. Derive the local clock and chronological display order at runtime; do not persist either. Virtual-time state follows its separate non-persistence contract.
- Treat each add/edit/delete as one snapshot write. Do not present success until the write succeeds; on failure leave the prior in-memory collection intact and show an accessible retryable error. Ignore repeat activation while a write is pending.
- After confirmed deletion, move focus to the next displayed row, otherwise the previous displayed row, otherwise `Add timezone`; announce the named removal once. Use stable IDs as render keys so automatic movement does not recreate logical rows or lose focus unnecessarily.
