# Research a live launcher icon

Type: research
Status: open
Assignee:
Blocked by:
Priority: low

## Question

Can the dress-watch app icon move its hands to show the current time (or the
local clock's current time) while World Clock is not running, on the Pixel 7a
launcher and on stock Android more generally?

## Shape of the work

- This is an investigation, not a commitment to ship a live icon. Record what
  Android actually allows: adaptive-icon launch animation, themed/monochrome
  static layers, widgets, and any OEM live-icon mechanism.
- Primary sources should answer whether a launcher icon can tick continuously
  without a foreground or bound service the user did not ask for. The expected
  failure mode is that launcher icons are static (or animate only at launch)
  and that a ticking clock belongs on a widget instead.
- If the answer is no on Pixel Launcher / Android 17, close the ticket with
  that finding and point at
  [Add a lock-screen widget](04-add-a-lock-screen-widget.md) as the live-clock
  surface. Do not invent a background process whose only job is to restamp the
  launcher icon.
- If some limited option exists (for example launch-time animation of the
  existing mark, or a manufacturer API), describe cost, offline impact, and
  whether it is worth a later implementation slice.

## Resolution

Open.
