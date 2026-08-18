# Handle extreme day differences

Type: grilling
Status: closed
Assignee: Codex
Blocked by:

## Question

How should day-difference markers behave when extreme timezone pairs produce a calendar-date difference of two days, despite the brief naming only `+1` and `−1`, and should zero difference omit the marker entirely?

## Resolution

Show the actual signed calendar-date difference between each selected clock and the local clock at the same instant. Supported markers therefore include `−2`, `−1`, `+1`, and `+2`; omit the marker when the difference is zero.
