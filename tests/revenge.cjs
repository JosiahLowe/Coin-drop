const {chromium}=require('playwright'),fs=require('fs');
(async()=>{const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});try{for(const width of [320,390,1280]){
const p=await browser.newPage({viewport:{width,height:844},hasTouch:true});await p.route('http://test/**',r=>{const f=new URL(r.request().url()).pathname.slice(1)||'index.html';return r.fulfill({body:fs.readFileSync(__dirname+'/../'+f),contentType:f.endsWith('.js')?'application/javascript':'text/html'});});await p.addInitScript(()=>requestAnimationFrame=()=>0);await p.goto('http://test/');
console.log(await p.evaluate(()=>{
 const check=(v,m)=>{if(!v)throw Error(m);};
 const hit=e=>combat.contactDamage(e.config.damage,1,e);
 function clean(){combat.restart();coins=[];pendingCoinDrops=[];score=3;runScore=0;dungeon.x=177;}
 clean();let attacker=combat.spawnEnemy(-1,STAGE_DEFINITIONS[3].enemies[1]);
 hit(attacker);let black=coins.at(-1);
 check(score===2&&combat.health.hearts===2&&coins.length===1&&black.revenge&&black.x===177,'Hit penalty/entry');
 check(black.y===BACK+R+6&&black.z===SHELF_HEIGHT+85&&!black.red,'Black uses normal entry');
 for(let i=0;i<10;i++)hit(attacker);check(score===2&&coins.length===1,'Repeated hit penalty');
 const config=structuredClone(attacker.config);attacker.config.color='pink';attacker.hp=0;combat.defeatEnemy(attacker);combat.enemies=[];
 // Collection reconstructs the saved healthy archetype, not the original object.
 coins=[black];black.y=EDGE+1;black.z=-66;black.falling=true;
 const clock=JSON.stringify(combat.waves),balance=score,points=runScore;simulate(STEP);
 check(coins.length===0&&score===balance&&runScore===points,'Black collection supply/points');
 let returned=combat.enemies.at(-1);check(combat.enemies.length===1&&returned.revenge&&JSON.stringify(returned.config)===JSON.stringify(config)&&returned.hp===2&&returned.height===0,'Equivalent hopping blue enemy');
 check(JSON.stringify(combat.waves)===clock,'Revenge changed stage clock');collectCoin(black);check(combat.enemies.length===1,'Duplicate redemption');
 combat.health.invulnerable=0;hit(returned);check(score===balance-1&&coins.length===1&&coins[0].revenge,'Revenge chain');
 clean();attacker=combat.enemies[0];combat.runLoot.armor=1;hit(attacker);
 check(score===2&&coins.length===1&&combat.runLoot.armor===0&&combat.health.hearts===3,'Armor penalty');hit(attacker);check(score===2&&coins.length===1,'Armor invulnerability');
 clean();attacker=combat.enemies[0];score=0;hit(attacker);check(score===0&&coins.length===0&&combat.health.hearts===2,'Empty supply');
 clean();attacker=combat.enemies[0];combat.powerups.activate('shield');combat.runLoot.armor=1;hit(attacker);check(score===2&&coins.length===1&&combat.health.hearts===3&&combat.runLoot.armor===1,'Shield penalty/protection');hit(attacker);check(score===2&&coins.length===1,'Shield hit cooldown');
 combat.health.invulnerable=0;attacker.x=dungeon.x-5;attacker.config={...attacker.config,speed:0};combat.update(STEP);check(score===1&&coins.length===2&&combat.health.hearts===3&&combat.runLoot.armor===1,'Shield body contact');
 combat.powerups.reset();setPaused(true);hit(attacker);check(score===1&&coins.length===2,'Paused penalty');setPaused(false);
 // Test the real body-contact integration, with the enemy behind the sword.
 clean();attacker=combat.enemies[0];attacker.x=dungeon.x-5;attacker.config={...attacker.config,speed:0};combat.update(STEP);
 check(score===2&&coins.filter(c=>c.revenge).length===1,'Body contact hook');
 clean();attacker=combat.enemies[0];combat.health.hearts=1;hit(attacker);check(score===2&&coins.length===1&&combat.health.dead,'Fatal hit');
 black=coins[0];black.falling=true;black.y=EDGE+1;black.z=-66;simulate(STEP);check(combat.pendingRevengeEnemies.length===1,'Dead collection deferred');
 document.getElementById('restart').click();const pending=combat.pendingRevengeEnemies.length;combat.update(STEP);check(pending===1&&combat.pendingRevengeEnemies.length===0&&combat.enemies.some(e=>e.revenge),'Restart deferred enemy');
 // Saturation retains a paid threat instead of dropping it or charging twice.
 clean();attacker=combat.enemies[0];coins=Array.from({length:180},()=>coin(230,130,30));hit(attacker);check(score===2&&pendingCoinDrops.length===1&&coins.length===180,'Full pusher queue');
 coins.pop();flushCoinDrops();check(pendingCoinDrops.length===0&&coins.at(-1).revenge&&score===2,'Queued black coin');
 // Revenge enemies do not consume the twelve ordinary spawn slots.
 clean();combat.enemies=[];for(let i=0;i<12;i++)combat.spawnRevenge({type:'slime',modifiers:COMBAT_CONFIG.slime});combat.waves.timer=0;combat.update(STEP);check(combat.waves.spawned===2&&combat.enemies.filter(e=>e.type!=='bat').length===13,'Normal spawn slots');
 // All variants preserve their appearance and stats after changing stages.
 for(const spec of [STAGE_DEFINITIONS[1].enemies[0],STAGE_DEFINITIONS[2].enemies[0],...STAGE_DEFINITIONS[3].enemies]){clean();const e=combat.spawnEnemy(1,spec);hit(e);const c=coins[0];combat.waves.advance();const clone=combat.spawnRevenge(c.revenge);check(clone.type===e.type&&clone.hp===e.config.health&&JSON.stringify(clone.config)===JSON.stringify(e.config),'Archetype snapshot');}
 // All three colors use identical collision and movement calculations.
 function trajectory(kind){time=0;pusherY=pusherAt(0);coins=[Object.assign(coin(200,310),kind),coin(222,310)];for(let i=0;i<60;i++)simulate(STEP);return JSON.stringify(coins.map(c=>[c.x,c.y,c.z,c.vx,c.vy,c.load]));}
 const goldMotion=trajectory({});check(trajectory({red:true})===goldMotion&&trajectory({revenge:{}})===goldMotion,'Shared coin physics');
 // Same sprite with only the face fill replaced.
 ctx.clearRect(0,0,460,432);drawCoin(Object.assign(coin(100,100),{angle:0,revenge:{}}));check([...ctx.getImageData(100,92,1,1).data].slice(0,3).join(',')==='41,40,45','Charcoal face');
 return {width:innerWidth,passed:true};
}));await p.close();}}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
