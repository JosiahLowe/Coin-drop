# COIN DROP

A mobile-friendly side-view coin pusher built with plain HTML, CSS, and JavaScript.
No dependencies, external assets, or build step.

## Play

Open `index.html` in a modern browser, including Safari on iPhone. Play starts
automatically. Tap **Drop Coin** to add a coin. Every coin that falls over the
right edge into the collection area earns one point. Tap **↺** to reset the
score and restore the starting pile of 55 coins. Coins are free.

For local HTTP hosting, run `python3 -m http.server 8000` in this directory
and open `http://localhost:8000`.

## Implementation

Canvas rendering uses requestAnimationFrame and fixed 120 Hz physics steps.
Coins have gravity, circular collisions, friction, and stacking. The mechanical
pusher oscillates continuously. Active coins are capped at 180 to bound mobile
CPU use; elapsed time is discarded when returning from a hidden tab.
Native buttons support touch, mouse, and keyboard input.
