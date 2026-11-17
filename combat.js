'use strict';
const COMBAT_CONFIG = {
  sword: { damage: 1, reach: 13, hitCooldown: .4 },
  player: { hearts: 3, invulnerability: 1, knockbackSpeed: 105, knockbackTime: .16 },
  slime: { health: 2, damage: 1, speed: 77.5, radius: 15, height: 32, recoilSpeed: 95, recoilTime: .18 },
  spawnDelay: 3, reward: 3
};
const overlaps = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;

class PlayerHealth {
  constructor(config) { this.config = config; this.reset(); }
  reset() { this.hearts = this.config.hearts; this.invulnerable = 0; this.knockback = 0; this.direction = 0; }
  get dead() { return this.hearts === 0; }
  update(dt) { this.invulnerable = Math.max(0, this.invulnerable - dt); }
  damage(amount, direction) {
    if (this.dead || this.invulnerable > 1e-8) return false;
    this.hearts = Math.max(0, this.hearts - amount);
    this.invulnerable = this.config.invulnerability;
    this.knockback = this.config.knockbackTime; this.direction = direction;
    return true;
  }
}

class Slime {
  constructor(x, config) {
    this.x = x; this.config = config; this.hp = config.health;
    this.hitTimer = 0; this.recoil = 0; this.direction = 0; this.age = 0;
  }
  box(floor) { return { x: this.x - this.config.radius, y: floor - this.config.height, w: this.config.radius * 2, h: this.config.height }; }
  update(dt, knight) {
    this.age += dt; this.hitTimer = Math.max(0, this.hitTimer - dt);
    const recoilStep = Math.min(dt, this.recoil);
    this.recoil = Math.max(0, this.recoil - dt);
    this.x += this.direction * this.config.recoilSpeed * recoilStep;
    this.x += Math.sign(knight.x - this.x) * this.config.speed * (dt - recoilStep);
    this.x = Math.max(knight.left + this.config.radius, Math.min(knight.right - this.config.radius, this.x));
  }
  hit(damage, direction, cooldown) {
    if (this.hitTimer > 1e-8 || this.hp <= 0) return false;
    this.hp = Math.max(0, this.hp - damage); this.hitTimer = cooldown;
    this.direction = direction; this.recoil = this.config.recoilTime;
    return true;
  }
  draw(ctx, floor) {
    const squash = Math.sin(this.age * 10) * 1.5;
    ctx.fillStyle = this.hitTimer > 0 && Math.floor(this.hitTimer * 30) % 2 ? '#fff0cf' : '#b17ed1';
    ctx.beginPath(); ctx.ellipse(this.x, floor - this.config.height / 2, this.config.radius + squash, this.config.height / 2 - squash, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#302638'; ctx.fillRect(this.x - 7, floor - 22, 3, 4); ctx.fillRect(this.x + 4, floor - 22, 3, 4);
  }
}

// Temporary one-at-a-time spawning, replaceable independently of combat.
class SlimeSpawner {
  constructor(config) { this.config = config; this.reset(); }
  reset() { this.timer = 0; this.side = 1; }
  update(dt, active, knight) {
    if (active) return null;
    this.timer = Math.max(0, this.timer - dt);
    if (this.timer > 1e-8) return null;
    let x = this.side > 0 ? knight.right - this.config.slime.radius : knight.left + this.config.slime.radius;
    // If the knight is camping at the entry, use the opposite edge.
    if (Math.abs(x - knight.x) < 110) x = x > (knight.left + knight.right) / 2 ? knight.left + this.config.slime.radius : knight.right - this.config.slime.radius;
    this.side *= -1;
    return new Slime(x, this.config.slime);
  }
  defeated() { this.timer = this.config.spawnDelay; }
}

class DungeonCombat {
  constructor(knight, reward, onChange = () => {}, config = COMBAT_CONFIG) {
    this.knight = knight; this.reward = reward; this.onChange = onChange; this.config = config;
    this.health = new PlayerHealth(config.player); this.spawner = new SlimeSpawner(config);
    knight.swordReach = config.sword.reach;
    knight.drawEnemies = ctx => this.drawEnemies(ctx);
    this.restart();
  }
  restart() {
    const k = this.knight;
    this.health.reset(); this.enemy = null; this.effects = []; this.spawner.reset();
    k.x = (k.left + k.right) / 2; k.y = k.floor; k.vy = 0; k.facing = 1;
    k.walk = 0; k.moving = false; k.disabled = false; k.damageAlpha = 1; k.clearInput();
    this.enemy = this.spawner.update(0, false, k); this.onChange(this);
  }
  swordBox() {
    const k = this.knight, reach = this.config.sword.reach;
    return { x: k.facing > 0 ? k.x + 19 : k.x - 19 - reach, y: k.y - k.poseBob() - 27, w: reach, h: 3 };
  }
  bodyBox() { const k = this.knight; return { x: k.x - 10, y: k.y - 48 - k.poseBob(), w: 20, h: 48 }; }
  update(dt) {
    if (this.health.dead) return;
    const k = this.knight, h = this.health;
    h.update(dt);
    const shove = Math.min(dt, h.knockback); h.knockback = Math.max(0, h.knockback - dt);
    k.x = Math.max(k.left + 32, Math.min(k.right - 32, k.x + h.direction * this.config.player.knockbackSpeed * shove));
    for (const p of this.effects) { p.life -= dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 160 * dt; }
    this.effects = this.effects.filter(p => p.life > 0);
    this.enemy = this.enemy || this.spawner.update(dt, false, k);
    const e = this.enemy;
    if (e) {
      e.update(dt, k);
      // Resolve sword first. A struck enemy cannot hurt the player during
      // its hit cooldown, giving recoil time to separate the bodies.
      if (overlaps(this.swordBox(), e.box(k.floor))) e.hit(this.config.sword.damage, k.facing, this.config.sword.hitCooldown);
      if (e.hp === 0) this.defeatEnemy();
      else if (e.hitTimer <= 1e-8 && overlaps(this.bodyBox(), e.box(k.floor))) {
        if (h.damage(e.config.damage, k.x >= e.x ? 1 : -1)) {
          if (h.dead) { k.disabled = true; k.clearInput(); k.vy = 0; }
          this.onChange(this);
        }
      }
    }
    k.damageAlpha = h.invulnerable > 0 && Math.floor(h.invulnerable * 14) % 2 ? .3 : 1;
  }
  defeatEnemy() {
    const e = this.enemy;
    for (let i = 0; i < 7; i++) this.effects.push({ x: e.x, y: this.knight.floor - 16, vx: Math.cos(i * 2.4) * 38, vy: -30 - i * 5, life: .4 });
    this.enemy = null; this.spawner.defeated(); this.reward(this.config.reward);
  }
  drawEnemies(ctx) {
    if (this.enemy) this.enemy.draw(ctx, this.knight.floor);
    for (const p of this.effects) { ctx.globalAlpha = p.life / .4; ctx.fillStyle = '#d8a3ee'; ctx.fillRect(p.x, p.y, 3, 3); }
    ctx.globalAlpha = 1;
  }
}
