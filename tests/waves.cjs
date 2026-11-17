const {chromium}=require('playwright');
const fs=require('node:fs');const path=require('node:path');const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox']});
 try{
 for(const viewport of [{width:1280,height:900},{width:390,height:844},{width:320,height:667}]){
  const page=await browser.newPage({viewport,hasTouch:true});const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.route('http://coin.test/**',route=>{const file=new URL(route.request().url()).pathname.slice(1)||'index.html';return route.fulfill({body:fs.readFileSync(path.join(__dirname,'..',file)),contentType:file.endsWith('.js')?'application/javascript':'text/html'});});
  await page.addInitScript(()=>{window.requestAnimationFrame=()=>0;});await page.goto('http://coin.test/');
  const result=await page.evaluate(()=>{
   const check=(yes,why)=>{if(!yes)throw Error(why);};
   const tick=s=>{for(let t=0;t<s-1e-8;t+=STEP)combat.update(STEP);};
   const kill=e=>{e.hp=0;combat.defeatEnemy(e);combat.enemies=combat.enemies.filter(e=>!e.defeated);};
   // Actual combat kills, both sides, independent of the knight's aim.
   for(const facing of [-1,1]){
    reset();combat.restart();dungeon.facing=facing;
    const e=combat.enemies[0];e.x=dungeon.x+facing*30;e.hp=1;e.config={...e.config,speed:0};
    const deathX=e.x,balance=score,count=coins.length;combat.update(STEP);
    check(e.defeated&&coins.length===count+1,'One physical coin per death');
    const c=coins.at(-1);check(c.x===deathX&&c.x!==dungeon.x,'Death position mapping');
    check(c.y===BACK+R+6&&c.z===SHELF_HEIGHT+85,'Normal rear entry');
    check(score===balance,'Death credited wallet');
    combat.defeatEnemy(e);combat.update(STEP);check(coins.length===count+1,'Duplicate reward');
   }
   // Full-machine rewards wait, preserving location and exactly-once delivery.
   reset();combat.restart();coins=Array.from({length:180},()=>coin(230,130,30));
   const e=combat.enemies[0],x=e.x;kill(e);combat.defeatEnemy(e);
   check(coins.length===180&&pendingCoinDrops.length===1,'Cap queue lost or duplicated reward');
   combat.restart();check(pendingCoinDrops.length===1,'Restart erased earned drop');
   coins.pop();flushCoinDrops();check(coins.length===180&&coins.at(-1).x===Math.min(RIGHT-R,x)&&!pendingCoinDrops.length,'Queued reward mapping');
   // Count scheduled enemies even when no active slimes remain.
   reset();combat.restart();kill(combat.enemies[0]);
   check(combat.waves.remaining===2&&combat.waves.state==='active','Wave completed before scheduled spawns');
   tick(1.9);check(combat.enemies.length===0,'Spawn interval too short');tick(.1);
   check(combat.enemies.length===1&&combat.waves.spawned===2,'Second spawn timing');kill(combat.enemies[0]);
   tick(2);check(combat.waves.spawned===3,'Third spawn count');kill(combat.enemies[0]);
   check(combat.waves.state==='quiet'&&combat.waves.timer===10,'Missing ten second quiet period');
   combat.update(0);check(document.querySelector('#wave-status').textContent.includes('COMPLETE'),'Wave complete interface');
   const quietWallet=score,quietCoinCount=coins.length;
   dungeon.keys.add('KeyD');dungeon.jumpQueued=true;dungeon.update(STEP);dungeon.clearInput();
   check(dungeon.x>230&&dungeon.y<dungeon.floor,'Quiet controls blocked');
   const beforeTime=time;simulate(STEP);check(time>beforeTime,'Quiet machine stopped');
   tick(9.9);check(!combat.enemies.length&&combat.waves.wave===1&&combat.waves.timer>0,'Quiet period too short');
   check(score===quietWallet&&coins.length===quietCoinCount,'Quiet free coins');
   tick(.1);check(combat.waves.wave===2&&combat.waves.total===4&&combat.enemies.length===1,'Automatic next wave');
   // Pure scheduling: 3,4,5,6,7 counts, then cap; completion requires all deaths.
   const waves=new WaveManager(),counts=[];let totalSpawned=0;
   for(let wave=1;wave<=20;wave++){
    const sides=[];waves.update(0,side=>{sides.push(side);totalSpawned++;});
    for(let i=1;i<waves.total;i++)waves.update(2,side=>{sides.push(side);totalSpawned++;});
    counts.push(waves.spawned);check(sides.every((side,i)=>!i||side!==sides[i-1]),'Spawn sides do not alternate');
    for(let i=0;i<waves.total;i++)waves.defeatedEnemy();
    check(waves.state==='quiet'&&waves.remaining===0,'Scheduled count/death completion');
    waves.update(9.99,()=>{throw Error('Quiet spawn');});
    waves.update(.01,()=>{totalSpawned++;});
   }
   check(JSON.stringify(counts.slice(0,5))==='[3,4,5,6,7]'&&Math.max(...counts)===12,'Wave growth/cap');
   // Multi-enemy damage, death freezes all schedules, restart preserves machine.
   reset();combat.restart();combat.spawnEnemy(-1);
   for(const enemy of combat.enemies){enemy.x=dungeon.x-5;enemy.config={...enemy.config,speed:0};}
   combat.update(STEP);check(combat.health.hearts===2,'Multiple simultaneous body hits bypass invulnerability');
   for(let i=0;i<2;i++){combat.health.invulnerable=0;for(const enemy of combat.enemies)enemy.x=dungeon.x-5;combat.update(STEP);}
   check(combat.health.dead,'Wave death missing');
   const waveSnapshot=JSON.stringify(combat.waves),enemySnapshot=JSON.stringify(combat.enemies);
   combat.update(30);check(JSON.stringify(combat.waves)===waveSnapshot&&JSON.stringify(combat.enemies)===enemySnapshot,'Dead timers or movement advanced');
   const machine=JSON.stringify(coins),motion=time,balance=score;combat.restart();
   check(combat.waves.wave===1&&combat.waves.spawned===1&&combat.waves.timer===2&&combat.enemies.length===1&&combat.health.hearts===3,'Restart waves');
   check(JSON.stringify(coins)===machine&&time===motion&&score===balance,'Restart reset machine');
   // Existing manual drop remains paid; empty balances cannot spawn freely.
   reset();combat.restart();const count=coins.length;for(let i=0;i<10;i++)drop();
   check(coins.length===count&&score===0,'Unlimited manual spawning');
   score=1;drop();drop();check(coins.length===count&&score===1,'Manual spending enabled');
   combat.update(0);draw();dungeon.draw();
   return {counts,remaining:combat.waves.remaining};
  });
  assert.deepEqual(errors,[]);await page.screenshot({path:`/tmp/waves-${viewport.width}.png`});console.log('PASS waves',viewport,result);await page.close();
 }
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
