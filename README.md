# COIN DROP

A mobile-friendly top-down coin pusher built with plain HTML, CSS, and JavaScript.
A separate side-view dungeon walkway sits above the machine.
No runtime dependencies, external assets, or build step.

## Play

Open `index.html` in a modern browser, including Safari on iPhone. Play starts
automatically. Defeat slimes to feed trash, coins, or rare loot into the rear entry beneath
each slime’s death position. Position kills to work different parts of the pile.
Enemy deaths do not award wallet coins. Machine collections add one coin to the
existing COINS balance, which starts at zero. Stored coins can be spent using DROP or F: one coin per press, aimed by the
knight’s current horizontal center. Holding does not repeat.

Tap **↺** to refill the machine with 84 coins in partly filled rows with clearance around the initial potion and two small stacks,
clear queued feeds and physical loot, and reset COINS and USED to zero. USED counts coins fed into
the machine from either source, excluding the starting pile. This machine reset
does not reset combat. The GAME OVER Restart button resets combat and waves only.

For local HTTP hosting, run `python3 -m http.server 8000` in this directory
and open `http://localhost:8000`.

## Dungeon walkway

Move the knight with **Left / A** and **Right / D**, and jump with
**Space / Up / W**. The visible direction buttons support holding and can be
used together with Jump on touchscreens. Slide a held direction touch onto
the other arrow to reverse; sliding off the arrows stops movement until
the finger returns. Release to stop; jumping requires a
new press after landing. Switching away clears held controls.

The geometric knight has a helmet, a walking stride, a jumping pose, and a
permanently extended sword. The stone walkway shares the machine's horizontal
bounds, but `knight.js` owns its movement and gravity. Both canvases use the
same animation loop. The dormant manual coin aimer follows the knight’s horizontal position; jumping
does not change it. Enemy-generated coins instead use each enemy’s death position. All movement, jump, and reset controls sit below the coin pusher.
Both coin decks are shortened by one coin diameter (28 simulation units)
without changing coin size, the pusher stroke, or the physics rules. Manual DROP input spends the existing collected balance. Reset refills
the coin machine and does not reposition the knight.

## Combat and health

Position the sword to hit purple slimes automatically; there is no attack
button. Slimes have 2 HP, move at half the knight's speed, flash and recoil
when hit, and feed exactly one machine coin on death. Sword hits deal 1 damage with
a 0.4-second per-enemy cooldown. Sword collision is resolved before body
contact, and a struck slime cannot hurt the knight during that cooldown.
The sword hitbox follows the visible blade, facing direction, and jumping pose.

Slimes keep their last pursuit direction while the knight is airborne and
resume tracking after landing, making jumps over them predictable.

The knight has three hearts. Body contact costs one heart, gives one second
of flashing invulnerability, and applies a short knockback. At zero hearts,
movement, jumping, dropping, enemies, and spawning stop. GAME OVER and a
Restart button appear below the machine. Restart restores the knight and
combat, leaving machine coins, motion, counters, and available balance intact.
The separate ↺ button still resets the machine and balance to zero.

## Token-driven stages and pause

Stage 1 preserves the existing slime stats, lavender appearance, alternating
safe spawn sides, and three-second interval. Spawning continues indefinitely,
up to 12 active enemies (the previous maximum wave population). At the cap,
the next spawn waits for a vacancy; there is no catch-up burst. Stage 2 changes
only newly spawned slimes to stronger purple. Old enemies keep their own copied
configuration. Stage 3 onward uses Stage 2 settings without added difficulty.
`STAGE_DEFINITIONS` in `waves.js` defines per-stage weighted enemy choices,
appearance/modifier overrides, interval, and active cap. Types do not accumulate.

One cyan NEXT WAVE token starts on the lower deck near the front, with a clear
initial pocket. `TOKEN_CONFIG` controls radius, mass, horizontal position, and
edge clearance. Placement searches for an unoccupied lower-deck position; at
full capacity or with no free position it waits until a slot is available.
Only its normal falling collection event advances the stage. Duplicate events
are ignored, and exactly one replacement is placed or pending. Progression
preserves enemies, health, coins, loot, spawn-clock remainder, and stored balance.
There are no wave counts, completion timers, or quiet periods. The initial loot batch retains its restart ledger; stage changes do not reseed it.

The compact pause button, P, or Escape pauses the whole shared fixed-step loop.
The PAUSED overlay offers touch/click Resume. Inputs are cleared on both pause
and resume, and the wall-clock baseline is discarded so nothing catches up.
Machine physics, combat, spawning, tokens, effects and notification clocks freeze.
Combat restart clears pause, restores Stage 1 and health, clears enemies, replaces
all old tokens with one fresh token, and preserves all other machine/loot state.

## Physical loot (Phase 5A)

Potion, sword, armor, and chest start together on the lower deck, spread horizontally.
Rusty Key definitions are retained but key spawning is disabled.
The earlier stage schedule is marked fulfilled so it does not add duplicates. For testing, they drop from a height of 15 onto the lower deck, one item
radius plus six units behind the collection edge. They still need pushing to
fall off and be collected. They use the same
body list, gravity, shelf attachment, stacking, contact solver, tipping, and
collection edge as coins. `LOOT_TYPES` defines icon width/height, mass, friction,
color, and the supported circular collision shape. Each enclosing disc is
outlined so its collision footprint is visible. These are intentionally simple
circular proxies rather than exact sword or armor outlines; thickness remains
the engine's existing five units. Original coin properties remain unchanged.

Potions and keys are light; swords and armor resist more; chests are heaviest.
Only falling over the front edge collects an item. `loot.collection` holds
session-only records with `id` and `type`; `loot-collected` CustomEvents carry
the same identity. Short queued notifications appear below the controls and
do not cover the machine. No full inventory or key effects exist. Phase 7 applies run rewards automatically.

A collected chest records one nested reward with its own identity: a potion,
sword, armor, or five stored coins, chosen from `CHEST_REWARDS`. Item rewards
use the same run-reward functions as ordinary loot, without respawning machine items. Chest
collection is guarded by ID so it cannot reroll or pay twice.

Combat restart preserves physical loot, pending loot, collection records, and
the wave ledger. The initial loot batch is created only once per page session,
including across combat restarts. The separate machine reset discards
physical/pending loot along with machine coins, but keeps the ledger and items
already collected; it does not award replacements. Reloading starts a new
session. At the 180-body cap, scheduled loot waits for space. Enemy coin feeds
retain priority; neither enters directly at the collection edge.

## Verification

With Node, Playwright, and Chromium installed, run `node tests/phase1.cjs`
`node tests/combat.cjs`, `node tests/waves.cjs`, and `node tests/loot.cjs`.
Set `CHROMIUM_PATH` if Chromium is not at `/usr/bin/chromium`. Tests cover
keyboard movement, facing, stopping, jump/landing, boundaries, multitouch, sliding between directions, and
cancellation, long holds without text selection, focus loss, knight-linked aiming, coin collection/reset/cap,
load-scaled jolts, edge spills, and layout at desktop and two portrait sizes.
Combat tests additionally cover blade facing and hits, cooldowns, body damage,
invulnerability, knockback, jump avoidance, idle defense, rewards and spending restrictions,
death restrictions, restart preserving the machine, touch combat/drop input,
and matching shared-loop outcomes at 30/60/120 render Hz.
Stage tests (`node tests/stages.cjs`, also run by tests/waves.cjs) cover
continuous spawning, token placement and collection, mixed enemy colors,
retained machine state, and desktop/mobile pause and resume.
Loot tests cover all scheduled types, entry, weighted pushes, friction,
non-overlap, full-cycle shelf carry, natural tipping, exactly-once collection,
identity events, notifications, every chest outcome, stored coins, restart
deduplication, and mixed-object simulation on phone-sized viewports.
Real iPhone/Safari testing remains manual.

## Implementation

Canvas rendering uses requestAnimationFrame and fixed 120 Hz physics steps.
A raised moving shelf feeds a lower deck. Quarters have height and thickness,
fall under gravity, land on other quarters, and form overlapping stacks.
Drops enter through a fixed rear slot. Resting coins grip the upper shelf
through both strokes. The fixed back wall compresses a crowded pile as the
shelf returns, while the forward face pushes the lower pile. Coins tumble
onto the lower deck only when contact pushes them past the shelf lip.
Stacks can be three quarters high. Each quarter adds one unit of weight to
its support chain. Collision impulses and separation use this combined mass,
and loaded bases have more sliding resistance. Resting layers follow their
base through shelf motion and contact pushes; the top coin can still be dislodged.
The same supported weight affects edge balance: rear weight can pin an
overhang, while forward weight can tip it. Removing or shifting a counterweight
releases the coin into a short tipping animation and then gravity.
A forward stroke that contacts the lower pile can produce one brief mechanical
bump, eased over 140 ms with a faint fading lip highlight. Its strength grows
quadratically with the connected pile's weight: one coin produces less than
1% of the maximum nudge, while
twelve coins of supported weight reach the existing subtle maximum. It travels
through touching coins to the front edge and jolts the upper
lip above the contact columns. Edge coins can fall, and upper coins can tumble
onto the lower stacks; heavier piles resist the impulse. Disconnected coins
stay still, and the return stroke does not trigger a bump.
Dry friction stops loose coins, and resting stacks have no automatic drift.
Coins that cross the lower front lip fall into the collection tray. The mechanical
pusher oscillates continuously. Active coins are capped at 180 to bound mobile
CPU use; elapsed time is discarded when returning from a hidden tab.
Native buttons support touch, mouse, and keyboard input.

Movement buttons are 58px tall and use nearly the full available width.
The knight jumps about 18% higher; slime spawns are three seconds apart.
The wave HUD reserves a fixed height so quiet-period text cannot shift controls.
Run `node tests/tuning.cjs` to verify initial potion settling and HUD stability.

## Temporary combat boosts (Phase 6)

Every slime still guarantees one physical machine coin. Independently, a
configurable 15% roll creates one stationary glowing walkway pickup at the
slime's death position. These pickups never join the machine body list or
physical-loot collection list. Contact activates a pickup; uncollected pickups
expire after 12 seconds of gameplay time.

Power Sword (†, gold) doubles sword damage for 15 seconds, defeating current
2-HP slimes in one hit while retaining normal blade size and collision reach. Speed Boost (», green) increases horizontal speed by 50% for
15 seconds without changing jump or gravity. Shield Boost (◇, blue) blocks
enemy contact damage for 10 seconds and outlines the knight. Only one boost
is active: another type replaces it, while the same type refreshes its duration.
The compact stage HUD shows its icon and remaining seconds.

`powerups.js` owns chance, type definitions, durations, the replace/refresh
policy, collection, and walkway rendering. Combat owns death guards and calls
it after the guaranteed coin reward. Pause freezes pickup glow, lifetimes,
collection, and active timers. Stage transitions preserve boosts. Death stops
their clocks and disables all effects; restart removes pickups and boosts and
restores base stats. No permanent equipment or inventory systems are added.

Run `node tests/powerups.cjs` for deterministic probability, reward uniqueness,
collection, one-hit sword kills, speed/shield effects, expiry, replacement,
refresh, pause, stage persistence, and death/restart checks across phone and
desktop viewport sizes. Existing combat regression tests disable random drops
to keep their baseline comparisons deterministic. Real iPhone testing remains
manual.

## Run loot rewards and potions (Phase 7)

`progression.js` owns current-run rewards, applied by the existing guarded
physical collection pipeline. Items must cross the collection edge and finish
falling before rewards apply. Chests choose one reward from the existing table
and use the same potion/sword/armor handlers. IDs prevent duplicate payouts.
Loot definitions, weights, artwork, placement schedule, and physics are unchanged.

Potions store up to three. Tap the 56×44px flask button beside the hearts, or
press H, to consume one and restore one missing heart. Full health, zero potions,
pause, or death prevent use. Excess potions convert into three stored coins.

Each sword adds exactly 10% of the original 13-unit reach, for levels 0–5:
13, 14.3, 15.6, 16.9, 18.2, and 19.5. Visual blade and hitbox use the same value.
Extra swords at level five grant five stored coins and a maximum-level notice.
The existing Power Sword temporary boost still doubles damage, not reach.
Temporary reach multipliers, if configured later, multiply the upgraded base
without changing the permanent level; expiration restores that upgraded base.

Armor stores up to three charges. One charge absorbs a contact hit and triggers
the normal invulnerability/knockback timing. A temporary Shield takes priority
without consuming armor. Extra armor grants five stored coins. The compact HUD
shows potion quantity, armor charges, and sword level without an inventory menu.

Stage transitions retain run rewards. Combat Restart resets sword level, armor,
and potions, clears temporary boosts separately, and restores hearts; machine
coins, stored balance, and existing loot/stage restart rules remain as before.
The separate machine reset does not reset combat upgrades. No cross-run save,
shop, spending, potion inventory screen, or new loot types are implemented.

Run `node tests/progression.cjs` for physical reward boundaries, additive reach
and caps, overflow conversions, chest routing/duplication, temporary-boost
compatibility, armor/shield precedence, pause, restart, and real touch/H potion
activation at phone and desktop sizes. Existing movement, combat, power-up,
stage, loot-physics, and layout suites also remain available. Real iPhone/Safari
verification remains manual.

Boost rolls are now eligible only when no boost is active and no uncollected
walkway pickup exists. Multiple enemy deaths in one step cannot create two
pickups. Expiry or collection removes the waiting pickup; active boosts must
expire before further rolls become eligible. The 15% chance applies to eligible
deaths; the guaranteed physical coin reward is unchanged.

## Stage 1 wandering slimes

Stage 1 now uses horizontal patrols at the unchanged 77.5-unit speed, with
random left/right entries every three seconds (12-enemy cap unchanged).
The existing safe-edge fallback still avoids spawning directly on the knight.
Patrol direction always points inward at entry, and reverses at the walkway
boundaries without automatically pausing. Player position or jumping never
changes patrol direction. Stage 2 and its fallback stages retain their purple
appearance and previous grounded pursuit/airborne direction behavior. Enemies
keep their assigned behavior across token transitions.

Each Stage 1 slime independently schedules an opportunity after 2–4 seconds.
A 15% successful check pauses voluntary movement for 0.4–1.2 seconds, then
resumes the same direction; failed checks schedule another opportunity. Idle
animation and combat remain active during these movement pauses. Sword-hit
recoil still applies. Game pause freezes all of these timers and movement.
The Stage 1 definition in `waves.js` contains the configurable movement and
pause settings; `Slime` keeps its own state/timer/random decisions.

`node tests/patrol.cjs` checks non-tracking, inward spawns, side distribution,
edge reversals, pause ranges/resumption/failures, independent timers, paused
combat, Stage 2 preservation, game pause, restart, coin rewards, and disabled
key spawning at phone and desktop sizes. Legacy combat fixtures use deterministic
sides and disabled random pauses for repeatable baseline assertions. Existing
movement, power-up, progression, stage, loot, and layout tests also pass.

## Manual coin dropping

DROP sits below the movement/jump controls and accepts a separate touch while
movement is held. F is the desktop shortcut; focused DROP also supports Space
and Enter. Pointer presses use pointer-down coordinates/time rather than waiting
for release. The shared knight/pusher horizontal coordinate system is used
one-to-one, clamped to the normal rear entry range. Vertical/jump position has
no effect on aiming. No separate aiming controls or cursor are added.

Each successful press spends exactly one stored coin and calls the unchanged
`spawnCoin(x)` used by enemy rewards. A full machine rejects the press without
spending or queuing a manual coin. `MANUAL_DROP_CONFIG.cooldown` defaults to
0.15 gameplay seconds; pause and game over prevent spending/spawning, and
pause freezes the cooldown. Restart clears cooldown while retaining the existing
stored balance and machine behavior. No manual inputs are queued or repeated.
The button dims for zero balance, cooldown, cap, pause, or death and updates
when collected coins become available. Enemy rewards and three-second spawning
are unchanged.

`node tests/manual-drop.cjs` covers paid drops, moving/jumping/clamped aiming,
zero balance, exact cooldown, pause/resume, full-machine rejection, restart,
real multi-touch movement/drop, keyboard input, and no hold repeat at phone and
desktop sizes. Existing physics tests cover the same coin bodies pushing loot
and NEXT WAVE tokens. Real iPhone testing remains manual.

## Current slime tiers

Stage 1 keeps its lavender appearance and now has 1 HP (one normal sword hit).
Stage 2 is green (#65c67b), has 2 HP, and copies Stage 1's patrol, random-side
spawns, independent pause pattern, speed, and three-second interval. Stage 3+
uses this Stage 2 fallback. Already-spawned slimes retain their assigned stats
and appearance across transitions. Power Sword still deals two damage, so it
can defeat Stage 2 slimes in one hit. Hit cooldowns and rewards are unchanged.

## Enemy loot, blue hoppers, and randomized starts

Each defeated slime still guarantees one rear-entry coin. A separate mutually
exclusive roll uses `ENEMY_LOOT_CHANCES`: potion 4%, armor 3%, sword 2%, chest 1%,
and nothing 90%. The existing enemy death guard covers both rewards. Walkway
boost rolls remain independent. Enemy loot records the death x, clamps for its
own radius, and enters from above the upper rear slot using the existing loot
body definitions. If a coin/body occupies the entry, it waits for clearance;
the shared 180-body limit is preserved and no old loot is deleted.

Current stage colors follow the latest specification: Stage 1 green (1 HP),
Stage 2 purple (2 HP), and Stage 3 blue (2 HP). Stages 1 and 2 retain their
patrol/pause behavior and three-second interval. Stage 3 selects regular and
hopping blue slimes equally. Later counters safely reuse Stage 3, with no new
stages designed. Old enemies retain their own configuration across transitions.

Hoppers have independent 3–6-second gameplay timers. A 0.2-second compression
precedes a roughly 49-unit hop. During preparation they stop voluntary movement;
in the air they keep patrolling horizontally, freeze random-pause opportunities,
and remain vulnerable through height-aware body/sword hitboxes. They land before
scheduling another hop. Pause freezes wind-up, vertical motion, and hop timers.

Starting potion, sword, armor, and chest are randomly positioned and supported
on the lower deck with spacing from each other, coins, walls, edge, and the
reserved progression-token area. Initial coin filling leaves their footprints
clear. On combat restart, only old starting items are replaced; ordinary coins,
enemy loot, stored balance, and normal machine motion remain intact. Four fresh
starting items receive new IDs and random safe placements. If a crowded machine
cannot fit them immediately, pending items retry every half gameplay second,
including former positions as safe fallback candidates. No overlaps are forced.
Keys remain disabled. Manual drop cost and cooldown are unchanged.

Run `node tests/hops-loot.cjs` for deterministic loot probabilities and variant
selection, guaranteed/duplicate rewards, upper entry, randomized supported
placements, restart quantities, hop wind-up/height/landing, airborne damage,
and pause across phone and desktop viewports. Existing regression suites remain
available; real iPhone/Safari testing is manual.

Replacement NEXT WAVE tokens now visibly fall from a configurable 85-unit
height onto the lower pile on stage changes. They no longer require a vacant
ground footprint, and get the first free physics slot ahead of queued rewards.
The 180-body cap still applies; full boards wait only until a slot opens.
Initial/reset tokens prefer the existing clear ground placement, with falling
entry as a safe fallback. Collection and duplicate-transition guards are unchanged.

## Lower-deck debris and clutter

`debris.js` extends the existing solver rather than running a separate physics
loop. Lower-deck starting coins and debris use random positions and rotations
with non-overlap checks and clearance for starting loot, the token pocket,
walls, and the collection lip. The upper shelf keeps its existing coin setup.
`CLUTTER_CONFIG` targets 30 lower coins and 9 debris, with one of each debris
type first and weighted remaining choices (bone 4, rock 2, wood 3). Placement
skips excess bodies if safe space runs out instead of forcing an overcrowded
layout; coins remain the most common objects. Four existing collectibles keep
their existing randomized safe placement and deferred-entry behavior.

Bones use a long narrow chamfered convex outline, 0.7 mass and 0.85 friction
factor; wood uses a long rectangular outline, mass 2 and factor 1.05; rocks use
an angular convex outline, mass 4.5 and factor 1.3. `DEBRIS_TYPES` holds geometry,
colors, mass, and resistance. Coins and existing loot retain their original
disc contacts, mass, appearance, entry, and rewards. Debris uses convex polygon
contacts against discs and polygons, with angular contact velocity, rotational
inertia, off-center impulse torque, and damped spin. Rotated extents constrain
walls and the pusher face; support checks use actual footprints. Convex pieces
can lodge between objects or span planar gaps; full deformable/3D bridging and
concave bone geometry are not simulated. Debris simply disappears at the normal
collection boundary without coin payouts or collection rewards.

All bodies still share gravity, the existing seven-pass contact solver, 120 Hz
updates, and 180-body cap. Polygon work is restricted to nearby pairs involving
debris; ordinary disc contacts use the original fast path. Combat restart
preserves existing clutter and coins, while machine reset/new page randomizes
the lower deck. No crafting, salvage, inventory, or extra rewards are added.

Run `node tests/debris.cjs` for randomized non-overlapping starts, thin plank
clearance, rotation-aware contacts, off-center torque, mass comparisons, barrier
blocking, no spontaneous drift, worthless collection, and sustained mixed-body
simulation at phone sizes. Existing movement, combat, loot, manual-drop, stage,
hopper, power-up, and progression suites remain applicable. Real iPhone/Safari
performance and long-session feel still need hands-on playtesting.

## Current enemy reward mix

Each enemy now drops exactly one pusher reward instead of a guaranteed coin
plus an optional item. `ENEMY_REWARDS` configures mutually exclusive outcomes:
bones 35%, wood 25%, rocks 15% (75% worthless trash total), coin 20%, potion 2%,
armor 1.5%, sword 1%, and chest 0.5% (5% items total). Every reward enters from
above at the enemy death x, clamped for its footprint, through the existing
spawn/physics system. Full or occupied entries defer rather than discard drops.
Debris still has no collection reward. Stored coins still increase only from
physical coin collection or existing loot/chest conversions. Independent
walkway combat boosts retain their chance and single-pickup/active-boost gates.

`node tests/enemy-rewards.cjs` checks deterministic distribution, each outcome,
exactly-once deaths, shared upper entry, full-machine queuing, and worthless
trash removal on phone viewports. Legacy reward/combat tests force the coin
outcome where necessary to isolate their existing assertions.
