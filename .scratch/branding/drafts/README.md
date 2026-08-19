# World Clock — logotype draft round 1

Five concept directions for the World Clock mark (Trustfall AB). All SVGs are
`viewBox="0 0 1024 1024"`, hand-authored flat vector geometry, core mark kept
inside the central ~66% adaptive-icon safe zone, on a placeholder background
circle. Open `index.html` in a browser to see all five at large and launcher
size side by side. Colors are placeholders in Material 3 baseline tones — the
final icon inherits system dynamic color, so read these as tonal roles, not
brand colors.

---

## Draft 1 — Shared Instant (`draft-1-shared-instant.svg`)

**Concept.** The app's core truth: many clocks, one moment. A hero dial plus
two smaller satellite dials cascade diagonally in decreasing size (the
chronologically ordered clock list), and every hand sits at exactly the same
angle. The repetition of one hand angle across different dials *is* the
product.

**Monochrome / small sizes.** Single-color mark already; pure strokes and dots,
so it converts to a themed icon by recoloring one group. At launcher size the
smallest dial approaches the legibility floor — the two-dial version (hero +
one satellite) is the small-size fallback.

**Weaknesses.** Three circles is the busiest of the five drafts; at 24 dp the
third dial becomes noise. Diagonal composition is less stable inside a circle
than a centered mark. Risks reading as "bubbles" before "clocks" if the hands
get too short.

## Draft 2 — Offset Bands (`draft-2-offset-bands.svg`)

**Concept.** Timezones as concentric arc bands of different sweep — each ring
has lived a different amount of the day — but all three terminate on one
radius, pinned by a single hand at 12. One shared instant slicing through
every offset. Also echoes the scrub gesture: the bands feel rotatable, the
hand feels like the detent they snap to.

**Monochrome / small sizes.** Currently 2 mark colors (bands + accent hand);
collapses to one color with no loss of structure since the hand is
distinguished by position, not hue. Thick round-capped arcs survive small
sizes well; the r=140 inner band is the first casualty and can be dropped.

**Weaknesses.** The most abstract of the five — without the app next to it,
it could be read as a generic radial/loading motif. Slight optical imbalance
(bands all trail counterclockwise) needs tuning. Arc endpoints hidden under
the hand must stay pixel-aligned or the "pinned" story dissolves.

## Draft 3 — Zero Detent (`draft-3-zero-detent.svg`)

**Concept.** The signature interaction as the whole mark: a solid disc whose
hand is negative space, snapped into a slot that breaks the rim at 12 — the
zero detent catching the scrub at *now*. Keyhole-adjacent silhouette, one
shape, no decoration. Swiss-reductive; closest in spirit to Linear/Signal.

**Monochrome / small sizes.** The strongest monochrome candidate: it is a
single silhouette by construction and loses nothing as an Android 13 themed
icon. Negative-space slot and pivot stay legible at 24 dp if the slot width
is kept ≥ 1/12 of disc diameter. Note: in this draft the cutouts are drawn as
canvas-colored shapes; the final must be one boolean path (an earlier evenodd
attempt left a stray filled nub where the slot exits the rim).

**Weaknesses.** Says "clock + detent" but not "world/many" — the plurality of
timezones is absent. Keyhole reading could drift toward "privacy/lock"
(ironically Signal-ish). Solid disc is heavy; may need the disc opened into a
thick ring in iteration.

## Draft 4 — Terminator (`draft-4-terminator.svg`)

**Concept.** One disc split by the day/night terminator curve — the only
honest "world" in a world clock is that it is always both day and night
somewhere. A single negative-space hand crosses both halves from a pivot that
sits exactly on the curve: one instant, projected across day and night at
once.

**Monochrome / small sizes.** Weakest monochrome story: the day/night split
depends on two fills. Mono fallback = night half + hand as the silhouette
(half-disc with a hand), which works but is a different mark. The S-curve
stays legible small; the hand crossing the boundary does not.

**Weaknesses.** Three colors, so it leans on palette hardest and fights the
dynamic-color requirement. Yin-yang adjacency at small sizes. The
day/night metaphor is about the *world*, not about the app's actual
signature (shared scrubbing) — prettiest, least specific.

## Draft 5 — Monogram W (`draft-5-monogram-w.svg`)

**Concept.** The W of World Clock authored as two pairs of clock hands
sharing two pivots — punched pivot holes at the W's feet make the strokes
read as hands, not letterform. Two clocks, one glyph: the monogram literally
is two synchronized clocks. Ownable and trademark-friendly.

**Monochrome / small sizes.** Single-color mark; bold 56-unit strokes with
round caps survive 24 dp easily. The pivot holes are the first detail lost —
acceptable, since the W remains. Trivially valid as a themed icon.

**Weaknesses.** The "hands" reading requires the pivot holes to be noticed;
without them it is just a rounded W. Symmetric hand angles mean both "clocks"
show mirrored, non-real times — charming or sloppy depending on taste. Least
connected to the scrub/detent interaction.

---

## Ranking

1. **Draft 3 — Zero Detent.** Best silhouette, best monochrome path, and it
   brands the one interaction no competitor has. Most iteration headroom.
2. **Draft 2 — Offset Bands.** Most complete story (offsets + shared instant
   + detent) in one centered mark; needs abstraction risk tamed.
3. **Draft 5 — Monogram W.** Safest and most ownable; slightly generic until
   the clock-hands reading is sharpened.
4. **Draft 1 — Shared Instant.** Truest to the product model, but the
   multi-dial composition is fighting the icon format.
5. **Draft 4 — Terminator.** Most attractive at poster size, weakest as a
   dynamic-color adaptive icon.

## Iteration questions

- **Draft 1:** Two dials instead of three — does hero + one satellite keep the
  "many clocks, one moment" reading while fixing small-size density?
- **Draft 2:** If the accent hand becomes the same color as the bands, does
  the mark still clearly say "pinned at one instant," or does it need a gap
  detent notch at 12 instead of a hand?
- **Draft 3:** Solid disc vs. thick open ring — which weight feels calm rather
  than heavy, and does adding one faint second negative hand (another
  timezone) add "world" without breaking the reductive read?
- **Draft 4:** Is there a one-color version of the terminator (curve as a
  negative-space cut through a solid disc) worth drafting before discarding?
- **Draft 5:** Should the two "clocks" show two *real* related times (e.g.
  hands at different plausible angles) at the cost of the W's symmetry?

---

# Round 2 — Classic watch face with inset subdial

Owner direction after round 1: a classic, expensive, Rolex-like watch face
with a smaller clock face inset within the large one. Product mapping: the
big dial is the hero local clock, the subdial is a second timezone inside it.
Round 2 is five *variations of one concept*, not five concepts. Main hands sit
at the classic 10:08; the subdial hand deliberately points elsewhere — same
watch, different hour: the second timezone.

Shared tension: luxury lives in fine detail, launcher icons live in
reduction. These drafts try to carry "expensive" through proportion (thin
double bezels, precise baton geometry, faceted dauphine hands, generous dial
whitespace) rather than density. Each entry notes which details die first at
small sizes.

## Draft 6 — Small-Seconds Classic (`draft-6-small-seconds-classic.svg`)

**Concept.** The dress-watch archetype: thin double bezel, eleven baton
indices with a double baton at 12, dauphine hands, and a small-seconds-style
subdial at 6 that here reads as the second timezone. Near-single-color (one
ink), so it is simultaneously the direction's monochrome proof.

**Monochrome / small sizes.** Already one color. Drop order at small sizes:
inner hairline ring first, then the subdial's tick ring, then thin the eleven
batons to eight (keep cardinals + double-12). Subdial (164 units ≈ 9 px at
56 px) stays readable because its ring is 10 units thick.

**Weaknesses.** The most literal "it's just a watch" of the set — the world/
timezone story is invisible without the caption. Eleven batons flirt with the
density ceiling; at 24 dp they merge into a dotted ring.

## Draft 7 — GMT at Three (`draft-7-gmt-at-three.svg`)

**Concept.** The "expensive" rendering: champagne gold on deep green lacquer,
fluted coin-edge bezel (60 flutes), and a cream GMT subdial at 3 o'clock —
the second timezone given its own contrasting lacquer disc, like a
complication that cost extra. Tritone: green, gold, cream.

**Monochrome / small sizes.** Worst-case for theming: the cream subdial disc
is doing real work. Mono fallback = draft 6's structure (outline subdial).
The fluting reads as a solid textured ring below ~100 px — acceptable, but at
launcher size it should be replaced by a plain 20-unit ring. Indices go from
eleven to seven next.

**Weaknesses.** Most palette-dependent draft; under Material You dynamic
color the green/gold/cream trio becomes tonal steps of one hue and loses the
"gold on lacquer" richness. Fluting + batons + subdial ticks is the densest
composition of round 2.

## Draft 8 — Offset Subdial (`draft-8-offset-subdial.svg`)

**Concept.** Modern luxury via asymmetry: the second-timezone subdial sits
offset to the lower-right (between 4 and 5 o'clock), indices reduced to
cardinals only, slender sword hands, gold on black lacquer duotone. The
off-axis subdial gives the mark a distinctive silhouette no centered layout
has — useful for trademark distance from actual watch brands.

**Monochrome / small sizes.** Duotone collapses to mono trivially (gold
becomes the single tone). Drop order: subdial tick ring, hairline inner
bezel, then the 3/6/9 batons — the offset subdial + double-12 alone still
identify the mark. Subdial is the largest of the set (192 units) precisely
so the asymmetry survives 56 px.

**Weaknesses.** Sword hands are less "expensive" than dauphine at small
sizes (they read as plain sticks). The offset position can look like an
error rather than a choice if the surrounding whitespace isn't tuned; needs
the subdial to visually kiss the bezel or keep a clearly deliberate gap.

## Draft 9 — Fluted Roman (`draft-9-fluted-roman.svg`)

**Concept.** The heirloom variant: cream enamel dial, gold fluted bezel, an
authored XII letterform (strokes, not fonts) at 12, dot indices elsewhere,
small-seconds subdial at 6. The XII is the one place round 2 risks a
letterform, since Roman numerals are watch furniture, not typography.

**Monochrome / small sizes.** Tritone → mono works (dark ink survives; gold
ring becomes ink). Drop order: XII dies first (below ~120 px it is smudge —
replace with a double baton), then dot indices, then subdial hairline. The
fluting has the same small-size caveat as draft 7.

**Weaknesses.** Most detail-dense and most conservative — closest to an
actual existing watch aesthetic, hence weakest trademark distance. XII pulls
attention from the subdial, and the mark has two competing focal points.

## Draft 10 — Reduced Mono (`draft-10-reduced-mono.svg`)

**Concept.** The endgame of this direction as an Android 13 themed icon:
bezel ring, one baton at 12, bold faceted dauphine hands, subdial ring with
its own hand at 6. Nothing else. The bet: "expensive watch" can be carried by
the 10:08 hand geometry, the dauphine facet silhouette, and the big-dial/
small-dial hierarchy alone.

**Monochrome / small sizes.** Single color by construction; every element is
sized to survive 24 dp (bezel 26 units, subdial ring 18, hands ≥ 26 at the
tip taper). Nothing needs to be dropped — this *is* the drop target the other
four degrade toward.

**Weaknesses.** Least "luxurious" at hero sizes — without indices it can read
as a generic clock glyph with a bubble. The subdial hand angle is the only
storytelling element left, so it must be tuned carefully (too close to the
main hands and it looks like a misprint).

## Round 2 ranking

1. **Draft 8 — Offset Subdial.** Most ownable silhouette; asymmetry does the
   branding work that detail density cannot at icon sizes.
2. **Draft 10 — Reduced Mono.** The honest launcher icon; also the shared
   degradation target, so building it first de-risks the whole direction.
3. **Draft 6 — Small-Seconds Classic.** Best balance of "watch" and
   reduction; slightly anonymous.
4. **Draft 7 — GMT at Three.** The best hero/marketing rendering; weakest
   under dynamic color and at 24 dp.
5. **Draft 9 — Fluted Roman.** Handsome but derivative and detail-heavy;
   keep only if the brand should feel heirloom rather than modern.

**Cross-round note.** A pairing worth testing next round: draft 8's offset
subdial with draft 3's negative-space construction (subdial and hands as
cutouts in a solid disc) — luxury proportions, single silhouette.

## Round 2 iteration questions

- **Draft 6:** Eight indices instead of eleven — does the dial stay
  "dress watch" or slide toward generic clock icon?
- **Draft 7:** Under a real Material You tonal palette (all three colors from
  one hue family), does the cream subdial still separate, or does it need to
  become an outline like draft 6?
- **Draft 8:** Subdial kissing the bezel vs. floating with a clear gap —
  which reads as intent at 56 px?
- **Draft 9:** If XII is replaced by a double baton, is anything left that
  earns this draft its slot over draft 6?
- **Draft 10:** Does adding back exactly one detail (double baton at 12 or a
  4-tick subdial ring) buy noticeable "expensive" without breaking the
  themed-icon read?
