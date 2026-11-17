'use strict';
const WAVE_CONFIG = { firstCount: 3, maxCount: 12, spawnInterval: 2, quietDuration: 10 };

// Scheduling only: enemy behavior, damage, and coin rewards belong elsewhere.
class WaveManager {
  constructor(config = WAVE_CONFIG) { this.config = config; this.reset(); }
  reset() { this.wave = 1; this.side = 1; this.begin(); }
  begin() {
    this.total = Math.min(this.config.maxCount, this.config.firstCount + this.wave - 1);
    this.spawned = 0; this.defeated = 0; this.timer = 0; this.state = 'active';
  }
  get remaining() { return this.total - this.defeated; }
  update(dt, spawn) {
    if (this.state === 'quiet') {
      this.timer = Math.max(0, this.timer - dt);
      if (this.timer > 1e-8) return;
      this.wave++; this.begin();
      // Start the next wave immediately, without carrying quiet time into it.
      dt = 0;
    }
    this.timer -= dt;
    while (this.spawned < this.total && this.timer <= 1e-8) {
      spawn(this.side); this.side *= -1; this.spawned++;
      this.timer += this.config.spawnInterval;
    }
  }
  defeatedEnemy() {
    this.defeated++;
    if (this.spawned === this.total && this.defeated === this.total) {
      this.state = 'quiet'; this.timer = this.config.quietDuration;
    }
  }
}
