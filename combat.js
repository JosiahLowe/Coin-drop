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
  constructor(x, config, moveDirection = 0, random = Math.random) {
    this.config=config;this.random=random;this.movementState='MOVING';
    this.pauseTimer=config.movement==='patrol'?this.samplePause('Interval'):0;
    this.height=0;this.verticalSpeed=0;this.hopState='PATROLLING';
    this.hopTimer=config.hop?config.hop.minInterval+this.random()*(config.hop.maxInterval-config.hop.minInterval):0;
    this.moveDirection = moveDirection;
    this.x = x; this.config = config; this.hp = config.health;
    this.hitTimer = 0; this.recoil = 0; this.direction = 0; this.age = 0;
  }
  samplePause(kind){const p=this.config.patrolPause;return p['min'+kind]+this.random()*(p['max'+kind]-p['min'+kind]);}
  movingTime(dt){
    let moving=0,left=dt;
    while(left>1e-8){
      const step=Math.min(left,this.pauseTimer);if(this.movementState==='MOVING')moving+=step;
      left-=step;this.pauseTimer=Math.max(0,this.pauseTimer-step);
      if(this.pauseTimer<=1e-8){
        if(this.movementState==='PAUSED'){this.movementState='MOVING';this.pauseTimer=this.samplePause('Interval');}
        else if(this.random()<this.config.patrolPause.chance){this.movementState='PAUSED';this.pauseTimer=this.samplePause('Duration');}
        else this.pauseTimer=this.samplePause('Interval');
      }
    }
    return moving;
  }
  box(floor) { const preparing=this.hopState==='PREPARING_TO_JUMP',r=this.config.radius*(preparing?1.12:1),h=this.config.height*(preparing?.78:1);return {x:this.x-r,y:floor-this.height-h,w:r*2,h}; }
  update(dt, knight) {
    this.updateHop(dt);
    this.age += dt; this.hitTimer = Math.max(0, this.hitTimer - dt);
    const recoilStep = Math.min(dt, this.recoil);
    this.recoil = Math.max(0, this.recoil - dt);
    this.x += this.direction * this.config.recoilSpeed * recoilStep;
    // Commit to the last grounded pursuit direction throughout a jump.
    // Recoil remains independent and still works on airborne sword hits.
    const patrol=this.config.movement==='patrol';
    if (!patrol && knight.y >= knight.floor) this.moveDirection = Math.sign(knight.x - this.x);
    const hopMoving=this.config.hop&&this.hopState==='JUMPING';
    const preparing=this.config.hop&&this.hopState==='PREPARING_TO_JUMP';
    const moving=preparing?0:hopMoving?dt-recoilStep:patrol?Math.max(0,this.movingTime(dt)-recoilStep):dt-recoilStep;
    this.x += this.moveDirection * this.config.speed * moving;
    this.x = Math.max(knight.left + this.config.radius, Math.min(knight.right - this.config.radius, this.x));
    if(patrol){if(this.x<=knight.left+this.config.radius)this.moveDirection=1;else if(this.x>=knight.right-this.config.radius)this.moveDirection=-1;}
  }
  updateHop(dt){
    const cfg=this.config.hop;if(!cfg)return;
    if(this.hopState==='JUMPING'){
      this.height+=this.verticalSpeed*dt-.5*cfg.gravity*dt*dt;this.verticalSpeed-=cfg.gravity*dt;
      if(this.height<=0){this.height=0;this.verticalSpeed=0;this.hopState='PATROLLING';this.hopTimer=cfg.minInterval+this.random()*(cfg.maxInterval-cfg.minInterval);}
      return;
    }
    if(this.hopState==='PREPARING_TO_JUMP'){
      this.hopTimer-=dt;if(this.hopTimer<=1e-8){this.hopState='JUMPING';this.verticalSpeed=cfg.velocity;}return;
    }
    this.hopTimer=Math.max(0,this.hopTimer-dt);
    if(this.hopTimer<=1e-8&&this.movementState==='MOVING'){this.hopState='PREPARING_TO_JUMP';this.hopTimer=cfg.prepare;}
  }
  hit(damage, direction, cooldown) {
    if (this.hitTimer > 1e-8 || this.hp <= 0) return false;
    this.hp = Math.max(0, this.hp - damage); this.hitTimer = cooldown;
    this.direction = direction; this.recoil = this.config.recoilTime;
    return true;
  }
  draw(ctx, floor) {
    ctx.save();ctx.translate(0,-this.height);
    if(this.hopState==='PREPARING_TO_JUMP'){ctx.translate(this.x,floor);ctx.scale(1.12,.78);ctx.translate(-this.x,-floor);}
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
    ctx.restore();
  }
}

class DungeonCombat {
  constructor(knight, reward, onChange = () => {}, config = COMBAT_CONFIG) {
    this.knight = knight; this.reward = reward; this.onChange = onChange; this.config = config;
    this.pendingRevengeEnemies=[];
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
    // Revenge enemies are extra threats; they do not consume normal spawn slots.
    while(this.pendingRevengeEnemies.length)this.spawnRevenge(this.pendingRevengeEnemies.shift());
    this.waves.update(dt, (side,spec) => this.spawnEnemy(side,spec),this.enemies.filter(e=>!e.revenge).length);
    // Every sword collision resolves before any body contact, including
    // when several enemies reach the knight in the same simulation step.
    for (const e of this.enemies) {
      e.update(dt, k);
      if (overlaps(this.swordBox(), e.box(k.floor))) e.hit(this.config.sword.damage * (k.swordDamageMultiplier || 1), k.facing, this.config.sword.hitCooldown);
      if (e.hp === 0) this.defeatEnemy(e);
    }
    this.enemies = this.enemies.filter(e => !e.defeated);
    for (const e of this.enemies) {
      if (e.hitTimer <= 1e-8 && overlaps(this.bodyBox(), e.box(k.floor))) {
        if (this.contactDamage(e.config.damage, k.x >= e.x ? 1 : -1, e) && h.dead) {
          k.disabled = true; k.clearInput(); k.vy = 0;this.powerups.apply(false);
        }
      }
    }
    this.onChange(this);
    k.damageAlpha = h.invulnerable > 0 && Math.floor(h.invulnerable * 14) % 2 ? .3 : 1;
  }
  contactDamage(amount,direction,attacker){
    const h=this.health;
    if(this.knight.paused||h.dead||h.invulnerable>1e-8)return false;
    // This hook runs only after the shared hit gate, including armor blocks.
    if(attacker)this.onValidHit?.(this.knight.x,{type:attacker.type||'slime',modifiers:structuredClone(attacker.config)});
    if(this.knight.shielded){h.invulnerable=h.config.invulnerability;return false;}
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
    const enemy=new Slime(x, config, (config.movement==='patrol'?(x<(k.left+k.right)/2?1:-1):Math.sign(k.x-x)));
    enemy.type=spec.type;this.enemies.push(enemy);return enemy;
  }
  spawnRevenge(spec){
    if(this.knight.paused||this.health.dead){this.pendingRevengeEnemies.push(structuredClone(spec));return;}
    const enemy=this.spawnEnemy(Math.random()<.5?-1:1,structuredClone(spec));
    enemy.revenge=true;return enemy;
  }
  defeatEnemy(e) {
    if (this.knight.paused || e.defeated || e.hp > 0) return;
    e.defeated = true;
    for (let i = 0; i < 7; i++) this.effects.push({ x: e.x, y: this.knight.floor - e.height - 16, vx: Math.cos(i * 2.4) * 38, vy: -30 - i * 5, life: .4 });
    this.reward(e.x);this.powerups.rollDrop(e.x);
  }
  drawEnemies(ctx) {
    this.powerups.draw(ctx);
    for (const e of this.enemies) e.draw(ctx, this.knight.floor);
    for (const p of this.effects) { ctx.globalAlpha = p.life / .4; ctx.fillStyle = '#d8a3ee'; ctx.fillRect(p.x, p.y, 3, 3); }
    ctx.globalAlpha = 1;
  }
}
