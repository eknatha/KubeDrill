const {chromium}=require('playwright-core');const BASE='file://'+require('path').resolve(__dirname,'..','index.html');
(async()=>{const b=await chromium.launch({executablePath:'/usr/bin/google-chrome',args:['--no-sandbox']});
const pg=await b.newPage({viewport:{width:1300,height:850}});const errs=[];pg.on('pageerror',e=>errs.push(e.message));pg.on('console',m=>m.type()==='error'&&errs.push(m.text()));
let bad=0;const ok=(c,m)=>{console.log(c?'✔':'✘',m);if(!c)bad++};
await pg.goto(BASE);await pg.waitForTimeout(1500);
ok(await pg.locator('.nav-more').count()===1,'nav More menu present');
ok(await pg.locator('#hdOut').count()===1,'hero demo present');
await pg.waitForTimeout(6000);
const hd=await pg.locator('#hdOut').innerText();ok(/OOMKilled|Running|\$/.test(hd),'hero demo printed real simulator output');
const stats=await pg.locator('.stats, .hero-stats, #statsStrip').first().innerText().catch(()=>'');console.log('stats text:',JSON.stringify(stats.slice(0,160)));
// lessons
await pg.goto(BASE+'#learn');await pg.waitForTimeout(400);
const n=await pg.locator('.ls-idx a.row').count();ok(n>=22,'lesson index lists '+n+' lessons');
await pg.goto(BASE+'#learn/networking');await pg.waitForTimeout(400);
ok((await pg.locator('#learnRoot .section-title').innerText()).includes('Services'),'lesson page renders');
ok(await pg.locator('.wg-tree').count()===1,'decision-tree widget');
await pg.locator('#lsDo .btn-secondary[data-i="1"]').click();await pg.locator('#lsDo .btn-secondary[data-i="0"]').click().catch(()=>{});
await pg.click('#lsAll');ok((await pg.locator('#lsO3').innerText()).includes(':80'),'doit runs in simulator');
await pg.hover('#lsYaml .ln.f >> nth=0');ok((await pg.locator('#lsTip').innerText()).length>20,'anatomy tooltip');
await pg.click('#lsBug .ln[data-n="6"]');ok((await pg.locator('#lsBugTip').innerText()).includes('Found it'),'spot-the-bug');
await pg.locator('.ls-q .o button').nth(1).click();await pg.waitForTimeout(100);
await pg.goto(BASE+'#learn/rollouts');await pg.waitForTimeout(300);ok(await pg.locator('#roOut .wg-pods').count()>0,'rollout calculator');
await pg.goto(BASE+'#learn/scheduling');await pg.waitForTimeout(300);await pg.fill('#qCR','1');ok((await pg.locator('#qOut').innerText()).includes('Burstable'),'QoS checker');
await pg.goto(BASE+'#learn/exam');await pg.waitForTimeout(300);await pg.locator('.wg-run input').first().check();ok((await pg.locator('.wg-run .bar i').getAttribute('style')).includes('20'),'runbook progress');
// lab features
await pg.goto(BASE+'#lab/s03-oomkilled');await pg.waitForTimeout(800);
ok(await pg.locator('#lrBlast').count()===1,'blast radius button');
ok(errs.length===0,'no console errors '+errs.slice(0,3).join(' | '));
console.log(bad?bad+' FAILED':'ui4 OK');await b.close();process.exit(bad?1:0)})().catch(e=>{console.log('ERR',e.message);process.exit(1)});
