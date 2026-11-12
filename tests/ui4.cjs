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
// landing redesign
ok(await pg.locator('.hero-grid .hero-copy h1').count()===1,'split hero copy');
const gb=await pg.evaluate(()=>{const a=document.querySelector('.hero-copy').getBoundingClientRect(),b=document.querySelector('.hero-terminal').getBoundingClientRect();return {sameRow:Math.abs(a.top-b.top)<260&&b.left>a.left,termInView:b.top<innerHeight-100}});
ok(gb.sameRow,'terminal sits beside the copy');ok(gb.termInView,'terminal visible above the fold');
ok(await pg.locator('#pathCards .pc').count()===3,'3 exam path cards');
ok(await pg.locator('#homeStats .stats4 .stat').count()===4,'4 stats');
ok(await pg.locator('.band-d').count()>=2&&await pg.locator('.band-l').count()>=2,'light/dark bands alternate');
ok(await pg.locator('#homeCta').count()===1,'closing call to action');
const dark=await pg.evaluate(()=>{const c=getComputedStyle(document.querySelector('#homeHow')).backgroundImage+getComputedStyle(document.querySelector('#homeHow')).backgroundColor;return c});console.log('dark band bg:',dark.slice(0,80));
// scroll through: nothing stays invisible
await pg.evaluate(async()=>{for(let y=0;y<document.documentElement.scrollHeight;y+=400){scrollTo(0,y);await new Promise(r=>setTimeout(r,150))}});await pg.waitForTimeout(1500);
const hidden=await pg.evaluate(()=>[...document.querySelectorAll('#page-home .rv')].filter(e=>getComputedStyle(e).opacity<0.5).length);ok(hidden===0,'no content left invisible after scrolling ('+hidden+')');
const wide=await pg.evaluate(()=>{const w=document.querySelector('#homeStats .band-in').getBoundingClientRect();const s=document.querySelector('.stats4').getBoundingClientRect();return s.left>=w.left-1&&s.right<=w.right+1});ok(wide,'stats stay inside the content column');
await pg.evaluate(()=>scrollTo(0,0));
await pg.click('#pathCards .pc[data-t="CKS"] .pc-go');await pg.waitForTimeout(500);ok((await pg.locator('#pathRoot').innerText()).includes('CKS'),'CKS path opened from card');
const mp=await b.newPage({viewport:{width:390,height:844}});await mp.goto(BASE);await mp.waitForTimeout(1500);
ok(!(await mp.evaluate(()=>document.documentElement.scrollWidth>innerWidth+2)),'mobile home: no horizontal overflow');
await mp.screenshot({path:'/tmp/m-home.png'});
await pg.goto(BASE);await pg.waitForTimeout(800);
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
