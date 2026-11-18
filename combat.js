'use strict';
const COMBAT_CONFIG = {
  sword: { damage: 1, reach: 13, hitCooldown: .4 },
  player: { hearts: 3, invulnerability: 1, knockbackSpeed: 105, knockbackTime: .16 },
  slime: { health: 2, damage: 1, speed: 77.5, radius: 15, height: 32, recoilSpeed: 160, recoilTime: .22 },
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
  constructor(x, config, moveDirection = 0) {
    this.moveDirection = moveDirection;
    this.x = x; this.config = config; this.hp = config.health;
    this.hitTimer = 0; this.recoil = 0; this.direction = 0; this.age = 0;
  }
  box(floor) { return { x: this.x - this.config.radius, y: floor - this.config.height, w: this.config.radius * 2, h: this.config.height }; }
  update(dt, knight) {
    this.age += dt; this.hitTimer = Math.max(0, this.hitTimer - dt);
    const recoilStep = Math.min(dt, this.recoil);
    this.recoil = Math.max(0, this.recoil - dt);
    this.x += this.direction * this.config.recoilSpeed * recoilStep;
    // Commit to the last grounded pursuit direction throughout a jump.
    // Recoil remains independent and still works on airborne sword hits.
    if (knight.y >= knight.floor) this.moveDirection = Math.sign(knight.x - this.x);
    this.x += this.moveDirection * this.config.speed * (dt - recoilStep);
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
    ctx.fillStyle = this.hitTimer > 0 && Math.floor(this.hitTimer * 30) % 2 ? '#fff0cf' : (this.config.color || '#b17ed1');
    const radius = this.config.radius + squash;
    // A rectangular lower body sits flush on the walkway at every squash
    // phase; only the dome above it is rounded.
    ctx.fillRect(this.x - radius, floor - 14, radius * 2, 14);
    ctx.beginPath();
    ctx.ellipse(this.x, floor - 14, radius, this.config.height - 14 - squash, 0, Math.PI, Math.PI * 2);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#302638'; ctx.fillRect(this.x - 7, floor - 22, 3, 4); ctx.fillRect(this.x + 4, floor - 22, 3, 4);
  }
}

class DungeonCombat {
  constructor(knight, reward, onChange = () => {}, config = COMBAT_CONFIG) {
    this.knight = knight; this.reward = reward; this.onChange = onChange; this.config = config;
    this.health = new PlayerHealth(config.player); this.waves = new WaveManager();
    this.originalSwordReach=config.sword.reach;
    this.runLoot=new RunLoot(amount=>this.awardStoredCoins?.(amount));
    this.powerups=new CombatPowerups(knight,config.sword.reach);
    knight.drawEnemies = ctx => this.drawEnemies(ctx);
    this.restart();
  }
  restart() {
    const k = this.knight;
    this.runLoot.reset();
    this.powerups.normalReach=this.originalSwordReach;
    this.powerups.reset();
    this.health.reset(); this.enemies = []; this.effects = []; this.waves.reset();
    k.x = (k.left + k.right) / 2; k.y = k.floor; k.vy = 0; k.facing = 1;
    k.walk = 0; k.moving = false; k.disabled = false; k.damageAlpha = 1; k.clearInput();
    this.waves.update(0, (side,spec) => this.spawnEnemy(side,spec)); this.onChange(this);
  }
  swordBox() {
    const k = this.knight, reach = k.swordReach;
    return { x: k.facing > 0 ? k.x + 19 : k.x - 19 - reach, y: k.y - k.poseBob() - 27, w: reach, h: 3 };
  }
  bodyBox() { const k = this.knight; return { x: k.x - 10, y: k.y - 48 - k.poseBob(), w: 20, h: 48 }; }
  update(dt) {
    if (this.health.dead || this.knight.paused) return;
    const k = this.knight, h = this.health;
    this.powerups.normalReach=this.runLoot.reach(this.originalSwordReach);
    this.powerups.update(dt,this.bodyBox());
    h.update(dt);
    const shove = Math.min(dt, h.knockback); h.knockback = Math.max(0, h.knockback - dt);
    k.x = Math.max(k.left + 32, Math.min(k.right - 32, k.x + h.direction * this.config.player.knockbackSpeed * shove));
    for (const p of this.effects) { p.life -= dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 160 * dt; }
    this.effects = this.effects.filter(p => p.life > 0);
    this.waves.update(dt, (side,spec) => this.spawnEnemy(side,spec),this.enemies.length);
    // Every sword collision resolves before any body contact, including
    // when several enemies reach the knight in the same simulation step.
    for (const e of this.enemies) {
      e.update(dt, k);
      if (overlaps(this.swordBox(), e.box(k.floor))) e.hit(this.config.sword.damage * (k.swordDamageMultiplier || 1), k.facing, this.config.sword.hitCooldown);
      if (e.hp === 0) this.defeatEnemy(e);
    }
    this.enemies = this.enemies.filter(e => !e.defeated);
    for (const e of this.enemies) {
      if (!k.shielded && e.hitTimer <= 1e-8 && overlaps(this.bodyBox(), e.box(k.floor))) {
        if (this.contactDamage(e.config.damage, k.x >= e.x ? 1 : -1) && h.dead) {
          k.disabled = true; k.clearInput(); k.vy = 0;this.powerups.apply(false);
        }
      }
    }
    this.onChange(this);
    k.damageAlpha = h.invulnerable > 0 && Math.floor(h.invulnerable * 14) % 2 ? .3 : 1;
  }
  contactDamage(amount,direction){
    const h=this.health;
    if(this.knight.paused||this.knight.shielded||h.dead||h.invulnerable>1e-8)return false;
    if(this.runLoot.armor){this.runLoot.armor--;h.invulnerable=h.config.invulnerability;h.knockback=h.config.knockbackTime;h.direction=direction;return false;}
    return h.damage(amount,direction);
  }
  applyLoot(type){
    const message=this.runLoot.reward(type);
    this.powerups.normalReach=this.runLoot.reach(this.originalSwordReach);
    this.powerups.apply(!this.health.dead);this.onChange(this);return message;
  }
  spawnEnemy(side,spec=this.waves.definition.enemies[0]) {
    if(this.knight.paused)return;
    const k = this.knight, radius = this.config.slime.radius;
    let x = side > 0 ? k.right - radius : k.left + radius;
    if (Math.abs(x - k.x) < 110) x = x > (k.left + k.right) / 2 ? k.left + radius : k.right - radius;
    const config={...this.config.slime,...spec.modifiers,...spec.appearance};
    this.enemies.push(new Slime(x, config, Math.sign(k.x - x)));
  }
  defeatEnemy(e) {
    if (this.knight.paused || e.defeated || e.hp > 0) return;
    e.defeated = true;
    for (let i = 0; i < 7; i++) this.effects.push({ x: e.x, y: this.knight.floor - 16, vx: Math.cos(i * 2.4) * 38, vy: -30 - i * 5, life: .4 });
    this.reward(e.x);this.powerups.rollDrop(e.x);
  }
  drawEnemies(ctx) {
    this.powerups.draw(ctx);
    for (const e of this.enemies) e.draw(ctx, this.knight.floor);
    for (const p of this.effects) { ctx.globalAlpha = p.life / .4; ctx.fillStyle = '#d8a3ee'; ctx.fillRect(p.x, p.y, 3, 3); }
    ctx.globalAlpha = 1;
  }
}
