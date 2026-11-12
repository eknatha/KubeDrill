const {chromium}=require('playwright-core');const BASE='file://'+require('path').resolve(__dirname,'..','index.html');
(async()=>{const b=await chromium.launch({executablePath:'/usr/bin/google-chrome',args:['--no-sandbox']});
const pg=await b.newPage({viewport:{width:1300,height:850}});const errs=[];pg.on('pageerror',e=>errs.push(e.message));pg.on('console',m=>m.type()==='error'&&errs.push(m.text()));
const ok=(c,m)=>console.log(c?'✔':'✘',m);
await pg.goto(BASE+'#lab/s01-pending-cpu');await pg.waitForSelector('#lrIn');await pg.waitForTimeout(600);
ok(await pg.locator('.dia-pod').count()>=2,'diagram shows pods: '+await pg.locator('.dia-pod').count());
ok(await pg.locator('.dia-pod.st-wait').count()>0,'pending pods amber');
ok(await pg.locator('.dia-node').count()>=3,'nodes drawn');
ok(await pg.locator('#lrDia').isVisible(),'diagram visible by default');
await pg.screenshot({path:'/tmp/s01-before.png'});
// fix via terminal
for(const c of ['kubectl set resources deployment/api --requests=cpu=100m -n payments','kubectl rollout status deployment/api -n payments']){await pg.fill('#lrIn',c);await pg.press('#lrIn','Enter');await pg.waitForTimeout(150);if(await pg.locator('.br-pop').count())await pg.keyboard.press('Enter');await pg.waitForTimeout(500);}
await pg.waitForTimeout(2500);
ok(await pg.locator('.dia-pod.st-ok').count()>=2,'pods turn green after fix: '+await pg.locator('.dia-pod.st-ok').count());
await pg.click('#lrCheck');await pg.waitForSelector('.lr-debrief');
ok((await pg.textContent('.lr-debrief')).includes('Root cause'),'debrief card after pass');
ok(await pg.locator('.lr-stats div').count()===4,'learn stats 4 tiles');
await pg.screenshot({path:'/tmp/s01-after.png'});
// exam mode
pg.on('dialog',d=>d.accept());
await pg.click('#lrAgain');await pg.waitForSelector('#lrMode_exam.on');
ok(await pg.locator('.lr-hint-btn').count()===0,'exam: no hint buttons');
ok(await pg.locator('.lr-sol').count()===0,'exam: no solution');
await pg.waitForTimeout(1300);ok((await pg.textContent('#lrTimer')).includes('⏳'),'exam countdown: '+await pg.textContent('#lrTimer'));
await pg.click('#lrCheck');await pg.waitForTimeout(300);
const fb=await pg.textContent('#lrFeedback');ok(/hidden in exam/.test(fb)&&!/Still failing/.test(fb),'exam fail hides details');
// text tab
await pg.click('#lrTabTxt');ok(await pg.locator('#lrState').isVisible()&&!await pg.locator('#lrDia').isVisible(),'text tab works');
await pg.click('#lrMode_learn');await pg.waitForSelector('#lrMode_learn.on');ok(await pg.locator('.lr-hint-btn').count()>0,'learn: hints back');
// mobile
await pg.setViewportSize({width:390,height:800});await pg.waitForTimeout(300);
ok(await pg.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+1),'no horizontal overflow on mobile');
console.log('errors:',errs.length,errs.slice(0,3));await b.close();})();
