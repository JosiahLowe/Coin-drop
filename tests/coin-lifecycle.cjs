const {chromium}=require('playwright'),fs=require('fs');
(async()=>{const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});try{
for(const width of [320,390,1280]){
 const context=await browser.newContext({viewport:{width,height:844},hasTouch:true});
 const page=await context.newPage();
 await page.route('http://test/**',r=>{const f=new URL(r.request().url()).pathname.slice(1)||'index.html';return r.fulfill({body:fs.readFileSync(__dirname+'/../'+f),contentType:f.endsWith('.js')?'application/javascript':'text/html'});});
 await page.addInitScript(()=>requestAnimationFrame=()=>0);await page.goto('http://test/');
 console.log(await page.evaluate(()=>{
  const check=(v,m)=>{if(!v)throw Error(m);};
  check(runScore===0&&score===0,'Initial score/supply');
  const sample=red=>{ctx.clearRect(0,0,460,432);drawCoin(Object.assign(coin(100,100),{red,angle:0}));return [...ctx.getImageData(100,92,1,1).data].slice(0,3).join(',');};
  check(sample(false)==='230,189,98'&&sample(true)==='200,67,67','Gold/red face artwork');check(coins.filter(c=>!c.loot&&!c.token).every(c=>!c.red),'Starting gold');
  const collect=c=>{c.y=EDGE+1;c.z=-66;c.falling=true;simulate(STEP);};
  coins=[];const gold=coin(230,300);coins.push(gold);collect(gold);
  check(score===1&&runScore===0&&coins.length===0,'Gold supply without points');
  dungeon.x=123;check(drop(),'Manual drop');const red=coins.at(-1);
  check(red.red===true&&red.x===123&&score===0&&runScore===0,'Red manual coin');
  collect(red);check(score===0&&runScore===1&&bestScore===1&&coins.length===0,'Red scores without recycling');
  simulate(STEP);check(runScore===1&&!drop(),'Duplicate collection/reuse');
  check(localStorage.getItem(BEST_SCORE_KEY)==='1','Persist best');
  // Gold and red share the same trajectories, contact response and mass.
  function trajectory(red){time=0;pusherY=pusherAt(0);coins=[Object.assign(coin(200,310),{red}),coin(222,310)];for(let i=0;i<60;i++)simulate(STEP);return coins.map(c=>[c.x,c.y,c.z,c.vx,c.vy,c.load]);}
  check(JSON.stringify(trajectory(false))===JSON.stringify(trajectory(true)),'Different physics');
  coins=[];pendingCoinDrops=[379];flushCoinDrops();check(coins.length===1&&!coins[0].red&&coins[0].x===379,'Enemy gold entry');
  score=1;manualDropRemaining=0;setPaused(true);check(!drop()&&score===1,'Paused spend');const paused=runScore;simulate(10);check(runScore===paused,'Paused scoring');setPaused(false);
  combat.health.hearts=0;check(!drop()&&score===1,'Dead spend');document.getElementById('restart').click();check(runScore===0&&bestScore===1&&score===1,'Restart score/best/balance');
  reset();check(runScore===0&&bestScore===1&&score===0,'Machine reset');
  const hud=document.querySelector('.run-hud').getBoundingClientRect(),stage=document.querySelector('.dungeon-hud').getBoundingClientRect();
  check(hud.height===36&&stage.height===28,'Compact HUD');
  check(document.documentElement.scrollWidth===innerWidth,'Horizontal overflow');
  return {width:innerWidth,hudHeight:hud.height+stage.height,passed:true};
 }));
 await page.reload();await page.waitForFunction(()=>bestScore===1);if(await page.evaluate(()=>runScore)!==0)throw Error('Reload current score');
 await page.evaluate(()=>{combat.health.hearts=2;combat.runLoot.potions=1;combat.powerups.activate('sword');combat.onChange(combat);draw();dungeon.draw();});
 await page.screenshot({path:`/tmp/lifecycle-${width}.png`});await context.close();
}
// Storage restrictions should never prevent gameplay.
const p=await browser.newPage();await p.route('http://test/**',r=>{const f=new URL(r.request().url()).pathname.slice(1)||'index.html';return r.fulfill({body:fs.readFileSync(__dirname+'/../'+f),contentType:f.endsWith('.js')?'application/javascript':'text/html'});});await p.addInitScript(()=>{requestAnimationFrame=()=>0;Storage.prototype.getItem=Storage.prototype.setItem=()=>{throw Error('Disabled storage');};});await p.goto('http://test/');await p.evaluate(()=>{coins=[Object.assign(coin(230,EDGE+1,-66),{red:true,falling:true})];simulate(STEP);if(runScore!==1||bestScore!==1)throw Error('Storage fallback');});
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
