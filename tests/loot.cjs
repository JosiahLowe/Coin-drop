const {chromium}=require('playwright');const fs=require('node:fs');const path=require('node:path');
(async()=>{const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});try{
for(const viewport of [{width:390,height:844},{width:320,height:667}]){
const page=await browser.newPage({viewport,hasTouch:true});const errors=[];page.on('pageerror',e=>errors.push(e.message));
await page.route('http://coin.test/**',route=>{const f=new URL(route.request().url()).pathname.slice(1)||'index.html';return route.fulfill({body:fs.readFileSync(path.join(__dirname,'..',f)),contentType:f.endsWith('.js')?'application/javascript':'text/html'});});await page.addInitScript(()=>{requestAnimationFrame=()=>0;});await page.goto('http://coin.test/');
const result=await page.evaluate(()=>{
const check=(ok,msg)=>{if(!ok)throw Error(msg);};
check(Object.keys(LOOT_TYPES).every(type=>coins.filter(c=>c.loot===type).length===1),'All starting loot');
check(coins.filter(c=>c.loot).every(c=>c.y>pusherY+c.radius&&c.y<EDGE),'All loot lower deck');
const initial=coins.find(c=>c.loot);check(initial.y===EDGE-initial.radius-6&&initial.z===15&&initial.y>pusherY+initial.radius,'Lower-deck test feed');
for(const wave of [1,3,5,7,9]){loot.observeWave(wave);loot.observeWave(wave);flushLootDrops();}
check(coins.filter(c=>c.loot).length===5,'Schedule duplicate or missing loot');
const ids=coins.filter(c=>c.loot).map(c=>c.id);combat.restart();combat.update(0);flushLootDrops();check(coins.filter(c=>c.loot).length===5,'Restart duplicates');
const events=[];window.addEventListener('loot-collected',e=>events.push(e.detail));
function item(type){loot.pending.push({id:'test-'+loot.nextId++,type,lane:.5});flushLootDrops();return coins.at(-1);}
// Contact uses the shared solver and weighted displacement, on an isolated lower deck.
const shifts={};for(const type of Object.keys(LOOT_TYPES)){
 coins=[];const body=item(type);body.x=230;body.y=330;body.z=0;
 const push=coin(230,330-body.radius-R+8);coins.push(push);simulate(STEP);
 check(body.y>330,'Coins did not push '+type);
 check(Math.hypot(body.x-push.x,body.y-push.y)>=body.radius+R-.01,'Overlap '+type);
 shifts[type]=body.y-330;
}
check(shifts.chest<shifts.potion&&shifts.sword<shifts.key,'Mass resistance');
coins=[];const a=item('armor'),b=item('chest');a.x=b.x=230;a.y=330;b.y=330+a.radius+b.radius-6;a.z=b.z=0;simulate(STEP);
check(Math.hypot(a.x-b.x,a.y-b.y)>=a.radius+b.radius-.01,'Loot passes through loot');
// Shelf attachment remains bidirectional; friction differs without contact.
coins=[];const carried=item('sword');carried.x=230;carried.y=160;carried.z=30;
const offset=carried.y-pusherY;for(let i=0;i<600;i++)simulate(STEP);
check(Math.abs(carried.y-pusherY-offset)<.01,'Loot shelf attachment');
const distances={};for(const type of ['key','chest']){coins=[];const body=item(type);body.x=230;body.y=330;body.z=0;body.vx=60;simulate(STEP);distances[type]=body.x-230;}
check(distances.key>distances.chest,'Friction resistance');
coins=[];const natural=item('key');natural.y=EDGE+.5;natural.z=0;
for(let i=0;i<150;i++)simulate(STEP);
check(!coins.includes(natural)&&loot.collection.some(e=>e.id===natural.id),'Natural tipping and gravity collection');
// No collection while in the machine. Falling past the edge collects once.
loot.messages=[];loot.messageTime=0;loot.update(0);
coins=[];const sword=item('sword'),before=loot.collection.length;simulate(STEP);check(loot.collection.length===before,'Collected on entry');
sword.x=230;sword.y=EDGE+1;sword.z=-66;sword.falling=true;simulate(STEP);loot.collect(sword);
check(!coins.includes(sword)&&loot.collection.length===before+1,'Exactly-once collection');
check(events.at(-1).id===sword.id&&events.at(-1).type==='sword','Identity event');
check(document.getElementById('loot-notice').textContent.includes('Sword'),'Notification');
// Test every configured chest outcome deterministically, never rerolling collected chests.
for(let i=0;i<CHEST_REWARDS.length;i++){
 coins=[];const chest=item('chest');chest.falling=true;chest.y=EDGE+1;chest.z=-66;loot.random=()=>i/CHEST_REWARDS.length+.01;
 const balance=score,n=loot.collection.length;simulate(STEP);loot.collect(chest);
 check(loot.collection.length===n+1&&loot.collection.at(-1).reward.type===CHEST_REWARDS[i].type,'Chest reward');
 check(score===balance+(CHEST_REWARDS[i].amount||0),'Chest coins');
}
coins=[coin(230,EDGE+1,-66)];coins[0].falling=true;const balance=score;simulate(STEP);check(score===balance+1,'Stored coin collection');
const health=combat.health.hearts;check(health===3,'Loot modified player stats');
// Mixed simulation includes all item types, fills to cap, and remains finite.
reset();for(const type of Object.keys(LOOT_TYPES))item(type);
for(let i=0;i<1800;i++){if(i%20===0)spawnCoin(70+(i%320));simulate(STEP);flushCoinDrops();flushLootDrops();if(coins.some(c=>![c.x,c.y,c.z,c.vx,c.vy,c.vz].every(Number.isFinite)))throw Error('Invalid physics');}
check(coins.length<=180,'Object cap');draw();dungeon.draw();return {shifts,events:events.length,active:coins.length};
});if(errors.length)throw Error(errors.join('\n'));await page.screenshot({path:`/tmp/loot-${viewport.width}.png`});console.log('PASS loot',viewport,result);await page.close();}
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
