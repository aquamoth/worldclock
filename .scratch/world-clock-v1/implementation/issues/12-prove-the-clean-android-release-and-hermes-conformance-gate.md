# 12 — Prove the clean Android release and Hermes conformance gate

Parent: [Create tracer-bullet implementation tasks](../../issues/13-create-tracer-bullet-implementation-tasks.md)

Specification: [World Clock v1 implementation specification](../../spec.md)

Index: [World Clock v1 implementation tickets](../index.md)

**What to build:** A reproducible installable Android production candidate from a clean checkout with every automated suite green and the language-neutral timezone corpus passing under the release's Hermes/Android runtime. This catches device-ICU and CNG/build differences before the manual acceptance session.

**Blocked by:** 11 — [Complete the TalkBack and stable-focus journey](11-complete-the-talkback-and-stable-focus-journey.md).

**Status:** ready-for-agent

**Delivery workflow:** Work directly on `master`; do not create a branch or pull request. Finish with a recorded artifact identity and clean gate. Do not add speculative native timezone code.

## Scoped seams

Clean dependency/install/typecheck/test/catalog-generation/build pipeline; production Expo CNG configuration; Hermes conformance runner sharing the normative fixtures; release artifact identity and automated result record. A conformance failure blocks and requires a separately recorded decision before architecture escalation.

## Acceptance criteria

- [ ] A clean checkout deterministically installs, regenerates/validates the catalog, typechecks, runs every automated suite, and creates an installable production Android artifact.
- [ ] Hermes is the release runtime and the language-neutral projection corpus passes under Android/Hermes, not only the host runtime.
- [ ] Generated native output is reproducible through CNG and is not hand-maintained source.
- [ ] The candidate requires no network for launch/catalog/projection/persistence flows.
- [ ] Automated launch smoke has no crash or unhandled rejection.
- [ ] The artifact identity and gate results are recorded for exact installation in ticket 13.
- [ ] No Kotlin timezone module, bundled timezone-rule library, or other speculative escalation is introduced unless conformance first fails and a new decision authorizes it.

## Automated acceptance subset

Run all domain/application/catalog/snapshot/component/integration suites and deterministic catalog regeneration. Under release Hermes/Android, run exact winter/summer, DST gap/overlap, fractional/date-line/day-difference/fixed-offset/12-hour fixtures. Prove the clean production build, offline dependency, and launch-smoke criteria.

## Later Pixel 7a checkpoint

Install/launch-smoke the exact candidate and record its identity only; ticket 13 owns the full target pass.
