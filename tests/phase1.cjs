// Run with Node and Playwright installed: node tests/phase1.cjs
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname, '..');
(async () => {
 const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium', args: ['--no-sandbox'] });
 try {
  for (const size of [{width:1280,height:900},{width:390,height:844},{width:320,height:667}]) {
   const page = await browser.newPage({viewport:size,hasTouch:size.width<500});
   const errors=[]; page.on('pageerror', e=>errors.push(e.message));
   await page.route('http://coin.test/**', route => {
    const file = new URL(route.request().url()).pathname.endsWith('knight.js') ? 'knight.js' : 'index.html';
    return route.fulfill({body:fs.readFileSync(path.join(root,file)),contentType:file.endsWith('.js')?'application/javascript':'text/html'});
   });
   // Drive the real shared loop deterministically, without wall-clock timing.
   await page.addInitScript(()=>{window.requestAnimationFrame=()=>0;});
   await page.goto('http://coin.test/');
   const tick = n => page.evaluate(n=>{for(let i=0;i<n;i++)dungeon.update(STEP);dungeon.draw();},n);
   const state = ()=>page.evaluate(()=>({x:dungeon.x,y:dungeon.y,facing:dungeon.facing,floor:dungeon.floor,vy:dungeon.vy}));
   await page.keyboard.down('ArrowLeft');await tick(30);await page.keyboard.up('ArrowLeft');
   assert((await state()).x<230);assert.equal((await state()).facing,-1);
   const stopped=(await state()).x;await tick(30);assert.equal((await state()).x,stopped);
   await page.keyboard.down('KeyD');await tick(30);await page.keyboard.up('KeyD');assert.equal((await state()).facing,1);
   for(const key of ['Space','ArrowUp','KeyW']) {
    await page.keyboard.down(key);await tick(12);assert((await state()).y<(await state()).floor);
    await tick(120);assert.equal((await state()).y,(await state()).floor); // holding does not auto-jump
    await page.keyboard.up(key);
   }
   await page.keyboard.down('KeyA');await tick(600);await page.keyboard.up('KeyA');assert.equal((await state()).x,81);
   await page.keyboard.down('ArrowRight');await tick(600);await page.keyboard.up('ArrowRight');assert.equal((await state()).x,379);
   // Pointer capture, simultaneous movement/jump, cancellation and blur.
   const cdp=await page.context().newCDPSession(page);
   const left=await page.locator('[data-knight=left]').boundingBox();
   const jump=await page.locator('[data-knight=jump]').boundingBox();
   await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:left.x+left.width/2,y:left.y+left.height/2,id:1},{x:jump.x+jump.width/2,y:jump.y+jump.height/2,id:2}]});
   await tick(20);assert((await state()).x<379);assert((await state()).y<122);
   await cdp.send('Input.dispatchTouchEvent',{type:'touchCancel',touchPoints:[]});
   await page.waitForFunction(()=>dungeon.pointers.size===0);
   const released=(await state()).x;await tick(120);assert.equal((await state()).x,released);
   await page.evaluate(()=>window.dispatchEvent(new Event('blur')));assert.equal(await page.evaluate(()=>dungeon.pointers.size),0);
   // Native slider arrow keys remain available, and knight movement never aims coins.
   const aim=await page.locator('#aim').inputValue();
   await page.locator('#aim').focus();await page.keyboard.press('ArrowRight');assert.equal(Number(await page.locator('#aim').inputValue()),Number(aim)+1);
   assert.equal((await state()).x,released);await page.locator('#aim').blur();
   const physics = await page.evaluate(()=>{
    reset();const original=coins.length;
    coins=[coin(230,249),coin(230,225,30)];updateStackLoads();
    forwardBump(new Set([coins[0]]),38.75);
    if(bumpFlash>0.007||coins[1].bumpImpulse>0.6)throw Error('Single coin jolt too strong');
    reset();coins=[];
    for(const x of [230,258])for(let y=276;y<=444;y+=28)coins.push(coin(x,y));
    coins[6].y=444.5;
    const isolated=coin(370,430);coins.push(isolated);
    if(forwardBump(new Set(),38.75)||forwardBump(new Set([coins[0]]),-30))throw Error('Invalid bump trigger');
    forwardBump(new Set([coins[0]]),38.75);
    if(bumpFlash!==1)throw Error('Crowded load maximum');
    for(let i=0;i<120;i++)simulate(STEP);
    if(!score||isolated.y!==430)throw Error('Edge spill or disconnected coin regression');
    reset();
    for(let i=0;i<3600;i++){
     if(i%60===0)drop();simulate(STEP);dungeon.update(STEP);
     if(coins.length>180||coins.some(c=>![c.x,c.y,c.z,c.vx,c.vy,c.vz].every(Number.isFinite)))throw Error('Invalid coin physics');
    }
    const collected=score;reset();draw();dungeon.draw();
    return {original,collected,reset:score===0&&used===0&&coins.length===164};
   });
   assert.equal(physics.original,164);assert(physics.collected>0);assert(physics.reset);
   const layout=await page.evaluate(()=>{
    const d=document.querySelector('#dungeon').getBoundingClientRect(),g=document.querySelector('#game').getBoundingClientRect();
    return {top:d.top,bottom:g.bottom,height:innerHeight,aligned:Math.abs(d.left-g.left)<1&&Math.abs(d.width-g.width)<1,visible:d.top>=0&&g.bottom<=innerHeight,width:document.documentElement.scrollWidth<=innerWidth,touch:getComputedStyle(document.querySelector('[data-knight]')).touchAction};
   });
   assert(layout.aligned);assert(layout.visible,JSON.stringify({size,layout}));assert(layout.width);assert.equal(layout.touch,'none');assert.deepEqual(errors,[]);
   await page.screenshot({path:`/tmp/coin-phase1-${size.width}.png`});
   console.log('PASS',size,physics,layout);await page.close();
  }
 } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
