'use strict';
// Separate side-view movement. x shares the machine's horizontal units only;
// the game reads x for aiming; this module never changes coin physics.
class DungeonWalkway {
  constructor(canvas, left, right) {
    this.canvas = canvas; this.ctx = canvas.getContext('2d');
    this.left = left; this.right = right; this.floor = 122;
    this.x = (left + right) / 2; this.y = this.floor; this.vy = 0;
    this.facing = 1; this.walk = 0; this.moving = false;
    this.keys = new Set(); this.pointers = new Map(); this.jumpQueued = false;
    const actionFor = code => ({ArrowLeft:'left', KeyA:'left', ArrowRight:'right', KeyD:'right', Space:'jump', ArrowUp:'jump', KeyW:'jump'})[code];
    // Leave native form controls usable from the keyboard.
    const editing = target => target instanceof Element && target.matches('input, textarea, select, button, [contenteditable="true"]');
    window.addEventListener('keydown', e => {
      const action = actionFor(e.code);
      if (!action || editing(e.target) || e.altKey || e.ctrlKey || e.metaKey) return;
      e.preventDefault();
      if (!this.keys.has(e.code) && !e.repeat && action === 'jump') this.jumpQueued = true;
      this.keys.add(e.code);
    });
    window.addEventListener('keyup', e => { this.keys.delete(e.code); });
    this.buttons = [...document.querySelectorAll('[data-knight]')];
    const controls = document.querySelector('.knight-controls');
    // Safari needs prefixed CSS plus cancellation of native long-press
    // selection/callouts. Keep these guards confined to the game controls.
    for (const name of ['contextmenu', 'selectstart', 'dragstart', 'touchstart']) {
      controls.addEventListener(name, e => e.preventDefault(), { passive: false });
    }
    const releasePointer = e => { this.pointers.delete(e.pointerId); this.refreshButtons(); };
    window.addEventListener('pointermove', e => {
      if (!this.pointers.has(e.pointerId) || this.pointers.get(e.pointerId) === 'jump') return;
      e.preventDefault();
      // Capture keeps release reliable, so hit-test the finger's actual
      // location instead of using the originally captured button.
      const target = document.elementFromPoint(e.clientX, e.clientY)?.closest('[data-knight]');
      const action = target && controls.contains(target) && !target.disabled ? target.dataset.knight : null;
      this.pointers.set(e.pointerId, action === 'left' || action === 'right' ? action : null);
      this.refreshButtons();
    });
    window.addEventListener('pointerup', releasePointer);
    window.addEventListener('pointercancel', releasePointer);
    // Some touch browsers end a cancelled gesture without a matching
    // pointer release. Do not leave movement held after all fingers lift.
    for (const event of ['touchend', 'touchcancel']) window.addEventListener(event, e => {
      if (e.touches.length === 0) { this.pointers.clear(); this.refreshButtons(); }
    });
    for (const button of this.buttons) {
      button.addEventListener('pointerdown', e => {
        if (e.button !== 0) return;
        e.preventDefault();
        // Keep movement usable even if a browser declines capture; window
        // release handlers below still clear the pointer.
        try { button.setPointerCapture(e.pointerId); } catch {}
        const action = button.dataset.knight;
        this.pointers.set(e.pointerId, action);
        if (action === 'jump') this.jumpQueued = true;
        this.refreshButtons();
      });
      const release = e => { this.pointers.delete(e.pointerId); this.refreshButtons(); };
      for (const name of ['pointerup', 'pointercancel', 'lostpointercapture']) button.addEventListener(name, release);
      // Keyboard and assistive-technology activation of the visible controls.
      button.addEventListener('keydown', e => {
        if (!['Space', 'Enter'].includes(e.code)) return;
        e.preventDefault();
        const action = button.dataset.knight;
        if (!e.repeat && action === 'jump') this.jumpQueued = true;
        this.keys.add(action);
      });
      button.addEventListener('keyup', e => {
        if (['Space', 'Enter'].includes(e.code)) { e.preventDefault(); this.keys.delete(button.dataset.knight); }
      });
      button.addEventListener('blur', () => this.keys.delete(button.dataset.knight));
      button.addEventListener('click', e => {
        if (e.detail === 0 && button.dataset.knight === 'jump') this.jumpQueued = true;
      });
    }
    window.addEventListener('blur', () => this.clearInput());
    this.actionFor = actionFor;
  }
  refreshButtons() {
    for (const button of this.buttons) button.setAttribute('aria-pressed', String([...this.pointers.values()].includes(button.dataset.knight)));
  }
  clearInput() { this.keys.clear(); this.pointers.clear(); this.jumpQueued = false; this.refreshButtons(); }
  poseBob() { return this.y < this.floor ? -1 : Math.abs(Math.sin(this.walk)) * 1.5; }
  update(dt) {
    if (this.disabled) { this.clearInput(); return; }
    const actions = new Set([...this.keys].map(key => this.actionFor(key) || key).concat([...this.pointers.values()]));
    const direction = Number(actions.has('right')) - Number(actions.has('left'));
    if (direction) this.facing = direction;
    const previousX = this.x;
    // Leave room for the extended sword as well as the knight's body.
    this.x = Math.max(this.left + 32, Math.min(this.right - 32, this.x + direction * 155 * dt));
    this.moving = this.x !== previousX;
    if (this.jumpQueued && this.y === this.floor) this.vy = -285;
    this.jumpQueued = false;
    this.vy += 800 * dt; this.y += this.vy * dt;
    if (this.y >= this.floor) { this.y = this.floor; this.vy = 0; }
    if (this.moving && this.y === this.floor) this.walk += dt * 15;
    else this.walk = 0;
  }
  draw() {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, 460, 150);
    ctx.fillStyle = '#15151d'; ctx.fillRect(0, 0, 460, 150);
    ctx.strokeStyle = '#252530'; ctx.lineWidth = 1;
    for (let row = 0; row < 4; row++) {
      const y = row * 32;
      ctx.beginPath(); ctx.moveTo(this.left, y); ctx.lineTo(this.right, y); ctx.stroke();
      for (let x = this.left + (row % 2 ? 28 : 0); x < this.right; x += 56) {
        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y + 32); ctx.stroke();
      }
    }
    ctx.fillStyle = '#54535c'; ctx.fillRect(this.left, this.floor, this.right - this.left, 20);
    ctx.fillStyle = '#96909a'; ctx.fillRect(this.left, this.floor, this.right - this.left, 3);
    ctx.fillStyle = '#30303b';
    for (let x = this.left + 30; x < this.right; x += 40) ctx.fillRect(x, this.floor + 4, 2, 16);
    this.drawEnemies?.(ctx);
    ctx.save(); ctx.globalAlpha = this.damageAlpha ?? 1; ctx.translate(this.x, this.y); ctx.scale(this.facing, 1);
    const airborne = this.y < this.floor;
    const stride = airborne ? 3 : Math.sin(this.walk) * 4;
    ctx.fillStyle = '#653d54'; ctx.fillRect(-13, -32, 10, 24); // cloak
    ctx.fillStyle = '#777f93'; ctx.fillRect(-8, -16, 6, 12 - stride); ctx.fillRect(3, -16, 6, 12 + stride);
    ctx.fillStyle = '#30303c'; ctx.fillRect(-10, -5 - stride, 10, 5); ctx.fillRect(2, -5 + stride, 11, 5);
    const bob = this.poseBob();
    ctx.translate(0, -bob);
    ctx.fillStyle = '#a4adbc'; ctx.fillRect(-10, -33, 20, 19); // torso
    ctx.fillStyle = '#e2bb6c'; ctx.fillRect(-10, -18, 20, 3);
    ctx.fillStyle = '#d7b99a'; ctx.fillRect(-6, -44, 13, 12); // head
    ctx.fillStyle = '#b6bfce'; ctx.fillRect(-9, -48, 18, 13); // helmet
    ctx.fillStyle = '#252735'; ctx.fillRect(1, -42, 9, 3); // visor points forward
    ctx.fillStyle = '#d3dbea'; ctx.fillRect(8, -29, 10, 6); ctx.fillRect(19, -27, this.swordReach ?? 13, 3); // arm and sword
    ctx.fillStyle = '#e2bb6c'; ctx.fillRect(17, -31, 3, 11); // sword guard
    ctx.restore();
  }
}
