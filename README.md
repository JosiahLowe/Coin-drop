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
Coins fall onto the deck, collide, and slide with friction. Coins that cross the
front lip fall into the collection tray under gravity. The mechanical
pusher oscillates continuously. Active coins are capped at 180 to bound mobile
CPU use; elapsed time is discarded when returning from a hidden tab.
Native buttons support touch, mouse, and keyboard input.
