import { chromium } from 'playwright-core';
import assert from 'node:assert/strict';
const origin=process.env.OCTOSIM_BROWSER_ORIGIN??'http://127.0.0.1:8765';
const browser=await chromium.launch({executablePath:process.env.CHROME_PATH,headless:true,args:['--no-sandbox']});
try {
 const context=await browser.newContext();await context.route('**/*',route=>new URL(route.request().url()).origin===origin?route.continue():route.abort());
 const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 for(const id of ['warrior','rogue','paladin','hunter','priest','shaman','mage','warlock','druid']){
  await page.goto(origin+'/docs/sim/?class='+id,{waitUntil:'domcontentloaded'});
  await page.locator('#planner').waitFor({state:'visible',timeout:30000});
  assert.equal(await page.locator('#startup-error').isVisible(),false,id+' startup error');
  assert.equal(await page.locator('.run-button').isDisabled(),true,id+' production gate');
  assert.ok(await page.locator('#reference-rank option:not([disabled])').count()>0,id+' reference ranks');
  assert.ok((await page.locator('#simulation-readiness').textContent()).includes('validated'),id+' readiness');
 }
 await page.goto(origin+'/docs/sim/?class=warlock',{waitUntil:'domcontentloaded'});
 await page.locator('#planner').waitFor({state:'visible',timeout:30000});
 await page.locator('#fight-duration').fill('15');await page.locator('#fight-duration').dispatchEvent('change');
 await page.locator('#fight-iterations').fill('3');await page.locator('#fight-iterations').dispatchEvent('change');
 await page.locator('#key-variability').uncheck();
 await page.getByText('Experimental reference lab',{exact:true}).click();
 await page.locator('#reference-rank').selectOption('11661');await page.locator('#reference-confirm').check();await page.locator('#run-reference').click();
 await page.waitForFunction(()=>document.querySelector('#reference-status').textContent.includes('complete'),null,{timeout:30000});
 assert.match(await page.locator('#reference-output').textContent(),/Reference DPS:/);
 await page.locator('#rotation-add').selectOption('Corruption');await page.locator('#rotation-add').selectOption('Shadow Bolt');
 await page.getByText('Experimental configured rotation',{exact:true}).click();
 await page.locator('#generate-reference-rotation').click();
 const config=JSON.parse(await page.locator('#rotation-reference-config').inputValue());assert.equal(config.rankByAbility['warlock:shadow-bolt'],11661);
 config.encounter.recastPeriodic='after-expiry';await page.locator('#rotation-reference-config').fill(JSON.stringify(config));
 await page.locator('#rotation-reference-confirm').check();await page.locator('#run-reference-rotation').click();
 await page.waitForFunction(()=>document.querySelector('#rotation-reference-status').textContent.includes('complete'),null,{timeout:30000});
 assert.match(await page.locator('#rotation-reference-output').textContent(),/DPS/);
 await page.locator('#reset-rotation').click();assert.equal(await page.locator('#rotation-reference-config').inputValue(),'');
 assert.equal(await page.locator('.run-button').isDisabled(),true);
 assert.deepEqual(errors,[]);
 console.log('Browser smoke passed: nine class planners, both workers, build-change invalidation and public gate.');
} finally {await browser.close();}
