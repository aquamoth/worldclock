# Define widget-ready boundaries without building a widget

Type: grilling
Status: closed
Assignee: Codex
Blocked by: 02

## Question

Which minimal state and timezone-domain boundaries must v1 preserve so a later Android lock-screen-capable widget effort can reuse clock selection and calculation without pulling widget design or implementation into scope?

## Resolution

Preserve two platform-neutral contracts: a selected-clock snapshot and a clock-projection contract. They are v1 app contracts, not widget APIs.

### Selected-clock snapshot

The application owns one ordered `SelectedClockSnapshot`. The persistence port reads and atomically replaces that whole snapshot; its Async Storage adapter is an implementation detail that neither the application nor future native code may depend on.

The snapshot is a plain, JSON-serializable, versioned document. It contains only the ordered selected clocks and the source data needed to reconstruct each one:

- every selected clock has a stable instance ID and a discriminator;
- a city timezone carries stable catalog identity, its display city/country metadata, and its IANA timezone ID;
- a custom timezone carries its required display name and integer UTC-offset minutes;
- array order is display order.

The catalog and collection decisions may sharpen field names and validation, but they must preserve those semantics. Persistence adapters validate and migrate older schema versions before returning the current snapshot. An unknown newer version or invalid record is rejected without silently rewriting it. Contract fixtures must prove the serialized form round-trips without React, Expo, `Intl`, class instances, functions, or storage-specific values.

Do not persist the local clock, current/virtual instant, formatted time, effective offset, day difference, device timezone, 12/24-hour preference, locale, or theme. Those are device state or derived projections. A future widget adapter can mirror the same current-version snapshot into native-readable storage without changing the application use cases; v1 does not create that mirror.

### Clock projection

Expose one render-neutral operation whose inputs are a clock definition, an epoch-millisecond instant, the local clock's current IANA timezone ID, and the current 12/24-hour preference. Its output is plain display data: local hour/minute fields and AM/PM marker when applicable, effective `UTC±HH:MM` offset, and signed day difference relative to the local clock. Labels come from the clock definition rather than timezone calculation.

The operation never samples the wall clock, reads device preferences, reads persistence, or imports UI code. The application samples one instant and supplies it to every row in live or virtual time. Fixed offsets use domain arithmetic. IANA civil-time fields and effective offsets are obtained through a narrow timezone-rules port; Hermes `Intl.DateTimeFormat` is the v1 adapter, and a later native implementation can satisfy the same contract with Android `java.time`.

Keep language-neutral conformance fixtures at this boundary. They cover ordinary dates, winter/summer offsets, DST gaps and overlaps as instants, date-boundary differences including `−2` and `+2`, and fixed-offset extremes. The acceptance-contract ticket chooses the concrete fixtures and device pass criteria. Consumers may differ when their installed timezone databases differ, but must agree for the tested device data.

### Explicit boundary

V1 adds no `AppWidgetProvider`, Glance or `RemoteViews` code, native-readable store, background refresh, widget update protocol, widget layout, lock-screen behavior, minute scheduler, Kotlin timezone module, or widget dependency. Choosing those belongs to the later widget effort. Expo CNG remains the reproducible extension point for whatever native adapter and resources that effort selects.
