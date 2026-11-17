'use strict';
// The existing engine resolves discs. Enclosing-circle proxies keep every
// icon inside its solid footprint without introducing a second solver.
const LOOT_TYPES = {
  potion: { name:'Health Potion', width:22, height:28, mass:1.2, friction:1, shape:'circle', color:'#f17a95' },
  sword: { name:'Iron Sword', width:22, height:38, mass:2.5, friction:1.1, shape:'circle', color:'#c9e2ef' },
  armor: { name:'Leather Armor', width:32, height:30, mass:3, friction:1.2, shape:'circle', color:'#c99465' },
  chest: { name:'Treasure Chest', width:34, height:28, mass:5, friction:1.4, shape:'circle', color:'#e6bc60' },
  key: { name:'Rusty Key', width:20, height:30, mass:1.1, friction:1, shape:'circle', color:'#daab79' }
};
const LOOT_SCHEDULE = {1:'potion',3:'sword',5:'armor',7:'chest',9:'key'};
const CHEST_REWARDS = [{type:'potion'},{type:'sword'},{type:'armor'},{type:'coins',amount:5}];
class PhysicalLoot {
  constructor(notify, awardCoins, random = Math.random) {
    this.notify=notify; this.awardCoins=awardCoins; this.random=random;
    this.seenWaves=new Set(); this.collectedIds=new Set(); this.collection=[];
    this.pending=[]; this.nextId=1; this.messages=[]; this.messageTime=0; this.currentMessage='';
  }
  observeWave(wave) {
    if(this.seenWaves.has(wave))return;
    this.seenWaves.add(wave);
    const type=LOOT_SCHEDULE[wave];
    if(type)this.pending.push({id:'loot-'+this.nextId++,type,lane:((wave+1)/2%3+1)/4});
  }
  collect(body) {
    if(!body.falling || !body.loot || this.collectedIds.has(body.id))return;
    this.collectedIds.add(body.id);
    const event={id:body.id,type:body.loot};
    let message='Collected '+LOOT_TYPES[body.loot].name;
    if(body.loot==='chest'){
      const choice=CHEST_REWARDS[Math.min(CHEST_REWARDS.length-1,Math.floor(this.random()*CHEST_REWARDS.length))];
      event.reward={...choice,id:body.id+':reward'};
      if(choice.type==='coins')this.awardCoins(choice.amount);
      message='Chest: '+(choice.type==='coins'?choice.amount+' stored coins':LOOT_TYPES[choice.type].name);
    }
    this.collection.push(event);
    window.dispatchEvent(new CustomEvent('loot-collected',{detail:structuredClone(event)}));
    this.messages.push(message);this.update(0);
  }
  update(dt) {
    this.messageTime=Math.max(0,this.messageTime-dt);
    if(!this.messageTime){
      const message=this.messages.shift()||'';
      if(message!==this.currentMessage){this.notify(message);this.currentMessage=message;}
      if(message)this.messageTime=3;
    }
  }
}
function drawLoot(ctx,c) {
  const d=LOOT_TYPES[c.loot],w=d.width,h=d.height;
  ctx.save();ctx.translate(c.x,c.y-Math.max(0,c.z)*.38);
  if(c.tip)ctx.scale(1,Math.max(.25,Math.cos(c.tip*1.25)));
  if(c.falling){const scale=Math.max(.3,1+c.z/100);ctx.scale(scale,scale);ctx.globalAlpha=Math.max(0,1+c.z/80);}
  ctx.fillStyle='#101c17';ctx.strokeStyle=d.color;ctx.lineWidth=2;
  ctx.beginPath();ctx.arc(0,0,c.radius-1,0,Math.PI*2);ctx.fill();ctx.stroke();
  ctx.fillStyle=d.color;ctx.lineJoin='round';
  if(c.loot==='potion'){
    ctx.fillRect(-w*.18,-h*.5,w*.36,h*.24);ctx.beginPath();ctx.ellipse(0,3,w*.4,h*.35,0,0,Math.PI*2);ctx.fill();
    ctx.fillStyle='#ffe5e9';ctx.fillRect(-2,0,4,10);ctx.fillRect(-5,3,10,4);
  }else if(c.loot==='sword'){
    ctx.fillRect(-3,-h/2,6,h*.7);ctx.fillStyle='#e8be6b';ctx.fillRect(-w/2,h*.15,w,4);ctx.fillRect(-2,h*.2,4,h*.3);
  }else if(c.loot==='armor'){
    ctx.beginPath();ctx.moveTo(-6,-h/2);ctx.lineTo(-w/2,-h/4);ctx.lineTo(-w/3,0);ctx.lineTo(-8,-3);ctx.lineTo(-8,h/2);ctx.lineTo(8,h/2);ctx.lineTo(8,-3);ctx.lineTo(w/3,0);ctx.lineTo(w/2,-h/4);ctx.lineTo(6,-h/2);ctx.closePath();ctx.fill();
    ctx.strokeStyle='#67442f';ctx.beginPath();ctx.moveTo(0,-10);ctx.lineTo(0,12);ctx.stroke();
  }else if(c.loot==='chest'){
    ctx.fillRect(-w/2,-h/2,w,h);ctx.fillStyle='#80582e';ctx.fillRect(-w/2,-2,w,3);ctx.fillRect(-w/2+4,-h/2,3,h);ctx.fillRect(w/2-7,-h/2,3,h);ctx.fillStyle='#fff1af';ctx.fillRect(-3,-4,6,8);
  }else{
    ctx.beginPath();ctx.arc(0,-h/4,6,0,Math.PI*2);ctx.stroke();ctx.fillRect(-2,-2,4,h/2);ctx.fillRect(0,h/2-5,8,4);
  }
  ctx.restore();
}
