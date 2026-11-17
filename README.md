# COIN DROP

A mobile-friendly top-down coin pusher built with plain HTML, CSS, and JavaScript.
No dependencies, external assets, or build step.

## Play

Open `index.html` in a modern browser, including Safari on iPhone. Play starts
automatically. Tap **Drop Coin** to add a coin. Every coin that falls over the
bottom edge into the collection area earns one point. Tap **↺** to reset the
score and Used counter and restore the starting pile of 55 coins. The Used
counter tracks tokens you drop, excluding the starting pile. Coins are free.

For local HTTP hosting, run `python3 -m http.server 8000` in this directory
and open `http://localhost:8000`.

## Implementation

Canvas rendering uses requestAnimationFrame and fixed 120 Hz physics steps.
A raised moving shelf feeds a lower deck. Quarters have height and thickness,
fall under gravity, land on other quarters, and form overlapping stacks.
Drops enter through a fixed rear slot. Resting coins grip the upper shelf
through both strokes. The fixed back wall compresses a crowded pile as the
shelf returns, while the forward face pushes the lower pile. Coins tumble
onto the lower deck only when contact pushes them past the shelf lip.
Dry friction stops loose coins, and resting stacks have no automatic drift.
Coins that cross the lower front lip fall into the collection tray. The mechanical
pusher oscillates continuously. Active coins are capped at 180 to bound mobile
CPU use; elapsed time is discarded when returning from a hidden tab.
Native buttons support touch, mouse, and keyboard input.
