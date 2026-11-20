'use strict';
const STAGE_DEFINITIONS = {
  1:{spawnInterval:3,maxEnemies:12,randomSides:true,enemies:[{type:'slime',probability:1,appearance:{color:'#65c67b'},modifiers:{health:1,movement:'patrol',patrolPause:{minDuration:.4,maxDuration:1.2,minInterval:2,maxInterval:4,chance:.15}}}]},
  2:{spawnInterval:3,maxEnemies:12,randomSides:true,enemies:[{type:'slime',probability:1,appearance:{color:'#8d43ec'},modifiers:{health:2,movement:'patrol',patrolPause:{minDuration:.4,maxDuration:1.2,minInterval:2,maxInterval:4,chance:.15}}}]}
};
STAGE_DEFINITIONS[3]={spawnInterval:3,maxEnemies:12,randomSides:true,enemies:[
 {...STAGE_DEFINITIONS[2].enemies[0],probability:.5,appearance:{color:'#68bfff'}},
 {...STAGE_DEFINITIONS[2].enemies[0],probability:.5,appearance:{color:'#68bfff'},modifiers:{...STAGE_DEFINITIONS[2].enemies[0].modifiers,hop:{minInterval:3,maxInterval:6,prepare:.2,velocity:280,gravity:800}}}
]};
// One ceiling visitor in Stage 2, alongside the unchanged slime schedule.
STAGE_DEFINITIONS[2].introEnemies=[{type:'bat'}];
class WaveManager {
  constructor(){this.reset();}
  reset(){this.wave=1;this.side=1;this.timer=0;this.spawned=0;this.introduced=new Set();}
  get definition(){return STAGE_DEFINITIONS[this.wave]||STAGE_DEFINITIONS[3];}
  advance(){this.wave++;} // Preserve the current spawn clock and side.
  update(dt,spawn,active=0){
    if(!this.introduced.has(this.wave)){this.introduced.add(this.wave);for(const spec of this.definition.introEnemies||[])spawn(Math.random()<.5?-1:1,spec);}
    this.timer=Math.max(0,this.timer-dt);
    if(this.timer>1e-8||active>=this.definition.maxEnemies)return;
    const choices=this.definition.enemies,total=choices.reduce((s,e)=>s+e.probability,0);
    let roll=Math.random()*total,choice=choices[choices.length-1];
    for(const candidate of choices){roll-=candidate.probability;if(roll<0){choice=candidate;break;}}
    spawn(this.definition.randomSides?(Math.random()<.5?-1:1):this.side,choice);this.side*=-1;this.spawned++;this.timer=this.definition.spawnInterval;
  }
}
