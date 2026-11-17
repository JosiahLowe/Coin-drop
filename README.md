# COIN DROP

A mobile-friendly top-down coin pusher built with plain HTML, CSS, and JavaScript.
A separate side-view dungeon walkway sits above the machine.
No runtime dependencies, external assets, or build step.

## Play

Open `index.html` in a modern browser, including Safari on iPhone. Play starts
automatically. Move the knight left or right to choose the drop position,
then tap **Drop Coin** to add a coin at the highlighted marker. Every coin that falls over the
bottom edge into the collection area earns one point. Tap **↺** to reset the
score and Used counter and refill both surfaces with 164 coins in close-packed rows and small stacks. The Used
counter tracks tokens you drop, excluding the starting pile. Reset keeps the aim aligned with the knight. Coins are free.

For local HTTP hosting, run `python3 -m http.server 8000` in this directory
and open `http://localhost:8000`.

## Dungeon walkway (Phase 1)

Move the knight with **Left / A** and **Right / D**, and jump with
**Space / Up / W**. The visible direction buttons support holding and can be
used together with Jump on touchscreens. Release to stop; jumping requires a
new press after landing. Switching away clears held controls.

The geometric knight has a helmet, a walking stride, a jumping pose, and an
extended decorative sword. The stone walkway shares the machine's horizontal
bounds, but `knight.js` owns its movement and gravity. Both canvases use the
same animation loop. The coin aimer follows the knight’s horizontal position directly; jumping
does not change the aim. The movement controls sit above the machine where
the aim slider used to be. The Drop Coin button still spawns coins. Reset refills
the coin machine and does not reposition the knight.

No enemies, combat, health, inventory, drops, or progression are implemented.

## Verification

With Node, Playwright, and Chromium installed, run `node tests/phase1.cjs`.
Set `CHROMIUM_PATH` if Chromium is not at `/usr/bin/chromium`. Tests cover
keyboard movement, facing, stopping, jump/landing, boundaries, multitouch and
cancellation, long holds without text selection, focus loss, knight-linked aiming, coin collection/reset/cap,
load-scaled jolts, edge spills, and layout at desktop and two portrait sizes.
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
