'use strict';
const POWERUP_CONFIG={dropChance:.15,groundLifetime:12,policy:'replace-refresh',types:{
  sword:{name:'Power Sword',icon:'†',color:'#ffe28a',duration:15,damageMultiplier:2},
  speed:{name:'Speed Boost',icon:'»',color:'#8af4b4',duration:15,speedMultiplier:1.5},
  shield:{name:'Shield Boost',icon:'◇',color:'#8adfff',duration:10}
}};
// Walkway pickups never enter the machine's body list or loot inventory.
class CombatPowerups {
  constructor(knight,normalReach,config=POWERUP_CONFIG,random=Math.random){
    this.knight=knight;this.normalReach=normalReach;this.config=config;this.random=random;this.reset();
  }
  reset(){this.pickups=[];this.active=null;this.age=0;this.apply(false);}
  apply(enabled=true){
    const type=enabled&&this.active?this.config.types[this.active.type]:null;
    this.knight.swordReach=this.normalReach*(type?.reachMultiplier||1);
    this.knight.swordDamageMultiplier=type?.damageMultiplier||1;
    this.knight.speedMultiplier=type?.speedMultiplier||1;
    this.knight.shielded=!!(enabled&&this.active?.type==='shield');
  }
  rollDrop(x){
    if(this.active||this.pickups.length||this.knight.paused||this.knight.disabled||this.random()>=this.config.dropChance)return;
    const types=Object.keys(this.config.types),type=types[Math.min(types.length-1,Math.floor(this.random()*types.length))];
    this.pickups.push({type,x:Math.max(this.knight.left+9,Math.min(this.knight.right-9,x)),y:this.knight.floor-10,remaining:this.config.groundLifetime});
  }
  activate(type){
    if(this.knight.paused||this.knight.disabled)return;
    // The policy is deliberately isolated here for later stacking experiments.
    if(this.config.policy!=='replace-refresh')throw Error('Unsupported boost policy');
    this.active={type,remaining:this.config.types[type].duration};this.apply();
  }
  update(dt,body){
    if(this.knight.paused||this.knight.disabled)return;
    this.age+=dt;
    if(this.active){this.active.remaining=Math.max(0,this.active.remaining-dt);if(this.active.remaining<=1e-8)this.active=null;}
    this.apply();
    this.pickups=this.pickups.filter(p=>{
      p.remaining-=dt;if(p.remaining<=1e-8)return false;
      if(body.x<p.x+9&&body.x+body.w>p.x-9&&body.y<p.y+9&&body.y+body.h>p.y-9){this.activate(p.type);return false;}
      return true;
    });
  }
  get label(){return this.active?this.config.types[this.active.type].icon+' '+Math.ceil(this.active.remaining)+'s':'';}
  draw(ctx){
    for(const p of this.pickups){const type=this.config.types[p.type];ctx.save();ctx.translate(p.x,p.y);ctx.shadowColor=type.color;ctx.shadowBlur=5+2*Math.sin(this.age*5);ctx.fillStyle='#15252a';ctx.strokeStyle=type.color;ctx.lineWidth=2;ctx.beginPath();ctx.arc(0,0,8,0,Math.PI*2);ctx.fill();ctx.stroke();ctx.shadowBlur=0;ctx.fillStyle=type.color;ctx.font='bold 13px sans-serif';ctx.textAlign='center';ctx.fillText(type.icon,0,4);ctx.restore();}
    if(this.knight.shielded){ctx.save();ctx.strokeStyle='#8adfff99';ctx.lineWidth=2;ctx.beginPath();ctx.ellipse(this.knight.x,this.knight.y-24,19,29,0,0,Math.PI*2);ctx.stroke();ctx.restore();}
  }
}
