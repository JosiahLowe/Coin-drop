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
   const page = await browser.newPage({viewport:size,hasTouch:true});
   const errors=[]; page.on('pageerror', e=>errors.push(e.message));
   await page.route('http://coin.test/**', route => {
    const requested = new URL(route.request().url()).pathname.slice(1);
    const file = ['knight.js','combat.js'].includes(requested) ? requested : 'index.html';
    return route.fulfill({body:fs.readFileSync(path.join(root,file)),contentType:file.endsWith('.js')?'application/javascript':'text/html'});
   });
   // Drive the real shared loop deterministically, without wall-clock timing.
   await page.addInitScript(()=>{window.requestAnimationFrame=()=>0;});
   await page.goto('http://coin.test/');
   const tick = n => page.evaluate(n=>{for(let i=0;i<n;i++)dungeon.update(STEP);updateAim();dungeon.draw();},n);
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
   await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
   await page.waitForFunction(()=>dungeon.pointers.size===0);
   const released=(await state()).x;await tick(120);assert.equal((await state()).x,released);
   await page.evaluate(()=>window.dispatchEvent(new Event('blur')));assert.equal(await page.evaluate(()=>dungeon.pointers.size),0);
   // Knight position aims both the marker and newly spawned coins.
   assert.equal(await page.locator('#aim').count(),0);
   assert.equal(await page.evaluate(()=>dropX),released);
   await page.keyboard.down('KeyA');await tick(30);await page.keyboard.up('KeyA');
   assert.equal(await page.evaluate(()=>dropX), (await state()).x);
   const aimBeforeJump=await page.evaluate(()=>dropX);
   await page.keyboard.press('Space');await tick(15);assert.equal(await page.evaluate(()=>dropX),aimBeforeJump);await tick(120);
   await page.evaluate(()=>{score=1;}); // Fund one drop independently of combat.
   await page.locator('#drop').click();
   assert.equal(await page.evaluate(()=>coins.at(-1).x), (await state()).x);
   await page.locator('#reset').click();assert.equal(await page.evaluate(()=>dropX), (await state()).x);
   await page.locator('#reset').blur();
   // One captured finger can slide between directions without lifting.
   const right=await page.locator('[data-knight=right]').boundingBox();
   const point=box=>({x:box.x+box.width/2,y:box.y+box.height/2,id:7});
   await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[point(left)]});
   await page.waitForFunction(()=>[...dungeon.pointers.values()].includes('left'));
   await tick(8);const slideStart=(await state()).x;
   await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[point(right)]});
   await page.waitForFunction(()=>[...dungeon.pointers.values()].includes('right'));
   await tick(8);assert((await state()).x>slideStart);assert.equal((await state()).facing,1);
   await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:right.x,y:right.y+right.height+20,id:7}]});
   await page.waitForFunction(()=>[...dungeon.pointers.values()].every(a=>a===null));
   const outside=(await state()).x;await tick(8);assert.equal((await state()).x,outside);
   await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[point(left)]});
   await page.waitForFunction(()=>[...dungeon.pointers.values()].includes('left'));
   await tick(8);assert((await state()).x<outside);
   await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
   await page.waitForFunction(()=>dungeon.pointers.size===0);
   // Long holds must not select text or open a native context menu. Repeat
   // presses, slide outside the button, and release without stuck movement.
   for (const action of ['left','right','left']) {
    const box=await page.locator(`[data-knight=${action}]`).boundingBox();
    await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:box.x+box.width/2,y:box.y+box.height/2,id:5}]});
    await page.waitForFunction(()=>dungeon.pointers.size===1);
    await page.waitForTimeout(800);await tick(20);
    assert.equal((await state()).facing,action==='left'?-1:1);
    await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:box.x+box.width/2,y:box.y+box.height+25,id:5}]});
    await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
    await page.waitForFunction(()=>dungeon.pointers.size===0);
    const x=(await state()).x;await tick(30);assert.equal((await state()).x,x);
    assert.equal(await page.evaluate(()=>getSelection().toString()),'');
   }
   assert(await page.locator('.knight-controls').evaluate(el=>{
    const e=new Event('contextmenu',{bubbles:true,cancelable:true});el.dispatchEvent(e);return e.defaultPrevented;
   }));
   const physics = await page.evaluate(()=>{
    reset();const original=coins.length;
    if(EDGE!==389||pusherAt(0)!==207||canvas.height!==484)throw Error('Deck shortening regression');
    coins=[coin(230,pusherY+R),coin(230,pusherY-10,30)];updateStackLoads();
    forwardBump(new Set([coins[0]]),38.75);
    if(bumpFlash>0.007||coins[1].bumpImpulse>0.6)throw Error('Single coin jolt too strong');
    reset();coins=[];
    const front = EDGE - .5, rear = pusherY + R;
    const gaps = Math.ceil((front - rear) / (R * 2));
    for(const x of [230,258])for(let i=0;i<=gaps;i++)coins.push(coin(x,rear+(front-rear)*i/gaps));
    const isolated=coin(370,EDGE-15);coins.push(isolated);
    if(forwardBump(new Set(),38.75)||forwardBump(new Set([coins[0]]),-30))throw Error('Invalid bump trigger');
    const scoreBeforeSpill=score;
    forwardBump(new Set([coins[0]]),38.75);
    if(bumpFlash!==1)throw Error('Crowded load maximum');
    for(let i=0;i<120;i++)simulate(STEP);
    if(score<=scoreBeforeSpill||isolated.y!==EDGE-15)throw Error('Edge spill or disconnected coin regression');
    reset();
    score=60; // Exercise the machine with funded drops, independent of rewards.
    let collected=0;
    for(let i=0;i<3600;i++){
     if(i%60===0)drop();const before=score;simulate(STEP);collected+=score-before;dungeon.update(STEP);
     if(coins.length>180||coins.some(c=>![c.x,c.y,c.z,c.vx,c.vy,c.vz].every(Number.isFinite)))throw Error('Invalid coin physics');
    }
    const drops=used;reset();draw();dungeon.draw();
    return {original,collected,drops,reset:score===STARTING_COINS&&used===0&&coins.length===original};
   });
   assert.equal(physics.original,64);assert.equal(physics.drops,60);assert(physics.reset);
   const layout=await page.evaluate(()=>{
    const d=document.querySelector('#dungeon').getBoundingClientRect(),g=document.querySelector('#game').getBoundingClientRect();
    return {top:d.top,bottom:g.bottom,height:innerHeight,aligned:Math.abs(d.left-g.left)<1&&Math.abs(d.width-g.width)<1,visible:d.top>=0&&g.bottom<=innerHeight,width:document.documentElement.scrollWidth<=innerWidth,touch:getComputedStyle(document.querySelector('[data-knight]')).touchAction,selection:getComputedStyle(document.querySelector('[data-knight]')).userSelect,controlsBelow:document.querySelector('.knight-controls').getBoundingClientRect().top>=g.bottom};
   });
   assert(layout.aligned);assert(layout.visible,JSON.stringify({size,layout}));assert(layout.width);assert.equal(layout.touch,'none');assert.equal(layout.selection,'none');assert(layout.controlsBelow);assert.deepEqual(errors,[]);
   await page.screenshot({path:`/tmp/coin-phase1-${size.width}.png`});
   console.log('PASS',size,physics,layout);await page.close();
  }
 } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
