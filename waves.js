'use strict';
const STAGE_DEFINITIONS = {
  1:{spawnInterval:3,maxEnemies:12,enemies:[{type:'slime',probability:1,appearance:{},modifiers:{}}]},
  2:{spawnInterval:3,maxEnemies:12,enemies:[{type:'slime',probability:1,appearance:{color:'#8d43ec'},modifiers:{}}]}
};
class WaveManager {
  constructor(){this.reset();}
  reset(){this.wave=1;this.side=1;this.timer=0;this.spawned=0;}
  get definition(){return STAGE_DEFINITIONS[this.wave]||STAGE_DEFINITIONS[2];}
  advance(){this.wave++;} // Preserve the current spawn clock and side.
  update(dt,spawn,active=0){
    this.timer=Math.max(0,this.timer-dt);
    if(this.timer>1e-8||active>=this.definition.maxEnemies)return;
    const choices=this.definition.enemies,total=choices.reduce((s,e)=>s+e.probability,0);
    let roll=Math.random()*total,choice=choices[choices.length-1];
    for(const candidate of choices){roll-=candidate.probability;if(roll<0){choice=candidate;break;}}
    spawn(this.side,choice);this.side*=-1;this.spawned++;this.timer=this.definition.spawnInterval;
  }
}
