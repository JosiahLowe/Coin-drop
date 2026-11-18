# COIN DROP

A mobile-friendly top-down coin pusher built with plain HTML, CSS, and JavaScript.
A separate side-view dungeon walkway sits above the machine.
No runtime dependencies, external assets, or build step.

## Play

Open `index.html` in a modern browser, including Safari on iPhone. Play starts
automatically. Defeat slimes to feed one physical coin into the rear slot beneath
each slime's death position. Position kills to work different parts of the pile.
Enemy deaths do not award wallet coins. Machine collections add one coin to the
existing COINS balance, which starts at zero. Stored coins are not spendable in Phase 5A. The existing manual-drop code
is retained behind a disabled flag, and its button is hidden.

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
without changing coin size, the pusher stroke, or the physics rules. Manual input is disabled for Phase 5A. Reset refills
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
There are no wave counts, completion timers, or quiet periods. Loot's existing
1/3/5/7/9 schedule now observes stage starts and retains its restart ledger.

The compact pause button, P, or Escape pauses the whole shared fixed-step loop.
The PAUSED overlay offers touch/click Resume. Inputs are cleared on both pause
and resume, and the wall-clock baseline is discarded so nothing catches up.
Machine physics, combat, spawning, tokens, effects and notification clocks freeze.
Combat restart clears pause, restores Stage 1 and health, clears enemies, replaces
all old tokens with one fresh token, and preserves all other machine/loot state.

## Physical loot (Phase 5A)

The configurable schedule in `loot.js` feeds a Health Potion on Wave 1, Iron
Sword on Wave 3, Leather Armor on Wave 5, Treasure Chest on Wave 7, and Rusty
Key on Wave 9. For testing, they drop from a height of 15 onto the lower deck, one item
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
do not cover the machine. No full inventory, use, equipping, or key effects exist.

A collected chest records one nested reward with its own identity: a potion,
sword, armor, or five stored coins, chosen from `CHEST_REWARDS`. Item rewards
are recorded rather than equipped or spawned back into the machine. Chest
collection is guarded by ID so it cannot reroll or pay twice.

Combat restart preserves physical loot, pending loot, collection records, and
the wave ledger. Each scheduled wave drops loot only once per page session,
including across repeated Wave 1 restarts. The separate machine reset discards
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
