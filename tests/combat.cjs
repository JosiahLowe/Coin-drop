const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox']});
 try {
  for(const viewport of [{width:1280,height:900},{width:390,height:844}]){
   const page=await browser.newPage({viewport,hasTouch:viewport.width<500});const errors=[];page.on('pageerror',e=>errors.push(e.message));
   await page.route('http://coin.test/**',route=>{const file=new URL(route.request().url()).pathname.slice(1)||'index.html';return route.fulfill({body:fs.readFileSync(path.join(__dirname,'..',file)),contentType:file.endsWith('.js')?'application/javascript':'text/html'});});
   await page.addInitScript(()=>{window.requestAnimationFrame=()=>0;});await page.goto('http://coin.test/');
   await page.evaluate(()=>{combat.powerups.config={...POWERUP_CONFIG,dropChance:0};STAGE_DEFINITIONS[1].randomSides=false;STAGE_DEFINITIONS[1].enemies[0].modifiers.patrolPause.chance=0;combat.restart();});
   const result=await page.evaluate(()=>{
    const check=(condition,message)=>{if(!condition)throw Error(message);};
    // Bottom corners stay square and grounded throughout the squash cycle.
    const surface=document.createElement('canvas');surface.width=200;surface.height=150;
    const ink=surface.getContext('2d'),slime=new Slime(100,COMBAT_CONFIG.slime);
    for(const age of [0,.15,.3,.45]){
     ink.clearRect(0,0,200,150);slime.age=age;slime.draw(ink,122);
     const r=slime.config.radius+Math.sin(age*10)*1.5;
     for(const x of [Math.ceil(100-r)+1,Math.floor(100+r)-2]){
      check(ink.getImageData(x,121,1,1).data[3]===255,'Rounded bottom corner');
      check(ink.getImageData(x,122,1,1).data[3]===0,'Slime below floor');
     }
    }
    const tick=(seconds,move=false)=>{for(let t=0;t<seconds-1e-8;t+=STEP){if(move)dungeon.update(STEP);combat.update(STEP);}};
    const fresh=()=>{combat.restart();combat.enemies[0].hp=2;combat.enemies[0].config={...combat.enemies[0].config,speed:0};};
    check(combat.enemies[0]&&Math.abs(combat.enemies[0].x-dungeon.x)>110,'Initial spawn distance');
    // Face right: sword overlaps the slime before the body does.
    fresh();combat.enemies[0].x=dungeon.x+30;combat.update(STEP);
    check(combat.enemies[0].hp===1&&combat.health.hearts===3,'Sword-first hit');
    check(combat.swordBox().x>dungeon.x,'Right sword');
    // Maintain contact, preventing recoil in this fixture to isolate cooldown.
    combat.enemies[0].config.recoilSpeed=0;tick(.3);
    check(combat.enemies[0].hp===1,'Continuous contact bypassed cooldown');
    const count=coins.length,balance=score;tick(.12);
    check(!combat.enemies[0]&&score===balance&&coins.length===count+1,'Exactly one physical coin and no wallet reward');
    tick(2.5);check(!combat.enemies[0],'Spawn too early');tick(.1);check(combat.enemies[0],'Respawn missing');
    check(combat.enemies[0].x<dungeon.x,'Alternating spawn side');
    // Crossing overhead does not reverse pursuit until the knight lands.
    for(const direction of [-1,1]){
     combat.restart();const enemy=combat.enemies[0];enemy.config={...enemy.config,movement:'chase'};
     enemy.x=230;dungeon.x=230+direction*70;enemy.update(STEP,dungeon);
     check(enemy.moveDirection===direction,'Grounded pursuit direction');
     dungeon.y=dungeon.floor-60;dungeon.x=230-direction*70;
     const before=enemy.x;enemy.update(.2,dungeon);
     check((enemy.x-before)*direction>0&&enemy.moveDirection===direction,'Airborne pursuit reversed');
     dungeon.y=dungeon.floor;enemy.update(STEP,dungeon);
     check(enemy.moveDirection===-direction,'Pursuit did not resume on landing');
    }
    // A full moving jump clears a slime without it turning underneath us.
    combat.restart();combat.enemies[0].x=310;combat.enemies[0].moveDirection=-1;dungeon.keys.add('KeyD');dungeon.jumpQueued=true;
    tick(.85,true);dungeon.clearInput();
    check(dungeon.y===dungeon.floor&&combat.health.hearts===3,'Jump-over caused body damage');
    check(dungeon.x>combat.enemies[0].x,'Jump did not clear slime');
    // Behind body contact damages the player, then invulnerability blocks it.
    fresh();combat.enemies[0].x=dungeon.x-8;combat.update(STEP);
    check(combat.health.hearts===2,'Rear body damage');
    check(document.querySelector('#hearts').getAttribute('aria-label')==='2 of 3 hearts','Immediate heart update');
    const x=dungeon.x;tick(.1);check(dungeon.x>x,'Knockback direction');
    tick(.7);check(combat.health.hearts===2,'Invulnerability failed');
    // A high jump avoids both body and sword contact.
    fresh();combat.enemies[0].x=dungeon.x-5;dungeon.y=dungeon.floor-60;combat.update(STEP);check(combat.health.hearts===3&&combat.enemies[0].hp===2,'Jump overlap');
    // Turning changes both sword sides immediately, with a valid left hit.
    fresh();dungeon.facing=-1;combat.enemies[0].x=dungeon.x-30;combat.update(STEP);
    check(combat.enemies[0].hp===1&&combat.swordBox().x<dungeon.x,'Left sword');
    // Idle knight can defeat an approaching enemy without taking damage.
    combat.restart();const idleEnemy=combat.enemies[0];tick(2.5);check(idleEnemy.defeated&&combat.health.hearts===3,'Idle sword defense');
    // Death stops inputs, dropping, movement and spawning, but not the machine.
    fresh();for(let i=0;i<3;i++){combat.health.invulnerable=0;combat.enemies[0].x=dungeon.x-5;combat.update(STEP);}
    check(combat.health.dead&&dungeon.disabled,'Death state');
    check(!document.querySelector('#game-over').hidden,'Missing game over');
    const saved={x:dungeon.x,enemy:combat.enemies[0].x,used,coins:coins.length,time};
    dungeon.keys.add('KeyD');dungeon.jumpQueued=true;dungeon.update(STEP);drop();combat.update(4);
    check(dungeon.x===saved.x&&combat.enemies[0].x===saved.enemy&&used===saved.used,'Dead player/enemy moved or dropped');
    simulate(STEP);check(time>saved.time,'Machine paused on death');
    const machine=JSON.stringify(coins.filter(c=>!c.token&&!c.starting)),machineTime=time,currentScore=score;
    document.querySelector('#restart').click();
    check(combat.health.hearts===3&&!dungeon.disabled&&dungeon.x===230,'Restart player');
    check(JSON.stringify(coins.filter(c=>!c.token&&!c.starting))===machine&&time===machineTime&&score===currentScore,'Restart reset the machine or currency');
    check(combat.enemies[0]&&combat.enemies[0].hp===1,'Restart spawn');
    dungeon.keys.add('KeyD');dungeon.update(STEP);check(dungeon.x>230,'Movement after restart');dungeon.clearInput();
    // A single wallet: paid drops, no spending at cap or while dead/empty.
    reset();check(score===0,'Starting balance must be zero');score=1;const start=score;const beforeDrop=coins.length;drop();
    check(score===start-1&&coins.length===beforeDrop+1,'Manual paid drop');
    score=0;const noFunds=coins.length;drop();check(coins.length===noFunds&&score===0,'Empty wallet drop');
    score=5;coins=Array.from({length:180},()=>coin(230,130,30));drop();check(score===5,'Coin cap spent balance');
    reset();combat.restart();
    // Matching outcomes at 30/60/120 render Hz through the shared fixed step.
    const outcomes=[];
    for(const hz of [30,60,120]){
     reset();combat.restart();lastTime=null;accumulator=0;
     for(let i=0;i<=hz*5;i++)frame(i*1000/hz);
     outcomes.push({hp:combat.health.hearts,enemy:combat.enemies[0]?.hp??0,x:Math.round(dungeon.x*1000)/1000,rewards:score-STARTING_COINS});
    }
    check(outcomes.every(o=>JSON.stringify(o)===JSON.stringify(outcomes[0])),'Frame rate-dependent combat');
    return {outcomes,hearts:combat.health.hearts};
   });
   // Real touch input can position the sword and drop a paid coin mid-combat.
   await page.evaluate(()=>{combat.restart();combat.enemies[0].hp=2;combat.enemies[0].x=dungeon.x-34;});
   const cdp=await page.context().newCDPSession(page),box=await page.locator('[data-knight=left]').boundingBox();
   await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:box.x+box.width/2,y:box.y+box.height/2,id:1}]});
   await page.waitForFunction(()=>dungeon.pointers.size===1);
   await page.evaluate(()=>{for(let i=0;i<8;i++){dungeon.update(STEP);combat.update(STEP);}updateAim();});
   assert.equal(await page.evaluate(()=>combat.enemies[0].hp),1);
   await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
   await page.waitForFunction(()=>dungeon.pointers.size===0);
   await page.evaluate(()=>{score=1;}); // Retained paid manual drop, separate from death rewards.
   const wallet=await page.evaluate(()=>score);await page.evaluate(()=>drop());
   assert.equal(await page.evaluate(()=>score),wallet-1);
   await page.evaluate(()=>{draw();dungeon.draw();});
   assert.deepEqual(errors,[]);await page.screenshot({path:`/tmp/combat-${viewport.width}.png`});console.log('PASS combat',viewport,result);await page.close();
  }
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
