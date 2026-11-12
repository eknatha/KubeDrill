const {chromium}=require('playwright-core');const BASE='file://'+require('path').resolve(__dirname,'..','index.html');
(async()=>{const b=await chromium.launch({executablePath:'/usr/bin/google-chrome',args:['--no-sandbox']});
const ctx=await b.newContext({viewport:{width:1300,height:850}});const pg=await ctx.newPage();const errs=[];pg.on('pageerror',e=>errs.push(e.message));pg.on('console',m=>m.type()==='error'&&errs.push(m.text()));
pg.on('dialog',d=>d.accept());
let bad=0;const ok=(c,m)=>{if(!c)bad++;console.log(c?'✔':'✘',m)};
const T=ms=>pg.waitForTimeout(ms);
const run=async c=>{await pg.fill('#lrIn',c);await pg.press('#lrIn','Enter');await T(150);if(await pg.locator('.br-pop').count())await pg.keyboard.press('Enter');await T(300)};
// ---- predict
await pg.goto(BASE+'#lab/s34-nodeselector');await pg.waitForSelector('#lrIn');await T(500);
ok(await pg.locator('.lr-opt').count()===4,'predict: 4 options');
const opts=await pg.locator('.lr-opt').allTextContents();ok(new Set(opts).size===4,'options distinct');
await pg.locator('.lr-opt').first().click();ok(await pg.locator('.lr-pred.locked').count()===1,'prediction locks');
await pg.reload();await pg.waitForSelector('#lrIn');await T(500);ok(await pg.locator('.lr-pred.locked').count()===1,'prediction survives reload');
await pg.screenshot({path:'/tmp/predict.png'});
// ---- diagram interactions
await T(2200);
const pods=await pg.locator('.dia-pod').count();ok(pods>=2,'diagram pods '+pods);
await pg.locator('.dia-pod').first().click();await T(400);
ok((await pg.textContent('#lrOut')).includes('Name:')||(await pg.textContent('#lrOut')).includes('describe pod'),'click pod → describe in terminal');
// solve lab, debrief shows prediction result
await run('kubectl label node worker2 gpu=true');await T(3500);await pg.click('#lrCheck');await pg.waitForSelector('.lr-debrief');
ok(await pg.locator('.lr-predres').count()===1,'debrief shows prediction result: '+(await pg.textContent('.lr-predres')).slice(0,60));
// ---- docs peek
await pg.click('#lrDocsBtn');await pg.waitForSelector('#lrDocs');ok(await pg.locator('.lr-doc-cmd').count()>0,'docs: related commands '+await pg.locator('.lr-doc-cmd').count());
ok(await pg.locator('.lr-doc-link').count()>0,'docs: kubernetes.io links '+await pg.locator('.lr-doc-link').count());
await pg.fill('#lrDocsQ','taint');await T(200);ok(await pg.locator('.lr-doc-cmd').count()>0,'docs: search works');
await pg.locator('.lr-doc-cmd').first().click();ok((await pg.inputValue('#lrIn')).length>3,'docs: click inserts command');
await pg.screenshot({path:'/tmp/docs.png'});await pg.keyboard.press('Escape');
// ---- service hover highlight
await pg.goto(BASE+'#lab/s04-no-endpoints');await pg.waitForSelector('#lrIn');await T(2500);
await pg.locator('.dia-svc').first().hover();ok(await pg.evaluate(()=>document.querySelector('#lrDia').classList.contains('hl-on')),'svc hover → highlight mode');
// ---- real mode contexts
await pg.goto(BASE+'#lab/s01-pending-cpu');await pg.waitForSelector('#lrIn');
await pg.evaluate(()=>localStorage.setItem('kl.labmode','real'));
await pg.click('#lrMode_real');await T(500);
ok(await pg.locator('.lr-state').isHidden(),'real: cluster panel hidden');
ok((await pg.textContent('.lr-prompt')).startsWith('candidate@'),'real: exam prompt '+await pg.textContent('.lr-prompt'));
const need=(await pg.textContent('.lr-ctx code')).replace('kubectl config use-context ','').trim();
await run('kubectl get pods -A');const wrong=await pg.textContent('#lrOut');
await run('kubectl config use-context nope');ok((await pg.textContent('#lrOut')).includes('no context exists'),'real: bad context errors');
// act in whichever ctx we are in: first in the starting (maybe wrong) context
const start=(await pg.textContent('#lrCtxNow'));
if(start!==need){await run('kubectl set resources deployment/api --requests=cpu=100m -n payments');ok((await pg.textContent('#lrOut')).includes('not found')||(await pg.textContent('#lrOut')).includes('NotFound'),'real: wrong context has no lab objects');}
else console.log('(start ctx equals required; trap not exercised)');
await run('kubectl config use-context '+need);ok((await pg.textContent('#lrCtxNow'))===need,'real: switched to '+need);
await run('kubectl set resources deployment/api --requests=cpu=100m -n payments');await T(3500);
await pg.click('#lrCheck');await pg.waitForSelector('.lr-pass');ok(true,'real: submit scores a pass');
// ---- daily
await pg.evaluate(()=>localStorage.setItem('kl.labmode','learn'));
await pg.goto(BASE+'#labs');await T(600);
ok(await pg.locator('#dailyCard .daily').count()===1,'daily card on labs page');
const did=await pg.evaluate(()=>KL.daily.today().id);ok(!!did,'daily id '+did);
await pg.screenshot({path:'/tmp/daily.png'});
// ---- bundles
await pg.goto(BASE+'#exam');await T(500);
const nb=await pg.locator('.ex-b').count();ok(nb>=6,'bundles listed: '+nb);
await pg.locator('.ex-b').first().click();await pg.waitForSelector('.ex-bar');
ok((await pg.textContent('.ex-list')).includes('%'),'bundle shows task weights');
await pg.locator('.ex-q').first().click();await pg.waitForSelector('#lrIn');await T(400);
ok((await pg.textContent('.lr-prompt')).startsWith('candidate@'),'bundle task runs in real environment');
ok(await pg.locator('.lr-mode').count()===0,'bundle: mode switch removed');
await pg.goto(BASE+'#exam');await pg.waitForSelector('#exFinish');await pg.click('#exFinish');await pg.waitForSelector('.ex-result');
ok(await pg.locator('.ex-dr').count()>0,'result has domain breakdown');
await pg.screenshot({path:'/tmp/bundle-result.png'});
console.log('errors:',errs.length,errs.slice(0,4));console.log(bad?bad+' FAILED':'ALL OK');await b.close();})();
