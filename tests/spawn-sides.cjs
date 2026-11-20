const {chromium}=require('playwright'),fs=require('fs');
(async()=>{const b=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});try{for(const width of [320,390,1280]){const p=await b.newPage({viewport:{width,height:844},hasTouch:true});await p.route('http://test/**',r=>{const f=new URL(r.request().url()).pathname.slice(1)||'index.html';return r.fulfill({body:fs.readFileSync(__dirname+'/../'+f),contentType:f.endsWith('.js')?'application/javascript':'text/html'});});await p.addInitScript(()=>requestAnimationFrame=()=>0);await p.goto('http://test/');console.log(await p.evaluate(()=>{
const check=(v,m)=>{if(!v)throw Error(m);};
const resetSides=()=>{combat.slimeSpawnSide=0;combat.slimeSpawnStreak=0;combat.enemies=[];};
const sideOf=e=>e.x<(dungeon.left+dungeon.right)/2?-1:1;
for(const requested of [-1,1]){resetSides();const sequence=[];for(let i=0;i<10;i++)sequence.push(sideOf(combat.spawnEnemy(requested)));check(sequence.join(',')===[requested,requested,requested,requested,-requested,requested,requested,requested,requested,-requested].join(','),'Four-spawn limit');}
// Identical side requests yield identical positions, even when the player camps an edge.
for(const stage of [1,2,3]){combat.waves.wave=stage;const sequences=[];for(const knightX of [dungeon.left,dungeon.right,230]){resetSides();dungeon.x=knightX;sequences.push(Array.from({length:20},(_,i)=>{const e=combat.spawnEnemy(i%7<5?1:-1);return [e.x,e.moveDirection];}));}check(sequences.every(s=>JSON.stringify(s)===JSON.stringify(sequences[0])),'Player-dependent spawn');}
// Real random scheduling may repeat sides; count the resulting factory positions.
resetSides();const manager=new WaveManager(),sides=[],random=Math.random;let seed=1977;
try{Math.random=()=>{seed=(1664525*seed+1013904223)>>>0;return seed/4294967296;};for(let i=0;i<1000;i++){manager.timer=0;manager.update(0,(side,spec)=>{const e=combat.spawnEnemy(side,spec);sides.push(sideOf(e));combat.enemies=[];});}}finally{Math.random=random;}
let run=1,max=1;for(let i=1;i<sides.length;i++){run=sides[i]===sides[i-1]?run+1:1;max=Math.max(max,run);}const left=sides.filter(s=>s<0).length;check(max===4&&left>400&&left<600,'Random distribution/streak');
resetSides();for(let i=0;i<4;i++)combat.spawnEnemy(1);const streak=combat.slimeSpawnStreak;combat.spawnEnemy(-1,{type:'bat'});check(combat.slimeSpawnStreak===streak,'Bat changed slime streak');
setPaused(true);check(!combat.spawnEnemy(-1)&&combat.slimeSpawnStreak===streak,'Paused attempt changed streak');setPaused(false);
combat.waves.advance();check(sideOf(combat.spawnEnemy(1))===-1,'Stage transition reset streak');
resetSides();for(let i=0;i<4;i++)combat.spawnEnemy(-1);const oldRandom=Math.random;try{Math.random=()=>0;check(sideOf(combat.spawnRevenge({type:'slime',modifiers:COMBAT_CONFIG.slime}))===1,'Revenge ignored streak');}finally{Math.random=oldRandom;}
combat.restart();check(combat.slimeSpawnStreak===1,'Restart streak');check(combat.waves.definition.spawnInterval===3,'Spawn timing changed');
return {width:innerWidth,left,maxRun:max,passed:true};}));await p.close();}}finally{await b.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
