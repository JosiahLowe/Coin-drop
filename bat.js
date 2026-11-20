'use strict';
const BAT_CONFIG={health:1,damage:1,radius:20,height:22,crawlSpeed:30,minCrawlDuration:1.2,maxCrawlDuration:2.6,dropDistance:24,dropDuration:.4,flutterDuration:.65,swoopSpeed:90,swoopDistance:170,minHeight:26,climbSpeed:45};
// Flight reads only battlefield bounds/floor. No player position enters this class.
class Bat {
  constructor(side,bounds,config=BAT_CONFIG,random=Math.random){
    this.type='bat';this.config=config;this.random=random;
    this.left=bounds.left+config.radius;this.right=bounds.right-config.radius;
    this.floor=bounds.floor;this.ceiling=config.height/2+2;
    this.x=side>0?this.right:this.left;this.y=this.ceiling;
    this.moveDirection=side>0?-1:1;this.hp=config.health;this.hitTimer=0;this.age=0;
    this.enter('CEILING_CRAWL',this.crawlDuration());
  }
  get height(){return this.floor-this.y;}
  get canContact(){return this.state!=='CEILING_CRAWL';}
  crawlDuration(){return this.config.minCrawlDuration+this.random()*(this.config.maxCrawlDuration-this.config.minCrawlDuration);}
  enter(state,duration){this.state=state;this.elapsed=0;this.duration=duration;this.startX=this.x;this.startY=this.y;}
  smooth(t){return t*t*(3-2*t);}
  nextState(){
    const c=this.config;
    if(this.state==='CEILING_CRAWL')this.enter('DROP',c.dropDuration);
    else if(this.state==='DROP')this.enter('FLUTTER',c.flutterDuration);
    else if(this.state==='FLUTTER'){
      let direction=this.random()<.5?-1:1;
      const room=dir=>dir>0?this.right-this.x:this.x-this.left;
      if(room(direction)<Math.min(c.swoopDistance,60))direction*=-1;
      this.moveDirection=direction;this.distance=Math.min(c.swoopDistance,room(direction));
      // Account for vertical travel too, so narrow arcs never become fast dives.
      const depth=this.floor-c.minHeight-this.y;
      this.enter('SWOOP',Math.hypot(this.distance,2*depth)/c.swoopSpeed);
    }else if(this.state==='SWOOP')this.enter('RETURN_TO_CEILING',Math.max(.1,(this.y-this.ceiling)/c.climbSpeed));
    else{this.y=this.ceiling;this.enter('CEILING_CRAWL',this.crawlDuration());}
  }
  update(dt){
    this.age+=dt;this.hitTimer=Math.max(0,this.hitTimer-dt);
    let remaining=dt;
    while(remaining>1e-8){
      const step=Math.min(remaining,this.duration-this.elapsed);this.elapsed+=step;remaining-=step;
      const t=Math.min(1,this.elapsed/this.duration),c=this.config;
      if(this.state==='CEILING_CRAWL'){
        this.x+=this.moveDirection*c.crawlSpeed*step;
        // Reflect the overshoot so edge reversals do not depend on frame rate.
        while(this.x<this.left||this.x>this.right){if(this.x<this.left){this.x=2*this.left-this.x;this.moveDirection=1;}else{this.x=2*this.right-this.x;this.moveDirection=-1;}}
      }else if(this.state==='DROP')this.y=this.startY+c.dropDistance*this.smooth(t);
      else if(this.state==='FLUTTER')this.y=this.startY+2*Math.sin(t*Math.PI*2);
      else if(this.state==='SWOOP'){
        this.x=this.startX+this.moveDirection*this.distance*this.smooth(t);
        this.y=this.startY+(this.floor-c.minHeight-this.startY)*Math.sin(Math.PI*t)**2;
      }else this.y=this.startY+(this.ceiling-this.startY)*this.smooth(t);
      if(this.elapsed>=this.duration-1e-8)this.nextState();
    }
  }
  box(){return {x:this.x-this.config.radius,y:this.y-this.config.height/2,w:this.config.radius*2,h:this.config.height};}
  hit(damage,direction,cooldown){if(this.hp<=0||this.hitTimer>1e-8)return false;this.hp=Math.max(0,this.hp-damage);this.hitTimer=cooldown;return true;}
  draw(ctx){
    ctx.save();ctx.translate(Math.round(this.x),Math.round(this.y));ctx.scale(this.moveDirection,1);
    const folded=this.state==='CEILING_CRAWL';if(folded)ctx.scale(1,-1);
    const frame=Math.floor(this.age*(folded?5:12))%3;
    // Three stepped wing poses; rectangles keep the silhouette pixel-like.
    ctx.fillStyle=this.hitTimer>0?'#fff0cf':'#9c85bb';
    if(folded){ctx.fillRect(-8,-3,4,12);ctx.fillRect(4,-3,4,12);ctx.fillRect(-3+(frame%2)*2,8,2,5);ctx.fillRect(3-(frame%2)*2,8,2,5);}
    else for(const side of [-1,1]){
      ctx.save();ctx.scale(side,1);
      if(frame===0){ctx.fillRect(4,-5,10,6);ctx.fillRect(10,-10,6,8);ctx.fillRect(16,-13,4,9);}
      else if(frame===1){ctx.fillRect(4,-2,16,5);ctx.fillRect(8,3,4,3);ctx.fillRect(16,3,4,5);}
      else{ctx.fillRect(4,0,7,6);ctx.fillRect(9,4,7,5);ctx.fillRect(14,7,4,5);}
      ctx.restore();
    }
    ctx.fillStyle='#302737';ctx.fillRect(-5,-5,10,13);ctx.fillRect(-6,-9,3,6);ctx.fillRect(3,-9,3,6);
    ctx.fillStyle='#756086';ctx.fillRect(-3,0,6,7);ctx.fillStyle='#ffe4a1';ctx.fillRect(-3,-3,2,2);ctx.fillRect(2,-3,2,2);
    ctx.restore();
  }
}
