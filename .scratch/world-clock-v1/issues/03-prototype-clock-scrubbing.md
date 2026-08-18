# Prototype clock scrubbing and virtual-time feedback

Type: prototype
Status: closed
Assignee: Codex (scrubbing_prototype)
Blocked by: 02

## Question

What concrete clock-list layout, horizontal scrubbing behavior, sensitivity model, precision feedback, background treatment, and Back action feel clear and controllable on the Pixel 7 while remaining accessible?

## Prototype

- Artifact: [Responsive clock-scrubbing prototype](../prototypes/clock-scrubbing-prototype.html) — clearly marked throwaway, self-contained, and non-persistent.
- Validation surface: opened in Chrome on the authorized Pixel 7a through an ADB-reversed local server. The layouts use responsive CSS rather than Pixel-specific coordinates.
- Owner-directed revision: retained only the `A`-derived model. Every clock scrubs horizontally in 15-minute steps while vertical gestures remain available for list scrolling; the ±24-hour range wraps rather than locking at an edge. Fixed-step buttons were removed. Small animated chevrons now mark each time as scrubbable, with animation disabled by reduced-motion preference. Focused clocks retain left/right-arrow keyboard operation for non-touch access.
- Status: approved after two hands-on owner feedback passes and corrected on-device verification.

## Resolution

Use the responsive row layout and direct-manipulation model captured in the [throwaway clock-scrubbing prototype](../prototypes/clock-scrubbing-prototype.html). The mandatory local clock remains first and nondeletable. Every row places a large digital time at left, its name and effective UTC offset to the right, and—only for selected clocks—a 48dp delete action in a far-right action column. Small chevrons on both sides of each time subtly pulse to communicate horizontal scrubbability; respect reduced-motion preference. Show a visible `Add timezone` action below the collection. The prototype's in-memory add/delete behavior demonstrates placement only; catalog and collection policy remain owned by their dedicated tickets.

Dragging horizontally on any clock changes the one shared virtual instant in 15-minute increments. A swipe right moves virtual time earlier; a swipe left moves it later. Preserve vertical gestures for list scrolling by locking scrubbing only after horizontal intent wins. The range is 24 hours before through 24 hours after now and wraps across its edges rather than stopping or clamping. Do not expose fixed-step buttons. Focused clock sliders use the corresponding inverted left/right arrow-key behavior for keyboard access.

Virtual time uses the approved distinct full-screen background treatment and a compact sticky section containing `Virtual time`, the signed offset moved toward the left, and a far-right revert-arrow action aligned with selected-row delete actions. Its accessible label and action name remain `Back`; activating it returns directly to live mode. Do not show the discarded precision or range subtitles, a calendar UI, or a banner.

On the authorized Pixel 7a at the recorded 411×914dp viewport and 1.35 font scale, the final revision verified that rightward dragging produced a negative 15-minute-multiple offset, leftward dragging increased it, repeated rightward drags wrapped through the negative edge to `+18:00`, and a vertical drag begun on a scrub target scrolled while live offset stayed zero. Delete removed a selected row, Add restored an available row without making the local clock deletable, and the accessible `Back` icon restored live mode. JavaScript parsing and whitespace checks also passed. The artifact is responsive and contains no Pixel-specific coordinates, persistence, production implementation, or fixed Android API dependency.
